import { exec } from "child_process";
import { ensureAppRunning } from "../lifecycle.js";

export const startTool = {
  name: "diorama_start",
  description:
    "Ensure the Diorama app server is running and open a browser window to the builder or live view. Reuses an existing instance if one is live on the saved port; otherwise spawns one in-process. Returns the port and URL.",
  inputSchema: {
    type: "object",
    properties: {
      route: {
        type: "string",
        enum: ["/builder", "/live", "/"],
        description:
          "Which route to open. '/builder' starts the spatial editor, '/live' shows the live 3D view, '/' opens the wizard landing. Defaults to '/builder'.",
      },
      openBrowser: {
        type: "boolean",
        description:
          "If true (default), open the system browser to the route after the server starts.",
      },
    },
  },
} as const;

interface StartArgs {
  route?: string;
  openBrowser?: boolean;
}

export async function handleStart(args: StartArgs) {
  const route = args.route ?? "/builder";
  const openBrowser = args.openBrowser ?? true;

  const { port, url, owned } = await ensureAppRunning();
  const fullUrl = `${url}${route}`;

  if (openBrowser) {
    const cmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    exec(`${cmd} ${fullUrl}`);
  }

  const status = owned ? "started (owned by this MCP)" : "reused existing";
  return {
    content: [
      {
        type: "text" as const,
        text: `Diorama ${status} at ${url}. Opened ${fullUrl} in browser: ${openBrowser}.`,
      },
    ],
  };
}
