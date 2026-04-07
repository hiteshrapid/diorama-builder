import { describe, it, expect } from "vitest";
import { toWorld, toCanvas, createCoordinateSystem } from "./geometry";

// ─── Constants matching the spatial editor code ─────────────────────────

const GRID_UNIT = 200;
const SCALE = 0.018;
const CANVAS_W = 1800;
const CANVAS_H = 1000;
const GRID_WORLD = GRID_UNIT * SCALE; // 3.6
const HALF_W = CANVAS_W * SCALE * 0.5; // 16.2
const HALF_H = CANVAS_H * SCALE * 0.5; // 9.0

// ─── Grid ↔ World Conversion (used by Room3D, GhostRoom, ResizeHandles) ─

describe("Grid ↔ World coordinate conversion", () => {
  /**
   * Room3D/GhostRoom uses toWorld() to position rooms:
   *   centerCx = (gridX + w/2) * GRID_UNIT
   *   centerCy = (gridY + h/2) * GRID_UNIT
   *   [worldX, _, worldZ] = toWorld(centerCx, centerCy)
   */
  function gridCenterToWorld(
    gridPos: [number, number],
    gridSize: [number, number],
  ): [number, number, number] {
    const centerCx = (gridPos[0] + gridSize[0] / 2) * GRID_UNIT;
    const centerCy = (gridPos[1] + gridSize[1] / 2) * GRID_UNIT;
    return toWorld(centerCx, centerCy);
  }

  it("room at grid (0,0) size 4x3 maps to expected world position", () => {
    const [wx, wy, wz] = gridCenterToWorld([0, 0], [4, 3]);
    // center canvas: (2*200, 1.5*200) = (400, 300)
    // toWorld(400, 300) = (400*0.018 - 16.2, 0, 300*0.018 - 9.0) = (7.2-16.2, 0, 5.4-9.0)
    expect(wx).toBeCloseTo(-9.0, 5);
    expect(wy).toBe(0);
    expect(wz).toBeCloseTo(-3.6, 5);
  });

  it("room at grid (5,0) size 3x3 maps correctly", () => {
    const [wx, , wz] = gridCenterToWorld([5, 0], [3, 3]);
    // center canvas: (6.5*200, 1.5*200) = (1300, 300)
    expect(wx).toBeCloseTo(1300 * SCALE - HALF_W, 5);
    expect(wz).toBeCloseTo(300 * SCALE - HALF_H, 5);
  });

  it("grid origin room center is NOT world origin", () => {
    const [wx, , wz] = gridCenterToWorld([0, 0], [2, 2]);
    // Canvas center: (200, 200). World: (200*0.018-16.2, 200*0.018-9.0) = (-12.6, -5.4)
    expect(wx).not.toBeCloseTo(0, 1);
    expect(wz).not.toBeCloseTo(0, 1);
  });

  it("canvas center (world origin) corresponds to specific grid position", () => {
    // Canvas center = (900, 500). Grid = (900/200, 500/200) = (4.5, 2.5)
    const [wx, , wz] = toWorld(900, 500);
    expect(wx).toBeCloseTo(0, 5);
    expect(wz).toBeCloseTo(0, 5);
  });
});

// ─── World ↔ Grid Snap (useDragRoom math) ───────────────────────────────

describe("World ↔ Grid snap for drag operations", () => {
  /**
   * useDragRoom computes:
   *   gridDx = Math.round(dx / GRID_WORLD)
   *   gridDz = Math.round(dz / GRID_WORLD)
   *   newPos = [startGridX + gridDx, startGridY + gridDz]
   */
  function dragSnap(
    startGrid: [number, number],
    worldDx: number,
    worldDz: number,
  ): [number, number] {
    const gridDx = Math.round(worldDx / GRID_WORLD);
    const gridDz = Math.round(worldDz / GRID_WORLD);
    return [startGrid[0] + gridDx, startGrid[1] + gridDz];
  }

  it("moving exactly 1 grid unit east", () => {
    expect(dragSnap([2, 3], GRID_WORLD, 0)).toEqual([3, 3]);
  });

  it("moving exactly 2 grid units south", () => {
    expect(dragSnap([2, 3], 0, 2 * GRID_WORLD)).toEqual([2, 5]);
  });

  it("moving diagonally 3 units east, 1 unit north", () => {
    expect(dragSnap([0, 5], 3 * GRID_WORLD, -GRID_WORLD)).toEqual([3, 4]);
  });

  it("sub-grid movement snaps to zero", () => {
    expect(dragSnap([2, 3], 1.5, 0.8)).toEqual([2, 3]);
  });

  it("threshold at exactly half grid rounds up", () => {
    expect(dragSnap([0, 0], GRID_WORLD * 0.5, 0)).toEqual([1, 0]);
  });

  it("threshold just below half grid rounds down", () => {
    expect(dragSnap([0, 0], GRID_WORLD * 0.499, 0)).toEqual([0, 0]);
  });

  it("large drag distance", () => {
    expect(dragSnap([0, 0], 10 * GRID_WORLD, 5 * GRID_WORLD)).toEqual([10, 5]);
  });

  it("negative drag (moving left/up)", () => {
    expect(dragSnap([5, 5], -3 * GRID_WORLD, -2 * GRID_WORLD)).toEqual([2, 3]);
  });
});

