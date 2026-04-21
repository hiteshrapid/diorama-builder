import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { registerMcpInOpenClaw } from "./mutator";

describe("registerMcpInOpenClaw", () => {
  let tmpHome: string;
  let configPath: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "diorama-mutator-"));
    const dir = path.join(tmpHome, ".openclaw");
    fs.mkdirSync(dir, { recursive: true });
    configPath = path.join(dir, "openclaw.json");
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function writeConfig(content: unknown) {
    fs.writeFileSync(configPath, JSON.stringify(content, null, 2));
  }

  function readConfig(): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }

  it("throws when openclaw.json is missing", () => {
    // beforeEach only creates the dir, not the config file
    expect(() =>
      registerMcpInOpenClaw(tmpHome, "diorama", { command: "node", args: [] }),
    ).toThrow(/OpenClaw config not found/);
  });

  it("adds mcp.servers.diorama entry when missing", () => {
    writeConfig({ version: 1 });
    const result = registerMcpInOpenClaw(tmpHome, "diorama", {
      command: "node",
      args: ["/tmp/diorama.js"],
    });
    expect(result.changed).toBe(true);
    const cfg = readConfig();
    expect((cfg.mcp as { servers: { diorama: unknown } }).servers.diorama).toEqual({
      command: "node",
      args: ["/tmp/diorama.js"],
    });
  });

  it("creates mcp.servers if mcp exists but servers is missing", () => {
    writeConfig({ mcp: {} });
    registerMcpInOpenClaw(tmpHome, "diorama", {
      command: "node",
      args: [],
    });
    const cfg = readConfig();
    expect((cfg.mcp as { servers: unknown }).servers).toBeDefined();
  });

  it("is idempotent when the entry already matches exactly", () => {
    writeConfig({
      mcp: {
        servers: {
          diorama: { command: "node", args: ["/tmp/diorama.js"] },
        },
      },
    });
    const mtimeBefore = fs.statSync(configPath).mtimeMs;
    const result = registerMcpInOpenClaw(tmpHome, "diorama", {
      command: "node",
      args: ["/tmp/diorama.js"],
    });
    expect(result.changed).toBe(false);
    expect(fs.statSync(configPath).mtimeMs).toBe(mtimeBefore);
  });

  it("overwrites the entry when args differ", () => {
    writeConfig({
      mcp: {
        servers: { diorama: { command: "node", args: ["/old.js"] } },
      },
    });
    const result = registerMcpInOpenClaw(tmpHome, "diorama", {
      command: "node",
      args: ["/new.js"],
    });
    expect(result.changed).toBe(true);
    expect(result.previous).toEqual({ command: "node", args: ["/old.js"] });
    const cfg = readConfig();
    expect(
      (cfg.mcp as { servers: { diorama: { args: string[] } } }).servers.diorama
        .args,
    ).toEqual(["/new.js"]);
  });

  it("preserves other top-level keys when rewriting", () => {
    writeConfig({
      version: 1,
      agents: { reviewer: {} },
      channels: { slack: { enabled: true } },
    });
    registerMcpInOpenClaw(tmpHome, "diorama", {
      command: "node",
      args: [],
    });
    const cfg = readConfig();
    expect(cfg.version).toBe(1);
    expect(cfg.agents).toEqual({ reviewer: {} });
    expect(cfg.channels).toEqual({ slack: { enabled: true } });
  });

  it("distinguishes entries by env map", () => {
    writeConfig({
      mcp: { servers: { diorama: { command: "node", args: [], env: { A: "1" } } } },
    });
    const result = registerMcpInOpenClaw(tmpHome, "diorama", {
      command: "node",
      args: [],
      env: { A: "2" },
    });
    expect(result.changed).toBe(true);
  });
});
