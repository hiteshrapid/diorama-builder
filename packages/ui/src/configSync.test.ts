import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  loadBuilderStateFromConfig,
  saveBuilderStateToConfig,
} from "./configSync";
import type { BuilderState } from "./builderStore";
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
      { type: "bullpen", position: [0, 0], size: [3, 2], label: "Floor" },
      { type: "test-lab", position: [3, 0], size: [2, 3], label: "Lab" },
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
    expect(state.rooms[0].type).toBe("bullpen");
    expect(state.rooms[0].position).toEqual([0, 0]);
    expect(state.rooms[1].type).toBe("test-lab");
  });

  it("generates unique IDs for loaded rooms", () => {
    const state = loadBuilderStateFromConfig(configPath);
    const ids = state.rooms.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("saves builder state back to config file", () => {
    const state = createBuilderState([
      { id: "r1", type: "archive", position: [0, 0], size: [4, 2], label: "Archive" },
      { id: "r2", type: "breakroom", position: [4, 0], size: [2, 2], label: "Break" },
    ]);
    saveBuilderStateToConfig(configPath, state);

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(2);
    expect(config.rooms[0].type).toBe("archive");
    expect(config.rooms[1].type).toBe("breakroom");
  });

  it("preserves non-room config fields on save", () => {
    const state = createBuilderState([
      { id: "r1", type: "bullpen", position: [0, 0], size: [3, 2], label: "Floor" },
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
    expect(config.rooms[0].type).toBe("bullpen");
    expect(config.rooms[1].type).toBe("test-lab");
  });
});
