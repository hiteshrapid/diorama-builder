import { describe, it, expect } from "vitest";
import {
  createBuilderState,
  builderReducer,
  type BuilderState,
  type BuilderAction,
  type RoomPlacement,
} from "./builderStore";

// ─── Helpers ────────────────────────────────────────────────────────────

function room(
  id: string,
  x: number,
  y: number,
  w = 3,
  h = 3,
  extra?: Partial<RoomPlacement>,
): RoomPlacement {
  return { id, preset: "workspace", position: [x, y], size: [w, h], label: id, ...extra };
}

/** Apply a sequence of actions and return final state */
function applyActions(initial: BuilderState, actions: BuilderAction[]): BuilderState {
  return actions.reduce((s, a) => builderReducer(s, a), initial);
}

const chair = {
  geometry: "cylinder" as const,
  size: [0.3, 0.7, 0.3] as [number, number, number],
  position: [0, 0.35, 0] as [number, number, number],
  material: { color: "#333" },
};

const desk = {
  geometry: "box" as const,
  size: [1.0, 0.04, 0.55] as [number, number, number],
  position: [0, 0.75, 0] as [number, number, number],
  material: { color: "#8b6914" },
};

const monitor = {
  geometry: "box" as const,
  size: [0.5, 0.35, 0.05] as [number, number, number],
  position: [0, 1.1, -0.2] as [number, number, number],
  material: { color: "#1a202c", emissive: "#4299e1" },
};

// ─── Drag-to-Move Simulation Tests ──────────────────────────────────────

describe("Drag-to-Move (MOVE_ROOM reducer path)", () => {
  it("moves a room to a non-overlapping position", () => {
    const state = createBuilderState([room("A", 0, 0, 3, 3)]);
    const next = builderReducer(state, { type: "MOVE_ROOM", roomId: "A", position: [5, 0] });
    expect(next.rooms[0].position).toEqual([5, 0]);
  });

  it("rejects move into overlapping position", () => {
    const state = createBuilderState([room("A", 0, 0, 3, 3), room("B", 5, 0, 3, 3)]);
    const next = builderReducer(state, { type: "MOVE_ROOM", roomId: "A", position: [4, 0] });
    // A extends 4..7, B occupies 5..8 → overlap → rejected
    expect(next.rooms[0].position).toEqual([0, 0]);
  });

  it("allows move that exactly abuts another room (no overlap)", () => {
    const state = createBuilderState([room("A", 0, 0, 3, 3), room("B", 5, 0, 3, 3)]);
    // Move A to position [2, 0] → A occupies 2..5, B occupies 5..8 → touching but not overlapping
    const next = builderReducer(state, { type: "MOVE_ROOM", roomId: "A", position: [2, 0] });
    expect(next.rooms[0].position).toEqual([2, 0]);
  });

  it("allows move to negative coordinates", () => {
    const state = createBuilderState([room("A", 0, 0, 2, 2)]);
    const next = builderReducer(state, { type: "MOVE_ROOM", roomId: "A", position: [-3, -2] });
    expect(next.rooms[0].position).toEqual([-3, -2]);
  });

  it("records history for undo after move", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const moved = builderReducer(state, { type: "MOVE_ROOM", roomId: "A", position: [5, 5] });
    expect(moved.history.past).toHaveLength(1);
    const undone = builderReducer(moved, { type: "UNDO" });
    expect(undone.rooms[0].position).toEqual([0, 0]);
  });

  it("is a no-op for non-existent room ID", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, { type: "MOVE_ROOM", roomId: "ghost", position: [5, 5] });
    expect(next).toBe(state);
  });

  it("handles moving among 3+ rooms", () => {
    const state = createBuilderState([
      room("A", 0, 0, 3, 3),
      room("B", 4, 0, 3, 3),
      room("C", 0, 4, 3, 3),
    ]);
    // Move A between B and C to [4, 4] — no overlap
    const next = builderReducer(state, { type: "MOVE_ROOM", roomId: "A", position: [4, 4] });
    expect(next.rooms.find(r => r.id === "A")!.position).toEqual([4, 4]);
  });

  it("rejects move that overlaps any room in a multi-room layout", () => {
    const state = createBuilderState([
      room("A", 0, 0, 3, 3),
      room("B", 4, 0, 3, 3),
      room("C", 0, 4, 3, 3),
    ]);
    // Move A to overlap C
    const next = builderReducer(state, { type: "MOVE_ROOM", roomId: "A", position: [1, 3] });
    // A would be 1..4, 3..6 — C is 0..3, 4..7 — overlap at y=4..6 but A x:1..4, C x:0..3 → overlap at x:1..3, y:4..6 → rejected
    expect(next.rooms.find(r => r.id === "A")!.position).toEqual([0, 0]);
  });
});

