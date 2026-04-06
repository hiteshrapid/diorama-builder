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
} from "./index";
import { councilChamberPlugin, createCouncilState } from "@diorama/plugins/rooms/councilChamber";
import { testLabPlugin, createTestLabState } from "@diorama/plugins/rooms/testLab";
import { mockDataPlugin, createMockEventStream } from "@diorama/plugins/sources/mockData";
import { neonDarkTheme, applyTheme } from "@diorama/plugins/themes/themes";
import { scaffoldProject } from "@diorama/cli/init";
import { addPluginToConfig } from "@diorama/cli/add";

describe("Diorama: Full System Integration", () => {
  /**
   * This test simulates the complete user journey:
   * 1. Scaffold a project
   * 2. Parse the config
   * 3. Register plugins
   * 4. Set up scene + theme
   * 5. Generate room geometry
   * 6. Create agents
   * 7. Process events through the event bus + room reducers
   * 8. Verify final state
   */

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

    // === STEP 3: Register plugins ===
    const registry = new PluginRegistry();
    registry.register(councilChamberPlugin);
    registry.register(testLabPlugin);
    registry.register(mockDataPlugin);
    registry.register(neonDarkTheme);

    // Verify all plugins registered
    expect(registry.getRoomPlugins()).toHaveLength(2);
    expect(registry.getSourcePlugins()).toHaveLength(1);
    expect(registry.getThemePlugins()).toHaveLength(1);

    // === STEP 4: Apply theme to scene ===
    const baseScene = createSceneConfig();
    const theme = registry.getThemePlugin(config.theme);
    const themedScene = applyTheme(baseScene, theme);
    expect(themedScene.background).toBe("#0e1520");
    expect(themedScene.ambientLight.color).toBe("#8090c0");

    // === STEP 5: Generate room geometry ===
    const councilRoom = config.rooms.find((r) => r.type === "council-chamber")!;
    // Convert grid position to canvas coords (grid unit = 200px)
    const GRID_UNIT = 200;
    const roomRect = {
      x: councilRoom.position[0] * GRID_UNIT,
      y: councilRoom.position[1] * GRID_UNIT,
      w: councilRoom.size[0] * GRID_UNIT,
      h: councilRoom.size[1] * GRID_UNIT,
    };
    const floor = generateFloor(roomRect);
    expect(floor.width).toBeGreaterThan(0);
    expect(floor.depth).toBeGreaterThan(0);
    const walls = generateWalls(roomRect, []);
    expect(walls).toHaveLength(4);

    // === STEP 6: Create agents ===
    const [wx, , wz] = toWorld(300, 300);
    let aegisAgent = createAgentState({ x: wx, z: wz });
    expect(aegisAgent.mode).toBe("idle");

    // Walk agent to council chamber
    const [targetX, , targetZ] = toWorld(
      roomRect.x + roomRect.w / 2,
      roomRect.y + roomRect.h / 2
    );
    aegisAgent = updateAgentState(aegisAgent, {
      type: "SET_PATH",
      path: [[targetX, 0, targetZ]],
    });
    expect(aegisAgent.mode).toBe("walking");

    // Simulate ticks until agent arrives
    for (let i = 0; i < 100; i++) {
      aegisAgent = updateAgentState(aegisAgent, { type: "TICK", delta: 0.1 });
      if (aegisAgent.mode === "idle") break;
    }
    expect(aegisAgent.mode).toBe("idle");

    // Seat the agent
    aegisAgent = updateAgentState(aegisAgent, { type: "SIT", seatRotation: Math.PI });
    expect(aegisAgent.mode).toBe("seated");

    // === STEP 7: Process events through bus + reducers ===
    const eventBus = new EventBus();
    let councilState = createCouncilState();
    let labState = createTestLabState();

    // Subscribe room reducers to event bus
    eventBus.subscribe((event) => {
      councilState = councilChamberPlugin.reducer(councilState, event) as typeof councilState;
      labState = testLabPlugin.reducer(labState, event) as typeof labState;
    });

    // Generate and dispatch a full pipeline of mock events
    const events = createMockEventStream(20);
    for (const event of events) {
      eventBus.dispatch(event);
    }

    // === STEP 8: Verify final state ===
    // Council should have processed a full session
    expect(councilState.sessionActive).toBe(false); // session completed
    expect(councilState.scenarioDocReady).toBe(true); // doc generated
    expect(councilState.completedAdvisors.size).toBe(3); // 3 advisors completed

    // Test lab should show passing results
    expect(labState.executionActive).toBe(false); // execution completed
    expect(labState.browserStatus).toBe("passed"); // all tests passed
    expect(labState.pyramid.unit.passed).toBe(2);
    expect(labState.pyramid.integration.passed).toBe(1);
    expect(labState.pyramid.e2e.passed).toBe(1);

    // Event bus should have full history
    expect(eventBus.getHistory()).toHaveLength(20);

    // Coordinate round-trip still works
    const [cx, cy] = toCanvas(aegisAgent.x, aegisAgent.z);
    const [rx, , rz] = toWorld(cx, cy);
    expect(rx).toBeCloseTo(aegisAgent.x, 4);
    expect(rz).toBeCloseTo(aegisAgent.z, 4);
  });

  it("adds a plugin to an existing project config", () => {
    scaffoldProject({ name: "addon-test", dir: projectDir, template: "starter" });
    const configPath = path.join(projectDir, "diorama.config.json");

    // Project starts with 3 rooms
    let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(3);

    // Add a new room via CLI
    addPluginToConfig(configPath, {
      type: "archive",
      position: [5, 0],
      size: [3, 2],
      label: "Knowledge Garden",
    });

    // Now has 4 rooms
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.rooms).toHaveLength(4);
    expect(config.rooms[3].type).toBe("archive");

    // Config still parses correctly
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
    expect(config.rooms[0].type).toBe("bullpen");
  });

  it("processes events with filtered subscriptions", () => {
    const bus = new EventBus();
    let councilState = createCouncilState();
    let labState = createTestLabState();

    // Council only listens to council events
    bus.subscribe(
      (event) => {
        councilState = councilChamberPlugin.reducer(councilState, event) as typeof councilState;
      },
      { room: "council-chamber" }
    );

    // Lab only listens to test-lab events
    bus.subscribe(
      (event) => {
        labState = testLabPlugin.reducer(labState, event) as typeof labState;
      },
      { room: "test-lab" }
    );

    const events = createMockEventStream(20);
    for (const event of events) {
      bus.dispatch(event);
    }

    // Council processed only its events
    expect(councilState.scenarioDocReady).toBe(true);
    // Lab processed only its events
    expect(labState.browserStatus).toBe("passed");
  });

  it("scene config + theme merge produces valid rendering config", () => {
    const scene = mergeSceneConfig({
      camera: { position: [0, 25, 12] },
    });
    const themed = applyTheme(scene, neonDarkTheme);

    // Camera was customized
    expect(themed.camera.position).toEqual([0, 25, 12]);
    // Theme was applied
    expect(themed.background).toBe("#0e1520");
    // Fog matches background
    expect(themed.fog.color).toBe(themed.background);
    // Lights are present
    expect(themed.directionalLights.length).toBeGreaterThan(0);
  });
});