// ─── Resize Handle World Positions ──────────────────────────────────────
// From ResizeHandles.tsx

describe("Resize handle world positions", () => {
  /**
   * ResizeHandles converts grid corners to world coords:
   *   left/right/top/bottom in canvas, then toWorld()
   */
  function handlePositions(
    gridPos: [number, number],
    gridSize: [number, number],
  ) {
    const left = gridPos[0] * GRID_UNIT;
    const right = (gridPos[0] + gridSize[0]) * GRID_UNIT;
    const top = gridPos[1] * GRID_UNIT;
    const bottom = (gridPos[1] + gridSize[1]) * GRID_UNIT;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;

    return {
      n: toWorld(midX, top),
      s: toWorld(midX, bottom),
      e: toWorld(right, midY),
      w: toWorld(left, midY),
      ne: toWorld(right, top),
      nw: toWorld(left, top),
      se: toWorld(right, bottom),
      sw: toWorld(left, bottom),
    };
  }

  it("handle positions are symmetric around room center", () => {
    const h = handlePositions([0, 0], [4, 4]);
    // N and S should have same X, opposite Z
    expect(h.n[0]).toBeCloseTo(h.s[0], 5);
    expect(h.n[2]).not.toBeCloseTo(h.s[2], 1);
    // E and W should have same Z, opposite X
    expect(h.e[2]).toBeCloseTo(h.w[2], 5);
    expect(h.e[0]).not.toBeCloseTo(h.w[0], 1);
  });

  it("corner handles are at room corners", () => {
    const h = handlePositions([0, 0], [4, 4]);
    // NW should match top-left
    expect(h.nw[0]).toBeCloseTo(h.w[0], 5); // same X as west
    expect(h.nw[2]).toBeCloseTo(h.n[2], 5); // same Z as north
    // SE should match bottom-right
    expect(h.se[0]).toBeCloseTo(h.e[0], 5);
    expect(h.se[2]).toBeCloseTo(h.s[2], 5);
  });

  it("room dimensions scale correctly in world space", () => {
    const h = handlePositions([0, 0], [4, 3]);
    const worldWidth = h.e[0] - h.w[0];
    const worldHeight = h.s[2] - h.n[2];
    expect(worldWidth).toBeCloseTo(4 * GRID_UNIT * SCALE, 5);
    expect(worldHeight).toBeCloseTo(3 * GRID_UNIT * SCALE, 5);
  });
});

// ─── GhostRoom Position/Size Conversion ─────────────────────────────────

describe("GhostRoom world conversion", () => {
  function ghostWorldProps(
    gridPos: [number, number],
    gridSize: [number, number],
  ) {
    const centerCx = (gridPos[0] + gridSize[0] / 2) * GRID_UNIT;
    const centerCy = (gridPos[1] + gridSize[1] / 2) * GRID_UNIT;
    const [worldX, , worldZ] = toWorld(centerCx, centerCy);
    const worldW = gridSize[0] * GRID_UNIT * SCALE;
    const worldH = gridSize[1] * GRID_UNIT * SCALE;
    return { worldX, worldZ, worldW, worldH };
  }

  it("ghost for 4x3 room has correct world dimensions", () => {
    const g = ghostWorldProps([0, 0], [4, 3]);
    expect(g.worldW).toBeCloseTo(4 * 200 * 0.018, 5); // 14.4
    expect(g.worldH).toBeCloseTo(3 * 200 * 0.018, 5); // 10.8
  });

  it("ghost position matches room center", () => {
    const g1 = ghostWorldProps([2, 3], [4, 3]);
    // Center canvas: (2 + 2)*200 = 800, (3 + 1.5)*200 = 900
    const [expectedX, , expectedZ] = toWorld(800, 900);
    expect(g1.worldX).toBeCloseTo(expectedX, 5);
    expect(g1.worldZ).toBeCloseTo(expectedZ, 5);
  });

  it("ghost for 1x1 room", () => {
    const g = ghostWorldProps([0, 0], [1, 1]);
    expect(g.worldW).toBeCloseTo(GRID_WORLD, 5);
    expect(g.worldH).toBeCloseTo(GRID_WORLD, 5);
  });

  it("ghost for large 10x8 room", () => {
    const g = ghostWorldProps([0, 0], [10, 8]);
    expect(g.worldW).toBeCloseTo(10 * GRID_WORLD, 5);
    expect(g.worldH).toBeCloseTo(8 * GRID_WORLD, 5);
  });
});

