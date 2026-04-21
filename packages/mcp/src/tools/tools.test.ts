import { describe, it, expect } from "vitest";
import { startTool } from "./start";
import { openWizardTool } from "./openWizard";
import { getConfigTool } from "./getConfig";
import { addRoomTool } from "./addRoom";
import { setThemeTool } from "./setTheme";
import { emitEventTool } from "./emitEvent";

const allTools = [
  startTool,
  openWizardTool,
  getConfigTool,
  addRoomTool,
  setThemeTool,
  emitEventTool,
];

describe("MCP tool definitions", () => {
  it("all tools have unique names with the diorama_ prefix", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^diorama_/);
    }
  });

  it("all tools have a non-empty description", () => {
    for (const tool of allTools) {
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it("all tools have an object-type inputSchema", () => {
    for (const tool of allTools) {
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("addRoom requires preset/label/position/size", () => {
    expect(addRoomTool.inputSchema.required).toEqual([
      "preset",
      "label",
      "position",
      "size",
    ]);
  });

  it("setTheme requires theme", () => {
    expect(setThemeTool.inputSchema.required).toEqual(["theme"]);
  });

  it("emitEvent requires type/room/agent (not payload)", () => {
    expect(emitEventTool.inputSchema.required).toEqual(["type", "room", "agent"]);
  });

  it("getConfig has no required args (waitForSave is optional)", () => {
    expect(
      (getConfigTool.inputSchema as { required?: string[] }).required,
    ).toBeUndefined();
  });

  it("start accepts optional route enum", () => {
    const route = (startTool.inputSchema.properties as unknown as {
      route?: { enum?: readonly string[] };
    }).route;
    expect(route?.enum).toContain("/builder");
    expect(route?.enum).toContain("/live");
  });
});
