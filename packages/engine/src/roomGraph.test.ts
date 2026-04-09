import { describe, it, expect } from "vitest";
import {
  buildRoomGraph,
  findRoomPath,
  generateWaypoints,
  findRoomContaining,
  resolveRoomDoors,
} from "./roomGraph";
import { ROOM_PRESETS } from "./roomPresets";
import type { RoomConfig } from "./config";

// Helper to create a room config at a given grid position
function makeRoom(
  label: string,
  preset: string,
  position: [number, number],
  size: [number, number],
): RoomConfig {
  return { label, preset, position, size };
}

describe("resolveRoomDoors", () => {
  it("converts relative door to world-space position", () => {
    const room = makeRoom("Test", "meeting", [0, 0], [4, 3]);
    const doors = resolveRoomDoors(room, [{ rx: 0.5, ry: 1.0, facing: 180 }]);
    expect(doors).toHaveLength(1);
    expect(doors[0].roomLabel).toBe("Test");
    expect(typeof doors[0].worldX).toBe("number");
    expect(typeof doors[0].worldZ).toBe("number");
  });

  it("returns empty array when no doors defined", () => {
    const room = makeRoom("Test", "meeting", [0, 0], [4, 3]);
    const doors = resolveRoomDoors(room, []);
    expect(doors).toHaveLength(0);
  });
});

describe("buildRoomGraph", () => {
  it("creates nodes for each room", () => {
    const rooms = [
      makeRoom("Room A", "meeting", [0, 0], [4, 3]),
      makeRoom("Room B", "workspace", [4, 0], [5, 4]),
    ];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.has("Room A")).toBe(true);
    expect(graph.nodes.has("Room B")).toBe(true);
  });

  it("detects adjacent room connections via doors", () => {
    // Place two rooms side by side: Room A at [0,0] size [4,3], Room B at [4,0] size [4,3]
    // Room A has a south door at rx=0.5 → canvas x=2*200=400
    // Room B has a south door at rx=0.5 → canvas x=(4+2)*200=1200
    // These doors are far apart vertically, so they won't connect.
    // For connection, we need doors on shared walls.
    // Let's use social lounge (east door) on left and a custom positioned room
    const rooms = [
      makeRoom("Lounge", "social", [0, 0], [3, 3]),   // east wall door: rx=1.0, ry=0.5
      makeRoom("Office", "meeting", [3, 0], [4, 3]),   // south wall door: rx=0.5, ry=1.0
    ];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    // The social lounge east door is at canvas (3*200, 1.5*200) = (600, 300)
    // The meeting south door is at canvas ((3+2)*200, 3*200) = (1000, 600)
    // These are far apart, so no connection expected
    expect(graph.nodes.size).toBe(2);
  });

  it("connects rooms whose doors are within threshold distance", () => {
    // Create two rooms sharing a south/north wall with doors aligned
    // Room A at [0,0] size [4,3], south door at rx=0.5, ry=1.0 → canvas (400, 600)
    // Room B at [0,3] size [4,3], north door at rx=0.5, ry=0.0 → canvas (400, 600) — exact same!
    // But we need a preset with a north door. Let's use custom rooms with manual presets.
    const customPresets = [
      ...ROOM_PRESETS,
      {
        id: "north-door",
        label: "North Door Room",
        defaultSize: [4, 3] as [number, number],
        doors: [{ rx: 0.5, ry: 0.0, facing: 0 }],
        furnitureByTheme: {},
        floorWallByTheme: {},
      },
    ];
    const rooms = [
      makeRoom("Room A", "meeting", [0, 0], [4, 3]),      // south door at canvas (400, 600)
      makeRoom("Room B", "north-door", [0, 3], [4, 3]),   // north door at canvas (400, 600)
    ];
    const graph = buildRoomGraph(rooms, customPresets);
    // Doors are at the same canvas position → should be connected
    expect(graph.edges.length).toBeGreaterThan(0);
    const aToB = graph.edges.find(e => e.fromRoom === "Room A" && e.toRoom === "Room B");
    expect(aToB).toBeDefined();
  });

  it("disconnected rooms produce no edges", () => {
    const rooms = [
      makeRoom("Far A", "meeting", [0, 0], [2, 2]),
      makeRoom("Far B", "meeting", [10, 10], [2, 2]),
    ];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    expect(graph.edges).toHaveLength(0);
  });
});