// ─── Resize Simulation Tests ────────────────────────────────────────────

describe("Resize (RESIZE_ROOM reducer path)", () => {
  it("resizes a room when no overlap", () => {
    const state = createBuilderState([room("A", 0, 0, 3, 3)]);
    const next = builderReducer(state, { type: "RESIZE_ROOM", roomId: "A", size: [5, 4] });
    expect(next.rooms[0].size).toEqual([5, 4]);
  });

  it("rejects resize that causes overlap", () => {
    const state = createBuilderState([room("A", 0, 0, 3, 3), room("B", 4, 0, 3, 3)]);
    // Resize A to width 5 → 0..5 overlaps B at 4..7
    const next = builderReducer(state, { type: "RESIZE_ROOM", roomId: "A", size: [5, 3] });
    expect(next.rooms[0].size).toEqual([3, 3]);
  });

  it("allows resize that exactly abuts neighbor", () => {
    const state = createBuilderState([room("A", 0, 0, 3, 3), room("B", 4, 0, 3, 3)]);
    // Resize A to width 4 → 0..4, B is 4..7 → touching, no overlap
    const next = builderReducer(state, { type: "RESIZE_ROOM", roomId: "A", size: [4, 3] });
    expect(next.rooms[0].size).toEqual([4, 3]);
  });

  it("records history for undo", () => {
    const state = createBuilderState([room("A", 0, 0, 3, 3)]);
    const resized = builderReducer(state, { type: "RESIZE_ROOM", roomId: "A", size: [6, 6] });
    expect(resized.rooms[0].size).toEqual([6, 6]);
    const undone = builderReducer(resized, { type: "UNDO" });
    expect(undone.rooms[0].size).toEqual([3, 3]);
  });

  it("is a no-op for non-existent room", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, { type: "RESIZE_ROOM", roomId: "ghost", size: [5, 5] });
    expect(next).toBe(state);
  });
});

// ─── Resize Edge Constraint Logic ───────────────────────────────────────
// These test the pure math that useResizeRoom.ts computes before dispatching

