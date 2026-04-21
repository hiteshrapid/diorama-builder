import { exec } from "child_process";
import { ensureAppRunning } from "../lifecycle.js";

export const openWizardTool = {
  name: "diorama_open_wizard",
  description:
    "Open the Diorama spatial editor (builder) in the default browser. Equivalent to diorama_start with route='/builder' and openBrowser=true, but intended as the primary entry point from a setup skill.",
  inputSchema: {
    type: "object",
    properties: {},
  },
} as const;

export async function handleOpenWizard() {
  const { url } = await ensureAppRunning();
  const fullUrl = `${url}/builder`;
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} ${fullUrl}`);
  return {
    content: [
      {
        type: "text" as const,
        text: `Opened builder at ${fullUrl}. Design your office, then click "Save & Continue".`,
      },
    ],
  };
}
