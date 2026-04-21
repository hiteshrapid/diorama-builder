import fs from "fs";
import path from "path";
import os from "os";
import { ensureAppRunning } from "../lifecycle.js";
import { apiFetch } from "../httpClient.js";

const CONFIG_PATH = path.join(os.homedir(), ".diorama", "config.json");

export const getConfigTool = {
  name: "diorama_get_config",
  description:
    "Read the current diorama config from ~/.diorama/config.json. Optionally long-polls until the user clicks 'Save & Continue' in the builder. Use waitForSave=true after opening the wizard to block until the user has finished designing their office.",
  inputSchema: {
    type: "object",
    properties: {
      waitForSave: {
        type: "boolean",
        description:
          "If true, polls /api/setup/continue until a fresh save signal is observed (since the poll starts), then returns the saved config. Times out after waitTimeoutMs.",
      },
      waitTimeoutMs: {
        type: "number",
        description:
          "Max milliseconds to wait for save signal (default 600000 = 10 min).",
      },
    },
  },
} as const;

interface GetConfigArgs {
  waitForSave?: boolean;
  waitTimeoutMs?: number;
}

interface SetupState {
  savedAt: number | null;
}

function readLocalConfig(): unknown {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function handleGetConfig(args: GetConfigArgs) {
  const waitForSave = args.waitForSave === true;
  const timeoutMs = args.waitTimeoutMs ?? 600000;

  if (!waitForSave) {
    const config = readLocalConfig();
    if (!config) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: "No config at ~/.diorama/config.json. Run diorama_open_wizard first.",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(config, null, 2),
        },
      ],
    };
  }

  const { port } = await ensureAppRunning();
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const state = await apiFetch<SetupState>({
        port,
        path: "/api/setup/continue",
        method: "GET",
        timeoutMs: 2000,
      });
      if (typeof state.savedAt === "number" && state.savedAt >= startedAt) {
        const config = readLocalConfig();
        if (config) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(config, null, 2),
              },
            ],
          };
        }
      }
    } catch {
      // server may be starting up; keep polling
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `Timed out after ${timeoutMs}ms waiting for user to save office in the builder.`,
      },
    ],
  };
}
