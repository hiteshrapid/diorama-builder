import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { addPluginToConfig } from "./add";

describe("addPluginToConfig", () => {
  let tmpDir: string;
  let configPath: string;

  const baseConfig = {
    name: "test",
    gateway: { url: "ws://localhost:4040" },
    view: "3d-office",
    theme: "neon-dark",
    rooms: [{ preset: "workspace", position: [0, 0], size: [3, 2], label: "Floor" }],
    agents: {},
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diorama-add-"));
    configPath = path.join(tmpDir, "diorama.config.json");
    fs.writeFileSync(configPath, JSON.stringify(baseConfig, null, 2));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("adds a new room to the config", () => {
    addPluginToConfig(configPath, {
      preset: "social",
      position: [3, 0],
      size: [2, 2],
      label: "Lounge",
    });
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(2);
    expect(config.rooms[1].preset).toBe("social");
  });

  it("preserves existing rooms when adding", () => {
    addPluginToConfig(configPath, {
      preset: "lab",
      position: [3, 0],
      size: [4, 4],
      label: "Lab",
    });
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms[0].preset).toBe("workspace");
    expect(config.rooms[1].preset).toBe("lab");
  });

  it("preserves all other config fields", () => {
    addPluginToConfig(configPath, {
      preset: "private",
      position: [0, 2],
      size: [2, 2],
      label: "Private",
    });
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.name).toBe("test");
    expect(config.gateway.url).toBe("ws://localhost:4040");
    expect(config.theme).toBe("neon-dark");
  });

  it("throws if config file does not exist", () => {
    const badPath = path.join(tmpDir, "nonexistent.json");
    expect(() =>
      addPluginToConfig(badPath, {
        preset: "lab",
        position: [0, 0],
        size: [2, 2],
        label: "Lab",
      })
    ).toThrow();
  });
});
