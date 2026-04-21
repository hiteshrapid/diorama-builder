import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { scanOpenClawWorkspace } from "./scanner";

describe("scanOpenClawWorkspace", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "diorama-setup-"));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function writeConfig(content: unknown) {
    const dir = path.join(tmpHome, ".openclaw");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "openclaw.json"),
      JSON.stringify(content, null, 2),
    );
  }

  it("returns empty fields when ~/.openclaw is missing", () => {
    const result = scanOpenClawWorkspace(tmpHome);
    expect(result.agents).toEqual([]);
    expect(result.mcpServers).toEqual([]);
    expect(result.workspaceFiles).toEqual([]);
    expect(result.openClawConfig).toBeNull();
  });

  it("extracts agent names from config.agents object", () => {
    writeConfig({ agents: { reviewer: {}, advisor: {}, broadcaster: {} } });
    const result = scanOpenClawWorkspace(tmpHome);
    expect(result.agents.sort()).toEqual(["advisor", "broadcaster", "reviewer"]);
  });

  it("extracts MCP server names from config.mcp.servers", () => {
    writeConfig({
      mcp: { servers: { "diorama-events": { command: "node", args: [] } } },
    });
    const result = scanOpenClawWorkspace(tmpHome);
    expect(result.mcpServers).toEqual(["diorama-events"]);
  });

  it("falls back to agent directory names when config has no agents", () => {
    writeConfig({});
    const agentsDir = path.join(tmpHome, ".openclaw", "agents");
    fs.mkdirSync(path.join(agentsDir, "aegis"), { recursive: true });
    fs.mkdirSync(path.join(agentsDir, "scribe"), { recursive: true });
    const result = scanOpenClawWorkspace(tmpHome);
    expect(result.agents.sort()).toEqual(["aegis", "scribe"]);
  });

  it("lists markdown files in ~/.openclaw/workspace/", () => {
    writeConfig({});
    const wsDir = path.join(tmpHome, ".openclaw", "workspace");
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(path.join(wsDir, "DISPATCH.md"), "hi");
    fs.writeFileSync(path.join(wsDir, "AGENTS.md"), "hi");
    fs.writeFileSync(path.join(wsDir, "not-md.txt"), "hi");
    const result = scanOpenClawWorkspace(tmpHome);
    expect(result.workspaceFiles).toHaveLength(2);
    expect(result.workspaceFiles.every((f) => f.endsWith(".md"))).toBe(true);
  });

  it("returns openClawConfigPath even when file missing", () => {
    const result = scanOpenClawWorkspace(tmpHome);
    expect(result.openClawConfigPath).toBe(
      path.join(tmpHome, ".openclaw", "openclaw.json"),
    );
  });

  it("tolerates unparseable config without throwing", () => {
    const dir = path.join(tmpHome, ".openclaw");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "openclaw.json"), "not-json");
    const result = scanOpenClawWorkspace(tmpHome);
    expect(result.openClawConfig).toBeNull();
    expect(result.agents).toEqual([]);
  });
});