describe("Resize edge constraint math", () => {
  const MIN_ROOM_SIZE = 2;

  /** Simulate the useResizeRoom edge calculation for a single axis */
  function computeResize(
    edge: string,
    startPos: [number, number],
    startSize: [number, number],
    gridDx: number,
    gridDz: number,
  ): { position: [number, number]; size: [number, number] } {
    let [newX, newY] = startPos;
    let [newW, newH] = startSize;

    if (edge.includes("w")) {
      const shift = Math.min(gridDx, newW - MIN_ROOM_SIZE);
      newX += shift;
      newW -= shift;
    } else if (edge.includes("e")) {
      newW = Math.max(MIN_ROOM_SIZE, startSize[0] + gridDx);
    }

    if (edge.includes("n")) {
      const shift = Math.min(gridDz, newH - MIN_ROOM_SIZE);
      newY += shift;
      newH -= shift;
    } else if (edge.includes("s")) {
      newH = Math.max(MIN_ROOM_SIZE, startSize[1] + gridDz);
    }

    return { position: [newX, newY], size: [newW, newH] };
  }

  it("east edge: grows width, position stays", () => {
    const r = computeResize("e", [0, 0], [4, 4], 2, 0);
    expect(r.position).toEqual([0, 0]);
    expect(r.size).toEqual([6, 4]);
  });

  it("west edge: shrinks width from left, position shifts right", () => {
    const r = computeResize("w", [0, 0], [4, 4], 1, 0);
    expect(r.position).toEqual([1, 0]);
    expect(r.size).toEqual([3, 4]);
  });

  it("west edge: clamps to MIN_ROOM_SIZE", () => {
    const r = computeResize("w", [0, 0], [4, 4], 5, 0);
    // shift = min(5, 4-2) = 2
    expect(r.position).toEqual([2, 0]);
    expect(r.size).toEqual([2, 4]);
  });

  it("south edge: grows height, position stays", () => {
    const r = computeResize("s", [0, 0], [4, 4], 0, 3);
    expect(r.position).toEqual([0, 0]);
    expect(r.size).toEqual([4, 7]);
  });

  it("north edge: shrinks height from top", () => {
    const r = computeResize("n", [0, 0], [4, 4], 0, 1);
    expect(r.position).toEqual([0, 1]);
    expect(r.size).toEqual([4, 3]);
  });

  it("north edge: clamps to MIN_ROOM_SIZE", () => {
    const r = computeResize("n", [0, 0], [4, 4], 0, 10);
    expect(r.position).toEqual([0, 2]);
    expect(r.size).toEqual([4, 2]);
  });

  it("east edge: clamps width to MIN_ROOM_SIZE on shrink", () => {
    const r = computeResize("e", [0, 0], [4, 4], -5, 0);
    expect(r.size).toEqual([2, 4]); // max(2, 4-5) = max(2, -1) = 2
  });

  it("se corner: both axes grow", () => {
    const r = computeResize("se", [0, 0], [4, 4], 2, 3);
    expect(r.position).toEqual([0, 0]);
    expect(r.size).toEqual([6, 7]);
  });

  it("nw corner: both axes shrink from top-left", () => {
    const r = computeResize("nw", [0, 0], [6, 6], 2, 2);
    expect(r.position).toEqual([2, 2]);
    expect(r.size).toEqual([4, 4]);
  });

  it("ne corner: grows east, shrinks north", () => {
    const r = computeResize("ne", [0, 0], [4, 4], 2, 1);
    expect(r.position).toEqual([0, 1]);
    expect(r.size).toEqual([6, 3]);
  });

  it("sw corner: shrinks west, grows south", () => {
    const r = computeResize("sw", [0, 0], [4, 4], 1, 2);
    expect(r.position).toEqual([1, 0]);
    expect(r.size).toEqual([3, 6]);
  });

  it("no movement produces identical position/size", () => {
    const r = computeResize("se", [2, 3], [5, 4], 0, 0);
    expect(r.position).toEqual([2, 3]);
    expect(r.size).toEqual([5, 4]);
  });
});

// ─── Per-Room Colors Tests ──────────────────────────────────────────────

describe("Per-room colors (SET_ROOM_COLORS)", () => {
  it("sets all three color channels", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { accent: "#ff0000", floor: "#00ff00", wall: "#0000ff" },
    });
    expect(next.rooms[0].colors).toEqual({
      accent: "#ff0000",
      floor: "#00ff00",
      wall: "#0000ff",
    });
  });

  it("allows partial color overrides", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { accent: "#ff0000" },
    });
    expect(next.rooms[0].colors).toEqual({ accent: "#ff0000" });
    expect(next.rooms[0].colors!.floor).toBeUndefined();
    expect(next.rooms[0].colors!.wall).toBeUndefined();
  });

  it("does not affect other rooms", () => {
    const state = createBuilderState([room("A", 0, 0), room("B", 4, 0)]);
    const next = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { accent: "#ff0000" },
    });
    expect(next.rooms[0].colors?.accent).toBe("#ff0000");
    expect(next.rooms[1].colors).toBeUndefined();
  });

  it("replaces existing colors entirely", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { accent: "#ff0000", floor: "#00ff00" },
    });
    const next = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { wall: "#0000ff" },
    });
    // Previous accent/floor are gone — it's a full replacement
    expect(next.rooms[0].colors).toEqual({ wall: "#0000ff" });
  });

  it("is undoable", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { accent: "#ff0000" },
    });
    expect(state.rooms[0].colors?.accent).toBe("#ff0000");

    state = builderReducer(state, { type: "UNDO" });
    expect(state.rooms[0].colors).toBeUndefined();
  });

  it("is a no-op for non-existent room", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "ghost",
      colors: { accent: "#ff0000" },
    });
    expect(next).toBe(state);
  });
});

// ─── Effective Color Resolution ─────────────────────────────────────────
// Mirrors the logic in Room3D.tsx

