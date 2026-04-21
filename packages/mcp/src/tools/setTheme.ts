import { ensureAppRunning } from "../lifecycle.js";
import { apiFetch } from "../httpClient.js";

export const setThemeTool = {
  name: "diorama_set_theme",
  description:
    "Update the diorama config's theme. Built-in themes: neon-dark, warm-office, cyberpunk, minimal.",
  inputSchema: {
    type: "object",
    properties: {
      theme: {
        type: "string",
        description: "Theme id (e.g. neon-dark, warm-office, cyberpunk, minimal)",
      },
    },
    required: ["theme"],
  },
} as const;

interface SetThemeArgs {
  theme: string;
}

interface SetThemeResult {
  ok: boolean;
  error?: string;
}

export async function handleSetTheme(args: SetThemeArgs) {
  const { port } = await ensureAppRunning();
  const result = await apiFetch<SetThemeResult>({
    port,
    path: "/api/config/theme",
    method: "POST",
    body: { theme: args.theme },
  });

  if (!result.ok) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Failed to set theme: ${result.error ?? "unknown error"}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Theme set to '${args.theme}'.`,
      },
    ],
  };
}
