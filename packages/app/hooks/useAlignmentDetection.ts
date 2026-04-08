/** Shared alignment-snap detection for drag and resize hooks. */

export interface AlignmentGuide {
  /** Which world axis the guide line runs along */
  axis: "x" | "z";
  /** The constant world coordinate where the guide sits */
  worldCoord: number;
  type: "edge" | "center";
}

const GRID_WORLD = 3.6;  // world units per grid cell
const HALF_W = 16.2;     // world units from origin to left canvas edge (1800 * 0.018 / 2)
const HALF_H = 9.0;      // world units from origin to top canvas edge (1000 * 0.018 / 2)
const SNAP_TOLERANCE = 0.45; // grid units — within this, snap and show guide

function gridXToWorld(g: number) { return g * GRID_WORLD - HALF_W; }
function gridZToWorld(g: number) { return g * GRID_WORLD - HALF_H; }

interface Room {
  id: string;
  position: [number, number];
  size: [number, number];
}

interface AlignmentResult {
  snappedPos: [number, number];
  guides: AlignmentGuide[];
}

/**
 * Given a candidate grid position + size, check every other room for
 * edge/center alignment on X and Z axes. Returns the snapped position
 * and the guide lines to display.
 */
export function detectAlignments(
  pos: [number, number],
  size: [number, number],
  allRooms: Room[],
  excludeId: string,
): AlignmentResult {
  const guides: AlignmentGuide[] = [];
  let [nx, nz] = pos;

  // Candidate edges / center for the dragged room (grid coords)
  const dragLeft   = nx;
  const dragRight  = nx + size[0];
  const dragCenterX = nx + size[0] / 2;
  const dragTop    = nz;
  const dragBottom = nz + size[1];
  const dragCenterZ = nz + size[1] / 2;

  for (const other of allRooms) {
    if (other.id === excludeId) continue;

    const oLeft   = other.position[0];
    const oRight  = other.position[0] + other.size[0];
    const oCenterX = other.position[0] + other.size[0] / 2;
    const oTop    = other.position[1];
    const oBottom = other.position[1] + other.size[1];
    const oCenterZ = other.position[1] + other.size[1] / 2;

    // --- X-axis snaps (vertical guide lines in plan view) ---
    const xCandidates: Array<{ dragVal: number; otherVal: number; type: "edge" | "center" }> = [
      { dragVal: dragLeft,    otherVal: oLeft,    type: "edge" },
      { dragVal: dragLeft,    otherVal: oRight,   type: "edge" },
      { dragVal: dragRight,   otherVal: oLeft,    type: "edge" },
      { dragVal: dragRight,   otherVal: oRight,   type: "edge" },
      { dragVal: dragCenterX, otherVal: oCenterX, type: "center" },
    ];

    for (const { dragVal, otherVal, type } of xCandidates) {
      const delta = otherVal - dragVal;
      if (Math.abs(delta) < SNAP_TOLERANCE) {
        // Snap: adjust nx so dragVal lands on otherVal
        nx += delta;
        guides.push({ axis: "x", worldCoord: gridXToWorld(otherVal), type });
        break; // one snap per axis per other room is enough
      }
    }

    // --- Z-axis snaps (horizontal guide lines in plan view) ---
    const zCandidates: Array<{ dragVal: number; otherVal: number; type: "edge" | "center" }> = [
      { dragVal: dragTop,     otherVal: oTop,     type: "edge" },
      { dragVal: dragTop,     otherVal: oBottom,  type: "edge" },
      { dragVal: dragBottom,  otherVal: oTop,     type: "edge" },
      { dragVal: dragBottom,  otherVal: oBottom,  type: "edge" },
      { dragVal: dragCenterZ, otherVal: oCenterZ, type: "center" },
    ];

    for (const { dragVal, otherVal, type } of zCandidates) {
      const delta = otherVal - dragVal;
      if (Math.abs(delta) < SNAP_TOLERANCE) {
        nz += delta;
        guides.push({ axis: "z", worldCoord: gridZToWorld(otherVal), type });
        break;
      }
    }
  }

  return { snappedPos: [nx, nz], guides };
}
