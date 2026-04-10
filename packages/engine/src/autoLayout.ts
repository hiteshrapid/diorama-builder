import type { RoomConfig, AgentAssignment } from "./config";
import { ROOM_PRESETS, type RoomPreset } from "./roomPresets";

export interface AutoLayoutResult {
  rooms: RoomConfig[];
  agents: Record<string, AgentAssignment>;
}

function overlaps(
  a: { position: [number, number]; size: [number, number] },
  b: { position: [number, number]; size: [number, number] },
): boolean {
  return (
    a.position[0] < b.position[0] + b.size[0] &&
    a.position[0] + a.size[0] > b.position[0] &&
    a.position[1] < b.position[1] + b.size[1] &&
    a.position[1] + a.size[1] > b.position[1]
  );
}

/**
 * Find the next open grid position for a room of given size.
 * Row-packing: scan left-to-right, top-to-bottom.
 */
export function findNextPosition(
  size: [number, number],
  existing: Array<{ position: [number, number]; size: [number, number] }>,
  maxRowWidth: number = 12,
): [number, number] {
  let cursorX = 0;
  let cursorY = 0;
  const step = 1; // grid unit step

  for (let attempts = 0; attempts < 200; attempts++) {
    const candidate = { position: [cursorX, cursorY] as [number, number], size };
    const blocked = existing.some((r) => overlaps(candidate, r));
    if (!blocked && cursorX + size[0] <= maxRowWidth) {
      return [cursorX, cursorY];
    }
    cursorX += step;
    if (cursorX + size[0] > maxRowWidth) {
      cursorX = 0;
      cursorY += step;
    }
  }
  // Fallback: place below everything
  const maxY = existing.reduce((m, r) => Math.max(m, r.position[1] + r.size[1]), 0);
  return [0, maxY];
}

/**
 * Generate a layout from a list of agent names and room presets.
 * Places one room per preset provided, distributes agents round-robin across rooms.
 * If no presets given, uses default set. Always ensures a "General" workspace room.
 */
export function generateAutoLayout(
  agents: string[],
  presets?: RoomPreset[],
): AutoLayoutResult {
  const presetList = presets ?? ROOM_PRESETS;
  const rooms: RoomConfig[] = [];

  // Place each preset as a room
  for (const preset of presetList) {
    const size: [number, number] = [...preset.defaultSize];
    const position = findNextPosition(size, rooms);
    rooms.push({
      preset: preset.id,
      position,
      size,
      label: preset.label,
    });
  }

  // Ensure there's at least a general workspace
  if (rooms.length === 0) {
    rooms.push({
      preset: "workspace",
      position: [0, 0],
      size: [5, 4],
      label: "General",
    });
  }

  // Distribute agents round-robin across rooms
  const agentAssignments: Record<string, AgentAssignment> = {};
  for (let i = 0; i < agents.length; i++) {
    const room = rooms[i % rooms.length];
    const deskIndex = Math.floor(i / rooms.length) + 1;
    agentAssignments[agents[i]] = {
      desk: `${room.label.toLowerCase().replace(/\s+/g, "-")}-desk-${deskIndex}`,
      allowedRooms: [],
      energy: 0.5,
    };
  }

  return { rooms, agents: agentAssignments };
}
