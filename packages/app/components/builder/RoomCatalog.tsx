"use client";

import { ROOM_PRESETS, findNextPosition } from "@diorama/engine";
import type { RoomPlacement } from "../../../ui/src/builderStore";

let nextId = Date.now();

interface RoomCatalogProps {
  onAdd: (room: RoomPlacement) => void;
  existingRooms?: RoomPlacement[];
}

export function RoomCatalog({ onAdd, existingRooms = [] }: RoomCatalogProps) {
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#999" }}>
        Click to add a room
      </p>
      {ROOM_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => {
            const size: [number, number] = [...preset.defaultSize];
            const existing = existingRooms.map((r) => ({ position: r.position, size: r.size }));
            const position = findNextPosition(size, existing);
            const room: RoomPlacement = {
              id: `${preset.id}-${++nextId}`,
              preset: preset.id,
              position,
              size,
              label: preset.label,
            };
            onAdd(room);
          }}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 6,
            background: "#1a2030",
            border: "1px solid #1f2937",
            borderRadius: 6,
            cursor: "pointer",
            textAlign: "left",
            color: "#e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{preset.label}</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
              {preset.defaultSize[0]}x{preset.defaultSize[1]}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
