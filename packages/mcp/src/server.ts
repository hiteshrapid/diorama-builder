import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startTool, handleStart } from "./tools/start.js";
import { openWizardTool, handleOpenWizard } from "./tools/openWizard.js";
import { getConfigTool, handleGetConfig } from "./tools/getConfig.js";
import { addRoomTool, handleAddRoom } from "./tools/addRoom.js";
import { setThemeTool, handleSetTheme } from "./tools/setTheme.js";
import { emitEventTool, handleEmitEvent } from "./tools/emitEvent.js";

/**
 * Low-level Server pattern (not the McpServer wrapper) to avoid Zod version
 * conflicts with the host process. Mirrors Claw3D's diorama-events-mcp shape.
 */
export function createServer() {
  const server = new Server(
    { name: "diorama", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      startTool,
      openWizardTool,
      getConfigTool,
      addRoomTool,
      setThemeTool,
      emitEventTool,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = (rawArgs ?? {}) as unknown;

    try {
      switch (name) {
        case startTool.name:
          return await handleStart(args as Parameters<typeof handleStart>[0]);
        case openWizardTool.name:
          return await handleOpenWizard();
        case getConfigTool.name:
          return await handleGetConfig(
            args as Parameters<typeof handleGetConfig>[0],
          );
        case addRoomTool.name:
          return await handleAddRoom(
            args as Parameters<typeof handleAddRoom>[0],
          );
        case setThemeTool.name:
          return await handleSetTheme(
            args as Parameters<typeof handleSetTheme>[0],
          );
        case emitEventTool.name:
          return await handleEmitEvent(
            args as Parameters<typeof handleEmitEvent>[0],
          );
        default:
          return {
            isError: true,
            content: [
              { type: "text" as const, text: `Unknown tool: ${name}` },
            ],
          };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[diorama-mcp] tool '${name}' failed: ${msg}\n`);
      return {
        isError: true,
        content: [
          { type: "text" as const, text: `Tool '${name}' failed: ${msg}` },
        ],
      };
    }
  });

  return server;
}