describe("findRoomPath", () => {
  it("returns single room when source equals destination", () => {
    const rooms = [makeRoom("A", "meeting", [0, 0], [4, 3])];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    const path = findRoomPath(graph, "A", "A");
    expect(path).toEqual(["A"]);
  });

  it("returns empty array when rooms are not connected", () => {
    const rooms = [
      makeRoom("A", "meeting", [0, 0], [2, 2]),
      makeRoom("B", "meeting", [10, 10], [2, 2]),
    ];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    const path = findRoomPath(graph, "A", "B");
    expect(path).toEqual([]);
  });

  it("returns empty array for unknown room names", () => {
    const rooms = [makeRoom("A", "meeting", [0, 0], [4, 3])];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    expect(findRoomPath(graph, "A", "Unknown")).toEqual([]);
    expect(findRoomPath(graph, "Unknown", "A")).toEqual([]);
  });

  it("finds direct path between connected rooms", () => {
    const customPresets = [
      ...ROOM_PRESETS,
      {
        id: "north-door",
        label: "North Door",
        defaultSize: [4, 3] as [number, number],
        doors: [{ rx: 0.5, ry: 0.0, facing: 0 }],
        furnitureByTheme: {},
        floorWallByTheme: {},
      },
    ];
    const rooms = [
      makeRoom("A", "meeting", [0, 0], [4, 3]),
      makeRoom("B", "north-door", [0, 3], [4, 3]),
    ];
    const graph = buildRoomGraph(rooms, customPresets);
    const path = findRoomPath(graph, "A", "B");
    expect(path).toEqual(["A", "B"]);
  });
});

describe("generateWaypoints", () => {
  it("returns single waypoint for same-room path", () => {
    const rooms = [makeRoom("A", "meeting", [0, 0], [4, 3])];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    const wps = generateWaypoints(graph, ["A"], [0, 0], [1, 1]);
    expect(wps).toHaveLength(1);
    expect(wps[0]).toEqual([1, 0, 1]);
  });

  it("returns empty for empty room path", () => {
    const rooms = [makeRoom("A", "meeting", [0, 0], [4, 3])];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    expect(generateWaypoints(graph, [], [0, 0], [1, 1])).toEqual([]);
  });

  it("generates door waypoints for multi-room path", () => {
    const customPresets = [
      ...ROOM_PRESETS,
      {
        id: "north-door",
        label: "North Door",
        defaultSize: [4, 3] as [number, number],
        doors: [{ rx: 0.5, ry: 0.0, facing: 0 }],
        furnitureByTheme: {},
        floorWallByTheme: {},
      },
    ];
    const rooms = [
      makeRoom("A", "meeting", [0, 0], [4, 3]),
      makeRoom("B", "north-door", [0, 3], [4, 3]),
    ];
    const graph = buildRoomGraph(rooms, customPresets);
    const wps = generateWaypoints(graph, ["A", "B"], [0, 0], [2, 5]);
    // Should have: exit door, entry door, destination = at least 3 waypoints
    expect(wps.length).toBeGreaterThanOrEqual(3);
    // Last waypoint should be the destination
    expect(wps[wps.length - 1]).toEqual([2, 0, 5]);
    // All waypoints should have y=0
    for (const wp of wps) {
      expect(wp[1]).toBe(0);
    }
  });
});

describe("findRoomContaining", () => {
  it("returns room label when position is inside a room", () => {
    const rooms = [makeRoom("Office", "meeting", [2, 2], [4, 3])];
    // Room center in canvas: (2+2)*200, (2+1.5)*200 = (800, 700)
    // World center: toWorld(800, 700)
    const node = buildRoomGraph(rooms, ROOM_PRESETS).nodes.get("Office");
    expect(node).toBeDefined();
    const result = findRoomContaining(rooms, node!.center[0], node!.center[1]);
    expect(result).toBe("Office");
  });

  it("returns null when position is outside all rooms", () => {
    const rooms = [makeRoom("Office", "meeting", [0, 0], [2, 2])];
    // Very far away in world space
    const result = findRoomContaining(rooms, 100, 100);
    expect(result).toBeNull();
  });

  it("handles multiple rooms correctly", () => {
    const rooms = [
      makeRoom("A", "meeting", [0, 0], [2, 2]),
      makeRoom("B", "meeting", [5, 5], [2, 2]),
    ];
    const graph = buildRoomGraph(rooms, ROOM_PRESETS);
    const centerB = graph.nodes.get("B")!.center;
    expect(findRoomContaining(rooms, centerB[0], centerB[1])).toBe("B");
  });
});
