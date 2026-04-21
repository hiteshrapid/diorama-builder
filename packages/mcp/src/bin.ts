#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { createServer } from "./server.js";
import { shutdown } from "./lifecycle.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[diorama-mcp] MCP server started on stdio\n");

  const cleanup = async () => {
    try {
      await shutdown();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`[diorama-mcp] Fatal: ${err?.message ?? err}\n`);
    process.exit(1);
  });
}
