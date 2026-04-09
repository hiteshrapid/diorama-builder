import { toWorld } from "./geometry";
import type { RoomConfig } from "./config";
import type { RoomPreset, RelativeDoor } from "./roomPresets";

const GRID_UNIT = 200;
/** Maximum world-space distance between two doors to consider them connected. */
const DOOR_CONNECT_THRESHOLD = 1.0;

// ── Types ──

export interface DoorWorldPos {
  worldX: number;
  worldZ: number;
  roomLabel: string;
}

export interface RoomNode {
  label: string;
  /** World-space center of the room [x, z]. */
  center: [number, number];
  doors: DoorWorldPos[];
}

export interface RoomEdge {
  fromRoom: string;
  toRoom: string;
  fromDoor: DoorWorldPos;
  toDoor: DoorWorldPos;
}

export interface RoomGraph {
  nodes: Map<string, RoomNode>;
  edges: RoomEdge[];
}

// ── Graph Construction ──

/**
 * Convert a room's relative door positions to absolute world-space coordinates.
 */
export function resolveRoomDoors(
  room: RoomConfig,
  presetDoors: RelativeDoor[],
): DoorWorldPos[] {
  return presetDoors.map((rd) => {
    // Absolute canvas position of the door
    const canvasX = (room.position[0] + rd.rx * room.size[0]) * GRID_UNIT;
    const canvasY = (room.position[1] + rd.ry * room.size[1]) * GRID_UNIT;
    const [wx, , wz] = toWorld(canvasX, canvasY);
    return { worldX: wx, worldZ: wz, roomLabel: room.label };
  });
}

/**
 * Build a room connectivity graph from room configs and their preset definitions.
 * Rooms are connected when doors from different rooms are within DOOR_CONNECT_THRESHOLD of each other.
 */
export function buildRoomGraph(
  rooms: RoomConfig[],
  presets: RoomPreset[],
): RoomGraph {
  const presetMap = new Map(presets.map((p) => [p.id, p]));
  const nodes = new Map<string, RoomNode>();
  const allDoors: DoorWorldPos[] = [];

  for (const room of rooms) {
    const preset = presetMap.get(room.preset);
    const relDoors = preset?.doors ?? [{ rx: 0.5, ry: 1.0, facing: 180 }]; // fallback: south center
    const doors = resolveRoomDoors(room, relDoors);

    const canvasCenterX = (room.position[0] + room.size[0] / 2) * GRID_UNIT;
    const canvasCenterY = (room.position[1] + room.size[1] / 2) * GRID_UNIT;
    const [cx, , cz] = toWorld(canvasCenterX, canvasCenterY);

    nodes.set(room.label, {
      label: room.label,
      center: [cx, cz],
      doors,
    });
    allDoors.push(...doors);
  }

  // Find connections: doors from different rooms that are close together
  const edges: RoomEdge[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < allDoors.length; i++) {
    for (let j = i + 1; j < allDoors.length; j++) {
      const a = allDoors[i];
      const b = allDoors[j];
      if (a.roomLabel === b.roomLabel) continue;

      const dx = a.worldX - b.worldX;
      const dz = a.worldZ - b.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < DOOR_CONNECT_THRESHOLD) {
        const key = [a.roomLabel, b.roomLabel].sort().join("::");
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ fromRoom: a.roomLabel, toRoom: b.roomLabel, fromDoor: a, toDoor: b });
          edges.push({ fromRoom: b.roomLabel, toRoom: a.roomLabel, fromDoor: b, toDoor: a });
        }
      }
    }
  }

  return { nodes, edges };
}

// ── Pathfinding ──

/**
 * BFS to find the shortest room-level path from one room to another.
 * Returns an array of room labels, or empty array if no path exists.
 */
export function findRoomPath(
  graph: RoomGraph,
  fromRoom: string,
  toRoom: string,
): string[] {
  if (fromRoom === toRoom) return [fromRoom];
  if (!graph.nodes.has(fromRoom) || !graph.nodes.has(toRoom)) return [];

  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes.values()) {
    adj.set(node.label, []);
  }
  for (const edge of graph.edges) {
    adj.get(edge.fromRoom)?.push(edge.toRoom);
  }

  // BFS
  const visited = new Set<string>([fromRoom]);
  const parent = new Map<string, string>();
  const queue = [fromRoom];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adj.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);
      if (neighbor === toRoom) {
        // Reconstruct path
        const path: string[] = [];
        let node: string | undefined = toRoom;
        while (node !== undefined) {
          path.unshift(node);
          node = parent.get(node);
        }
        return path;
      }
      queue.push(neighbor);
    }
  }

  return []; // no path found
}

/**
 * Convert a room path into world-space [x, 0, z] waypoints that an agent can follow.
 * Path goes: startPos → exit door → entry door → ... → endPos.
 */
export function generateWaypoints(
  graph: RoomGraph,
  roomPath: string[],
  startPos: [number, number],
  endPos: [number, number],
): [number, number, number][] {
  if (roomPath.length === 0) return [];
  if (roomPath.length === 1) {
    // Same room — just go to the end position
    return [[endPos[0], 0, endPos[1]]];
  }

  const waypoints: [number, number, number][] = [];

  // For each room transition, find the connecting edge and add door waypoints
  for (let i = 0; i < roomPath.length - 1; i++) {
    const from = roomPath[i];
    const to = roomPath[i + 1];

    // Find the edge connecting these rooms
    const edge = graph.edges.find(
      (e) => e.fromRoom === from && e.toRoom === to,
    );

    if (edge) {
      // Walk to exit door, then to entry door
      waypoints.push([edge.fromDoor.worldX, 0, edge.fromDoor.worldZ]);
      waypoints.push([edge.toDoor.worldX, 0, edge.toDoor.worldZ]);
    }
  }

  // Final destination
  waypoints.push([endPos[0], 0, endPos[1]]);

  return waypoints;
}

/**
 * Determine which room an agent is currently in based on their world-space position.
 * Returns the room label, or null if not inside any room.
 */
export function findRoomContaining(
  rooms: RoomConfig[],
  worldX: number,
  worldZ: number,
): string | null {
  for (const room of rooms) {
    const x0 = room.position[0] * GRID_UNIT;
    const y0 = room.position[1] * GRID_UNIT;
    const x1 = (room.position[0] + room.size[0]) * GRID_UNIT;
    const y1 = (room.position[1] + room.size[1]) * GRID_UNIT;

    // Convert room bounds to world space
    const [wx0, , wz0] = toWorld(x0, y0);
    const [wx1, , wz1] = toWorld(x1, y1);

    const minX = Math.min(wx0, wx1);
    const maxX = Math.max(wx0, wx1);
    const minZ = Math.min(wz0, wz1);
    const maxZ = Math.max(wz0, wz1);

    if (worldX >= minX && worldX <= maxX && worldZ >= minZ && worldZ <= maxZ) {
      return room.label;
    }
  }
  return null;
}