// ─── toCanvas ↔ toWorld Round-Trip with Grid Positions ──────────────────

describe("Coordinate round-trip for spatial editor operations", () => {
  it("grid position → canvas → world → canvas round-trips", () => {
    const gridX = 3;
    const gridY = 2;
    const canvasX = gridX * GRID_UNIT;
    const canvasY = gridY * GRID_UNIT;
    const [wx, , wz] = toWorld(canvasX, canvasY);
    const [rcx, rcy] = toCanvas(wx, wz);
    expect(rcx).toBeCloseTo(canvasX, 5);
    expect(rcy).toBeCloseTo(canvasY, 5);
  });

  it("world click → canvas → grid position conversion", () => {
    // Simulate a world-space click and converting to grid
    const worldClickX = 5.0;
    const worldClickZ = 2.0;
    const [canvasX, canvasY] = toCanvas(worldClickX, worldClickZ);
    const gridX = canvasX / GRID_UNIT;
    const gridY = canvasY / GRID_UNIT;
    // Grid should be positive and reasonable
    expect(gridX).toBeGreaterThan(0);
    expect(gridY).toBeGreaterThan(0);

    // Round-trip back
    const [wx, , wz] = toWorld(gridX * GRID_UNIT, gridY * GRID_UNIT);
    expect(wx).toBeCloseTo(worldClickX, 5);
    expect(wz).toBeCloseTo(worldClickZ, 5);
  });

  it("multiple grid positions produce monotonically increasing world X", () => {
    let prevWX = -Infinity;
    for (let gx = 0; gx <= 8; gx++) {
      const [wx] = toWorld(gx * GRID_UNIT, 0);
      expect(wx).toBeGreaterThan(prevWX);
      prevWX = wx;
    }
  });

  it("multiple grid positions produce monotonically increasing world Z", () => {
    let prevWZ = -Infinity;
    for (let gy = 0; gy <= 4; gy++) {
      const [, , wz] = toWorld(0, gy * GRID_UNIT);
      expect(wz).toBeGreaterThan(prevWZ);
      prevWZ = wz;
    }
  });
});

// ─── Drag Threshold ─────────────────────────────────────────────────────

describe("Drag threshold logic", () => {
  const DRAG_THRESHOLD = 0.5; // from useDragRoom

  function isAboveThreshold(dx: number, dz: number): boolean {
    return Math.sqrt(dx * dx + dz * dz) >= DRAG_THRESHOLD;
  }

  it("zero movement is below threshold", () => {
    expect(isAboveThreshold(0, 0)).toBe(false);
  });

  it("tiny movement is below threshold", () => {
    expect(isAboveThreshold(0.1, 0.1)).toBe(false);
  });

  it("movement at exactly threshold triggers drag", () => {
    expect(isAboveThreshold(0.5, 0)).toBe(true);
  });

  it("diagonal movement combines correctly", () => {
    // sqrt(0.3² + 0.4²) = sqrt(0.09 + 0.16) = sqrt(0.25) = 0.5
    expect(isAboveThreshold(0.3, 0.4)).toBe(true);
  });

  it("movement just below threshold in both axes", () => {
    // sqrt(0.3² + 0.3²) = sqrt(0.18) ≈ 0.424 < 0.5
    expect(isAboveThreshold(0.3, 0.3)).toBe(false);
  });
});

// ─── Custom Coordinate System ───────────────────────────────────────────

describe("Custom coordinate system for alternative canvases", () => {
  it("smaller canvas produces different world scale", () => {
    const sys = createCoordinateSystem(800, 600, 0.01);
    const [wx, , wz] = sys.toWorld(400, 300); // center
    expect(wx).toBeCloseTo(0, 5);
    expect(wz).toBeCloseTo(0, 5);

    // Edge should be at half canvas * scale
    const [edgeX] = sys.toWorld(0, 300);
    expect(edgeX).toBeCloseTo(-400 * 0.01, 5);
  });

  it("custom system round-trips correctly", () => {
    const sys = createCoordinateSystem(2000, 1200, 0.025);
    const [wx, , wz] = sys.toWorld(750, 450);
    const [cx, cy] = sys.toCanvas(wx, wz);
    expect(cx).toBeCloseTo(750, 5);
    expect(cy).toBeCloseTo(450, 5);
  });
});
