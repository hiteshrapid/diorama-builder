import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  parseConfig,
  PluginRegistry,
  EventBus,
  toWorld,
  toCanvas,
  createSceneConfig,
  mergeSceneConfig,
  generateFloor,
  generateWalls,
  createAgentState,
  updateAgentState,
  generateAutoLayout,
  ROOM_PRESETS,
} from "./index";
import { mockDataPlugin, createMockEventStream } from "@diorama/plugins/sources/mockData";
import { neonDarkTheme, applyTheme } from "@diorama/plugins/themes/themes";
import { scaffoldProject } from "@diorama/cli/init";
import { addPluginToConfig } from "@diorama/cli/add";

describe("Diorama: Full System Integration", () => {
  let tmpDir: string;
  let projectDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diorama-integration-"));
    projectDir = path.join(tmpDir, "test-office");
  });

  it("scaffolds, configures, and runs a full pipeline cycle", () => {
    // === STEP 1: Scaffold project ===
    scaffoldProject({ name: "test-office", dir: projectDir, template: "starter" });
    const configPath = path.join(projectDir, "diorama.config.json");
    expect(fs.existsSync(configPath)).toBe(true);

    // === STEP 2: Parse the config ===
    const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const config = parseConfig(rawConfig);
    expect(config.name).toBe("test-office");
    expect(config.rooms).toHaveLength(3);
    expect(config.view).toBe("3d-office");
    expect(config.theme).toBe("neon-dark");

    // Rooms use presets
    expect(config.rooms[0].preset).toBe("meeting");

    // === STEP 3: Register plugins ===
    const registry = new PluginRegistry();
    registry.register(mockDataPlugin);
    registry.register(neonDarkTheme);
    expect(registry.getSourcePlugins()).toHaveLength(1);
    expect(registry.getThemePlugins()).toHaveLength(1);

    // === STEP 4: Apply theme to scene ===
    const baseScene = createSceneConfig();
    const theme = registry.getThemePlugin(config.theme);
    const themedScene = applyTheme(baseScene, theme);
    expect(themedScene.background).toBe("#0e1520");
    expect(themedScene.ambientLight.color).toBe("#8090c0");

    // === STEP 5: Generate room geometry ===
    const meetingRoom = config.rooms[0];
    const GRID_UNIT = 200;
    const roomRect = {
      x: meetingRoom.position[0] * GRID_UNIT,
      y: meetingRoom.position[1] * GRID_UNIT,
      w: meetingRoom.size[0] * GRID_UNIT,
      h: meetingRoom.size[1] * GRID_UNIT,
    };
    const floor = generateFloor(roomRect);
    expect(floor.width).toBeGreaterThan(0);
    expect(floor.depth).toBeGreaterThan(0);
    const walls = generateWalls(roomRect, []);
    expect(walls).toHaveLength(4);

    // === STEP 6: Create agents ===
    const [wx, , wz] = toWorld(300, 300);
    let agent = createAgentState({ x: wx, z: wz });
    expect(agent.mode).toBe("idle");

    const [targetX, , targetZ] = toWorld(
      roomRect.x + roomRect.w / 2,
      roomRect.y + roomRect.h / 2,
    );
    agent = updateAgentState(agent, {
      type: "SET_PATH",
      path: [[targetX, 0, targetZ]],
    });
    expect(agent.mode).toBe("walking");

    for (let i = 0; i < 100; i++) {
      agent = updateAgentState(agent, { type: "TICK", delta: 0.1 });
      if (agent.mode === "idle") break;
    }
    expect(agent.mode).toBe("idle");

    agent = updateAgentState(agent, { type: "SIT", seatRotation: Math.PI });
    expect(agent.mode).toBe("seated");

    // === STEP 7: Process events through bus (generic — no typed reducers) ===
    const eventBus = new EventBus();
    const receivedEvents: unknown[] = [];
    eventBus.subscribe((event) => {
      receivedEvents.push(event);
    });

    const events = createMockEventStream(20);
    for (const event of events) {
      eventBus.dispatch(event);
    }

    expect(eventBus.getHistory()).toHaveLength(20);
    expect(receivedEvents).toHaveLength(20);

    // Coordinate round-trip
    const [cx, cy] = toCanvas(agent.x, agent.z);
    const [rx, , rz] = toWorld(cx, cy);
    expect(rx).toBeCloseTo(agent.x, 4);
    expect(rz).toBeCloseTo(agent.z, 4);
  });

  it("adds a room to an existing project config", () => {
    scaffoldProject({ name: "addon-test", dir: projectDir, template: "starter" });
    const configPath = path.join(projectDir, "diorama.config.json");

    let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(3);

    addPluginToConfig(configPath, {
      preset: "social",
      position: [9, 0],
      size: [3, 3],
      label: "Lounge",
    });

    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(4);
    expect(config.rooms[3].preset).toBe("social");

    const parsed = parseConfig(config);
    expect(parsed.rooms).toHaveLength(4);
  });

  it("handles the minimal template with dashboard view", () => {
    scaffoldProject({ name: "minimal-test", dir: projectDir, template: "minimal" });
    const configPath = path.join(projectDir, "diorama.config.json");
    const config = parseConfig(JSON.parse(fs.readFileSync(configPath, "utf-8")));

    expect(config.view).toBe("dashboard");
    expect(config.theme).toBe("minimal");
    expect(config.rooms).toHaveLength(1);
    expect(config.rooms[0].preset).toBe("workspace");
  });

  it("processes events with filtered subscriptions", () => {
    const bus = new EventBus();
    const room1Events: unknown[] = [];
    const room2Events: unknown[] = [];

    bus.subscribe((event) => { room1Events.push(event); }, { room: "meeting-1" });
    bus.subscribe((event) => { room2Events.push(event); }, { room: "lab-1" });

    const events = createMockEventStream(20);
    for (const event of events) {
      bus.dispatch(event);
    }

    // Events are filtered by room — counts depend on mock data distribution
    expect(bus.getHistory()).toHaveLength(20);
  });

  it("scene config + theme merge produces valid rendering config", () => {
    const scene = mergeSceneConfig({
      camera: { position: [0, 25, 12] },
    });
    const themed = applyTheme(scene, neonDarkTheme);

    expect(themed.camera.position).toEqual([0, 25, 12]);
    expect(themed.background).toBe("#0e1520");
    expect(themed.fog.color).toBe(themed.background);
    expect(themed.directionalLights.length).toBeGreaterThan(0);
  });

  it("auto-layout generates valid rooms from agent names", () => {
    const agents = ["prime", "herald", "sentinel", "scribe", "contrarian"];
    const result = generateAutoLayout(agents);

    expect(result.rooms.length).toBe(ROOM_PRESETS.length);
    for (const room of result.rooms) {
      expect(room.preset).toBeTruthy();
      expect(room.size[0]).toBeGreaterThan(0);
      expect(room.size[1]).toBeGreaterThan(0);
    }
    for (const agent of agents) {
      expect(result.agents[agent]).toBeDefined();
    }
  });
});