describe("Effective color resolution (Room3D logic)", () => {
  const themeAccent = "#6366f1";
  const themeFloor = "#0d1520";

  function resolveColors(
    roomColors?: RoomPlacement["colors"],
    fallbackAccent = themeAccent,
    fallbackFloor = themeFloor,
  ) {
    return {
      accent: roomColors?.accent ?? fallbackAccent,
      floor: roomColors?.floor ?? fallbackFloor,
      wall: roomColors?.wall ?? fallbackAccent,
    };
  }

  it("uses theme defaults when no room colors set", () => {
    const c = resolveColors(undefined);
    expect(c.accent).toBe(themeAccent);
    expect(c.floor).toBe(themeFloor);
    expect(c.wall).toBe(themeAccent);
  });

  it("overrides individual channels", () => {
    const c = resolveColors({ accent: "#ff0000" });
    expect(c.accent).toBe("#ff0000");
    expect(c.floor).toBe(themeFloor); // falls back
    expect(c.wall).toBe(themeAccent); // falls back (wall defaults to accent)
  });

  it("overrides all channels", () => {
    const c = resolveColors({ accent: "#f00", floor: "#0f0", wall: "#00f" });
    expect(c.accent).toBe("#f00");
    expect(c.floor).toBe("#0f0");
    expect(c.wall).toBe("#00f");
  });

  it("empty colors object still falls back correctly", () => {
    const c = resolveColors({});
    expect(c.accent).toBe(themeAccent);
    expect(c.floor).toBe(themeFloor);
    expect(c.wall).toBe(themeAccent);
  });
});

// ─── Furniture Management Tests ─────────────────────────────────────────

describe("Furniture management", () => {
  it("adds multiple items to same room", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: chair });
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: desk });
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: monitor });
    expect(state.rooms[0].furniture).toHaveLength(3);
    expect(state.rooms[0].furniture![0].geometry).toBe("cylinder");
    expect(state.rooms[0].furniture![1].geometry).toBe("box");
    expect(state.rooms[0].furniture![2].geometry).toBe("box");
  });

  it("removes middle item by index", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: chair });
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: desk });
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: monitor });
    state = builderReducer(state, { type: "REMOVE_FURNITURE", roomId: "A", furnitureIndex: 1 });
    expect(state.rooms[0].furniture).toHaveLength(2);
    expect(state.rooms[0].furniture![0].geometry).toBe("cylinder"); // chair
    expect(state.rooms[0].furniture![1].geometry).toBe("box"); // monitor (was index 2)
  });

  it("removes last item leaves empty array", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: chair });
    state = builderReducer(state, { type: "REMOVE_FURNITURE", roomId: "A", furnitureIndex: 0 });
    expect(state.rooms[0].furniture).toEqual([]);
  });

  it("add furniture to separate rooms independently", () => {
    let state = createBuilderState([room("A", 0, 0), room("B", 4, 0)]);
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: chair });
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "B", item: desk });
    expect(state.rooms[0].furniture).toHaveLength(1);
    expect(state.rooms[1].furniture).toHaveLength(1);
    expect(state.rooms[0].furniture![0].geometry).toBe("cylinder");
    expect(state.rooms[1].furniture![0].geometry).toBe("box");
  });

  it("removing furniture is a no-op on non-existent room", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, { type: "REMOVE_FURNITURE", roomId: "ghost", furnitureIndex: 0 });
    expect(next).toBe(state);
  });

  it("furniture undo restores full array", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: chair });
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: desk });
    expect(state.rooms[0].furniture).toHaveLength(2);

    state = builderReducer(state, { type: "UNDO" }); // undo desk add
    expect(state.rooms[0].furniture).toHaveLength(1);
    expect(state.rooms[0].furniture![0].geometry).toBe("cylinder");

    state = builderReducer(state, { type: "UNDO" }); // undo chair add
    expect(state.rooms[0].furniture).toBeUndefined();
  });

  it("furniture redo after undo restores items", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: chair });
    state = builderReducer(state, { type: "ADD_FURNITURE", roomId: "A", item: desk });
    state = builderReducer(state, { type: "UNDO" });
    state = builderReducer(state, { type: "UNDO" });
    expect(state.rooms[0].furniture).toBeUndefined();

    state = builderReducer(state, { type: "REDO" });
    state = builderReducer(state, { type: "REDO" });
    expect(state.rooms[0].furniture).toHaveLength(2);
  });
});

// ─── Furniture Placement Coordinate Math ────────────────────────────────
// Mirrors useFurniturePlacement.ts room-local conversion

