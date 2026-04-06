import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  loadBuilderStateFromConfig,
  saveBuilderStateToConfig,
} from "./configSync";
import { createBuilderState } from "./builderStore";

describe("configSync", () => {
  let tmpDir: string;
  let configPath: string;

  const sampleConfig = {
    name: "test-office",
    gateway: { url: "ws://localhost:4040" },
    view: "3d-office",
    theme: "neon-dark",
    rooms: [
      { preset: "workspace", position: [0, 0], size: [5, 4], label: "Floor" },
      { preset: "lab", position: [5, 0], size: [4, 4], label: "Lab" },
    ],
    agents: { "aegis-prime": { desk: "desk-1", color: "#6366f1" } },
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diorama-sync-"));
    configPath = path.join(tmpDir, "diorama.config.json");
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads rooms from config into builder state", () => {
    const state = loadBuilderStateFromConfig(configPath);
    expect(state.rooms).toHaveLength(2);
    expect(state.rooms[0].preset).toBe("workspace");
    expect(state.rooms[0].position).toEqual([0, 0]);
    expect(state.rooms[1].preset).toBe("lab");
  });

  it("generates unique IDs for loaded rooms", () => {
    const state = loadBuilderStateFromConfig(configPath);
    const ids = state.rooms.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("saves builder state back to config file", () => {
    const state = createBuilderState([
      { id: "r1", preset: "meeting", position: [0, 0], size: [4, 3], label: "Meeting" },
      { id: "r2", preset: "social", position: [4, 0], size: [3, 3], label: "Lounge" },
    ]);
    saveBuilderStateToConfig(configPath, state);

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(2);
    expect(config.rooms[0].preset).toBe("meeting");
    expect(config.rooms[1].preset).toBe("social");
  });

  it("preserves non-room config fields on save", () => {
    const state = createBuilderState([
      { id: "r1", preset: "workspace", position: [0, 0], size: [5, 4], label: "Floor" },
    ]);
    saveBuilderStateToConfig(configPath, state);

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.name).toBe("test-office");
    expect(config.gateway.url).toBe("ws://localhost:4040");
    expect(config.theme).toBe("neon-dark");
    expect(config.agents["aegis-prime"].desk).toBe("desk-1");
  });

  it("round-trips: load then save produces equivalent config", () => {
    const loaded = loadBuilderStateFromConfig(configPath);
    saveBuilderStateToConfig(configPath, loaded);
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(2);
    expect(config.rooms[0].preset).toBe("workspace");
    expect(config.rooms[1].preset).toBe("lab");
  });
});
