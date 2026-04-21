#!/usr/bin/env node

import path from "path";
import { fileURLToPath } from "url";
import { startServer, clearRuntimeInfo } from "./server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);

function parseFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

const cmd = args[0];

if (cmd === "init") {
  const { scaffoldProject } = await import("./init.js");
  const name = args[1] ?? "my-diorama";
  const template = (args[2] as "starter" | "full-office" | "minimal") ?? "starter";
  scaffoldProject({ name, dir: path.resolve(process.cwd(), name), template });
  console.log(`\n  Created ${name}/ with template "${template}"\n`);
} else if (cmd === "mcp") {
  const mcpBin = path.resolve(__dirname, "../../mcp/src/bin.ts");
  await import(mcpBin).catch((err) => {
    console.error("Failed to start Diorama MCP server:", err);
    process.exit(1);
  });
} else if (cmd === "start" || cmd === undefined) {
  const headless = args.includes("--headless");
  const portFlag = parseFlag("--port");
  const port = portFlag ? parseInt(portFlag, 10) : undefined;
  const cleanup = () => {
    clearRuntimeInfo();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  startServer({ headless, port }).catch((err) => {
    console.error("Failed to start Diorama:", err);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${cmd}`);
  console.error("Usage: diorama [init|start|mcp] [options]");
  process.exit(1);
}