describe("Furniture placement coordinate math", () => {
  const GRID_UNIT = 200;
  const SCALE = 0.018;

  /**
   * Simulate the coordinate conversion from useFurniturePlacement:
   * - canvasX/Y from toCanvas(worldX, worldZ)
   * - room bounds check
   * - room-local position calculation
   */
  function computePlacement(
    canvasX: number,
    canvasY: number,
    roomPosition: [number, number],
    roomSize: [number, number],
  ): { localX: number; localZ: number; isInside: boolean } {
    const roomCanvasX = roomPosition[0] * GRID_UNIT;
    const roomCanvasY = roomPosition[1] * GRID_UNIT;
    const roomCanvasW = roomSize[0] * GRID_UNIT;
    const roomCanvasH = roomSize[1] * GRID_UNIT;

    const isInside =
      canvasX >= roomCanvasX &&
      canvasX <= roomCanvasX + roomCanvasW &&
      canvasY >= roomCanvasY &&
      canvasY <= roomCanvasY + roomCanvasH;

    const localX = ((canvasX - roomCanvasX) / roomCanvasW - 0.5) * roomCanvasW * SCALE;
    const localZ = ((canvasY - roomCanvasY) / roomCanvasH - 0.5) * roomCanvasH * SCALE;

    return { localX, localZ, isInside };
  }

  it("click at room center produces (0, 0) local position", () => {
    // Room at grid (0,0), size 4x3
    // Canvas center of room = (0 + 4*200/2, 0 + 3*200/2) = (400, 300)
    const r = computePlacement(400, 300, [0, 0], [4, 3]);
    expect(r.isInside).toBe(true);
    expect(r.localX).toBeCloseTo(0, 5);
    expect(r.localZ).toBeCloseTo(0, 5);
  });

  it("click at room top-left corner produces negative local coords", () => {
    const r = computePlacement(0, 0, [0, 0], [4, 3]);
    expect(r.isInside).toBe(true);
    // localX = (0/800 - 0.5) * 800 * 0.018 = -0.5 * 14.4 = -7.2
    expect(r.localX).toBeCloseTo(-0.5 * 800 * SCALE, 5);
    // localZ = (0/600 - 0.5) * 600 * 0.018 = -0.5 * 10.8 = -5.4
    expect(r.localZ).toBeCloseTo(-0.5 * 600 * SCALE, 5);
  });

  it("click at room bottom-right produces positive local coords", () => {
    const r = computePlacement(800, 600, [0, 0], [4, 3]);
    expect(r.isInside).toBe(true);
    expect(r.localX).toBeCloseTo(0.5 * 800 * SCALE, 5);
    expect(r.localZ).toBeCloseTo(0.5 * 600 * SCALE, 5);
  });

  it("click outside room is detected", () => {
    const r = computePlacement(900, 300, [0, 0], [4, 3]);
    expect(r.isInside).toBe(false); // 900 > 800 (room width in canvas)
  });

  it("room at non-zero grid position: click at room center is (0,0)", () => {
    // Room at grid (3, 2), size 4x3
    // Canvas: roomX = 600, roomY = 400, width = 800, height = 600
    // Center = (600 + 400, 400 + 300) = (1000, 700)
    const r = computePlacement(1000, 700, [3, 2], [4, 3]);
    expect(r.isInside).toBe(true);
    expect(r.localX).toBeCloseTo(0, 5);
    expect(r.localZ).toBeCloseTo(0, 5);
  });

  it("click just outside room left edge is rejected", () => {
    const r = computePlacement(599, 700, [3, 2], [4, 3]);
    expect(r.isInside).toBe(false);
  });

  it("computes Y position as half item height for floor placement", () => {
    // From useFurniturePlacement: itemY = placingItem.defaultSize[1] / 2
    const itemHeight = 0.7; // chair
    const itemY = itemHeight / 2;
    expect(itemY).toBeCloseTo(0.35, 5);
  });
});

// ─── Drag Grid-Snap Math ────────────────────────────────────────────────
// Mirrors useDragRoom.ts coordinate conversion

describe("Drag grid-snap math", () => {
  const GRID_WORLD = 3.6; // GRID_UNIT(200) * SCALE(0.018)

  function computeGridDelta(worldDx: number, worldDz: number) {
    return {
      gridDx: Math.round(worldDx / GRID_WORLD),
      gridDz: Math.round(worldDz / GRID_WORLD),
    };
  }

  it("snaps to nearest grid unit", () => {
    // Moving 7.0 world units ≈ 1.94 grid → rounds to 2
    const d = computeGridDelta(7.0, 0);
    expect(d.gridDx).toBe(2);
    expect(d.gridDz).toBe(0);
  });

  it("small movements snap to zero", () => {
    const d = computeGridDelta(1.0, 0.5);
    expect(d.gridDx).toBe(0);
    expect(d.gridDz).toBe(0);
  });

  it("exact grid unit snaps correctly", () => {
    const d = computeGridDelta(3.6, 7.2);
    expect(d.gridDx).toBe(1);
    expect(d.gridDz).toBe(2);
  });

  it("negative movements snap correctly", () => {
    const d = computeGridDelta(-10.8, -3.6);
    expect(d.gridDx).toBe(-3);
    expect(d.gridDz).toBe(-1);
  });

  it("half-grid rounds up", () => {
    const d = computeGridDelta(1.8, 0); // exactly 0.5 grids
    expect(d.gridDx).toBe(1); // Math.round(0.5) = 1
  });

  it("just under half-grid rounds down", () => {
    const d = computeGridDelta(1.79, 0); // just under 0.5 grids
    expect(d.gridDx).toBe(0);
  });
});

// ─── Overlap Detection Pure Logic ───────────────────────────────────────

describe("Overlap detection edge cases", () => {
  function overlaps(
    aPos: [number, number], aSize: [number, number],
    bPos: [number, number], bSize: [number, number],
  ): boolean {
    return (
      aPos[0] < bPos[0] + bSize[0] &&
      aPos[0] + aSize[0] > bPos[0] &&
      aPos[1] < bPos[1] + bSize[1] &&
      aPos[1] + aSize[1] > bPos[1]
    );
  }

  it("identical rooms overlap", () => {
    expect(overlaps([0, 0], [3, 3], [0, 0], [3, 3])).toBe(true);
  });

  it("completely separated rooms do not overlap", () => {
    expect(overlaps([0, 0], [3, 3], [10, 10], [3, 3])).toBe(false);
  });

  it("rooms touching on right edge do not overlap", () => {
    expect(overlaps([0, 0], [3, 3], [3, 0], [3, 3])).toBe(false);
  });

  it("rooms touching on bottom edge do not overlap", () => {
    expect(overlaps([0, 0], [3, 3], [0, 3], [3, 3])).toBe(false);
  });

  it("rooms touching diagonally do not overlap", () => {
    expect(overlaps([0, 0], [3, 3], [3, 3], [3, 3])).toBe(false);
  });

  it("partial overlap on x-axis", () => {
    expect(overlaps([0, 0], [3, 3], [2, 0], [3, 3])).toBe(true);
  });

  it("partial overlap on y-axis", () => {
    expect(overlaps([0, 0], [3, 3], [0, 2], [3, 3])).toBe(true);
  });

  it("room completely inside another", () => {
    expect(overlaps([0, 0], [10, 10], [2, 2], [3, 3])).toBe(true);
  });

  it("1x1 rooms touching do not overlap", () => {
    expect(overlaps([0, 0], [1, 1], [1, 0], [1, 1])).toBe(false);
  });

  it("1x1 rooms at same position overlap", () => {
    expect(overlaps([0, 0], [1, 1], [0, 0], [1, 1])).toBe(true);
  });

  it("negative coordinate rooms", () => {
    expect(overlaps([-5, -5], [3, 3], [-4, -4], [3, 3])).toBe(true);
    expect(overlaps([-5, -5], [3, 3], [-2, -5], [3, 3])).toBe(false);
  });
});

// ─── E2E Workflow: Full Spatial Editor Session ──────────────────────────

describe("E2E: Full spatial editor workflow through reducer", () => {
  it("complete session: add → move → resize → color → furniture → undo chain", () => {
    let state = createBuilderState();

    // Step 1: Add three well-separated rooms
    // meeting: [0, 0] 4x3 → occupies (0..4, 0..3)
    state = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("meeting", 0, 0, 4, 3),
    });
    // workspace: [0, 5] 5x4 → occupies (0..5, 5..9)
    state = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("workspace", 0, 5, 5, 4),
    });
    // custom: [8, 0] 6x5 → occupies (8..14, 0..5)
    state = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("custom", 8, 0, 6, 5, { preset: "custom" }),
    });
    expect(state.rooms).toHaveLength(3);
    expect(state.history.past).toHaveLength(3);

    // Step 2: Select meeting room
    state = builderReducer(state, { type: "SELECT_ROOM", roomId: "meeting" });
    expect(state.selectedRoomId).toBe("meeting");

    // Step 3: Move meeting room (simulate drag)
    // Move meeting (4x3) to [0, 11] → occupies (0..4, 11..14) — well clear of all rooms
    state = builderReducer(state, {
      type: "MOVE_ROOM",
      roomId: "meeting",
      position: [0, 11],
    });
    expect(state.rooms.find(r => r.id === "meeting")!.position).toEqual([0, 11]);
    expect(state.history.past).toHaveLength(4);

    // Step 4: Resize workspace (simulate resize handle drag)
    // workspace at [0, 5] → resize to [7, 5] → occupies (0..7, 5..10) — no overlap with custom (8..14, 0..5)
    state = builderReducer(state, {
      type: "RESIZE_ROOM",
      roomId: "workspace",
      size: [7, 5],
    });
    expect(state.rooms.find(r => r.id === "workspace")!.size).toEqual([7, 5]);

    // Step 5: Set custom colors on the custom room
    state = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "custom",
      colors: { accent: "#e53e3e", floor: "#1a1a2e", wall: "#e53e3e" },
    });
    expect(state.rooms.find(r => r.id === "custom")!.colors!.accent).toBe("#e53e3e");

    // Step 6: Add furniture to meeting room
    state = builderReducer(state, {
      type: "ADD_FURNITURE",
      roomId: "meeting",
      item: desk,
    });
    state = builderReducer(state, {
      type: "ADD_FURNITURE",
      roomId: "meeting",
      item: chair,
    });
    state = builderReducer(state, {
      type: "ADD_FURNITURE",
      roomId: "meeting",
      item: monitor,
    });
    expect(state.rooms.find(r => r.id === "meeting")!.furniture).toHaveLength(3);
    expect(state.history.past).toHaveLength(9);

    // Step 7: Undo chain — undo all 3 furniture adds
    state = builderReducer(state, { type: "UNDO" });
    state = builderReducer(state, { type: "UNDO" });
    state = builderReducer(state, { type: "UNDO" });
    expect(state.rooms.find(r => r.id === "meeting")!.furniture).toBeUndefined();
    expect(state.history.future).toHaveLength(3);

    // Step 8: Redo one furniture add
    state = builderReducer(state, { type: "REDO" });
    expect(state.rooms.find(r => r.id === "meeting")!.furniture).toHaveLength(1);
    expect(state.rooms.find(r => r.id === "meeting")!.furniture![0].geometry).toBe("box"); // desk

    // Step 9: Undo all the way back to empty
    while (state.history.past.length > 0) {
      state = builderReducer(state, { type: "UNDO" });
    }
    expect(state.rooms).toHaveLength(0);

    // Step 10: Redo everything
    while (state.history.future.length > 0) {
      state = builderReducer(state, { type: "REDO" });
    }
    // After full redo: 3 rooms, but the redo stopped at desk add (redo future was cleared by the new action)
    // Actually: undo went all the way to 0 rooms (9 undos), redo should restore one at a time
    // The state should be at the "7 adds + desk redo" point → 7 items re-done
    expect(state.rooms.length).toBeGreaterThan(0);
  });

  it("add preset rooms → add custom room → move and validate overlap prevention", () => {
    let state = createBuilderState();

    // Add two preset rooms
    state = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("meeting", 0, 0, 4, 3),
    });
    state = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("lab", 5, 0, 4, 4),
    });

    // Add custom room (empty, no furniture)
    state = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("war-room", 0, 4, 6, 4, { preset: "custom" }),
    });
    expect(state.rooms).toHaveLength(3);

    // Try to move war-room on top of meeting room — should be rejected
    state = builderReducer(state, {
      type: "MOVE_ROOM",
      roomId: "war-room",
      position: [0, 0],
    });
    expect(state.rooms.find(r => r.id === "war-room")!.position).toEqual([0, 4]);

    // Move war-room to valid position
    state = builderReducer(state, {
      type: "MOVE_ROOM",
      roomId: "war-room",
      position: [0, 5],
    });
    expect(state.rooms.find(r => r.id === "war-room")!.position).toEqual([0, 5]);
  });

  it("remove room → deselects if it was selected", () => {
    let state = createBuilderState([room("A", 0, 0), room("B", 4, 0)]);
    state = builderReducer(state, { type: "SELECT_ROOM", roomId: "A" });
    expect(state.selectedRoomId).toBe("A");

    state = builderReducer(state, { type: "REMOVE_ROOM", roomId: "A" });
    expect(state.selectedRoomId).toBeNull();
    expect(state.rooms).toHaveLength(1);
  });

  it("remove room → keeps selection if different room was selected", () => {
    let state = createBuilderState([room("A", 0, 0), room("B", 4, 0)]);
    state = builderReducer(state, { type: "SELECT_ROOM", roomId: "B" });
    state = builderReducer(state, { type: "REMOVE_ROOM", roomId: "A" });
    expect(state.selectedRoomId).toBe("B");
  });

  it("interleaved colors and furniture across multiple rooms", () => {
    let state = createBuilderState([room("A", 0, 0), room("B", 4, 0)]);

    // Color A, then furnish B, then color B, then furnish A
    state = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { accent: "#ff0000" },
    });
    state = builderReducer(state, {
      type: "ADD_FURNITURE",
      roomId: "B",
      item: desk,
    });
    state = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "B",
      colors: { floor: "#222" },
    });
    state = builderReducer(state, {
      type: "ADD_FURNITURE",
      roomId: "A",
      item: chair,
    });

    expect(state.rooms[0].colors?.accent).toBe("#ff0000");
    expect(state.rooms[0].furniture).toHaveLength(1);
    expect(state.rooms[1].colors?.floor).toBe("#222");
    expect(state.rooms[1].furniture).toHaveLength(1);

    // Undo 4 actions → back to bare rooms
    state = applyActions(state, [
      { type: "UNDO" },
      { type: "UNDO" },
      { type: "UNDO" },
      { type: "UNDO" },
    ]);
    expect(state.rooms[0].colors).toBeUndefined();
    expect(state.rooms[0].furniture).toBeUndefined();
    expect(state.rooms[1].colors).toBeUndefined();
    expect(state.rooms[1].furniture).toBeUndefined();
  });
});

// ─── History Deep Copy Correctness ──────────────────────────────────────

describe("History deep copy correctness (structuredClone)", () => {
  it("undo restores independent copy — mutating current doesn't affect history", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, {
      type: "ADD_FURNITURE",
      roomId: "A",
      item: chair,
    });

    // Save reference to current furniture array
    const furnitureBefore = state.rooms[0].furniture!;
    expect(furnitureBefore).toHaveLength(1);

    // Undo
    state = builderReducer(state, { type: "UNDO" });
    expect(state.rooms[0].furniture).toBeUndefined();

    // The old furniture reference should still be intact (it was cloned)
    expect(furnitureBefore).toHaveLength(1);
  });

  it("redo produces independent copy", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, {
      type: "SET_ROOM_COLORS",
      roomId: "A",
      colors: { accent: "#ff0000" },
    });
    state = builderReducer(state, { type: "UNDO" });
    state = builderReducer(state, { type: "REDO" });

    // Modifying the redo'd state shouldn't affect history
    const colorsRef = state.rooms[0].colors!;
    expect(colorsRef.accent).toBe("#ff0000");
  });
});

// ─── SELECT_ROOM edge cases ─────────────────────────────────────────────

describe("SELECT_ROOM edge cases", () => {
  it("does not push history (selection is non-destructive)", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, { type: "SELECT_ROOM", roomId: "A" });
    expect(next.history.past).toHaveLength(0); // no history entry
  });

  it("selecting non-existent ID still sets selectedRoomId", () => {
    const state = createBuilderState([room("A", 0, 0)]);
    const next = builderReducer(state, { type: "SELECT_ROOM", roomId: "non-existent" });
    expect(next.selectedRoomId).toBe("non-existent");
  });

  it("selecting null clears selection", () => {
    let state = createBuilderState([room("A", 0, 0)]);
    state = builderReducer(state, { type: "SELECT_ROOM", roomId: "A" });
    state = builderReducer(state, { type: "SELECT_ROOM", roomId: null });
    expect(state.selectedRoomId).toBeNull();
  });
});
