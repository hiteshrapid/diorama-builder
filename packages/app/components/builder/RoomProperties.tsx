"use client";

import type { RoomPlacement } from "../../../ui/src/builderStore";

interface RoomPropertiesProps {
  room: RoomPlacement;
  onUpdate: (updates: Partial<Pick<RoomPlacement, "label">>) => void;
  onResize: (size: [number, number]) => void;
  onRemove: () => void;
  onDeselect: () => void;
}

export function RoomProperties({ room, onUpdate, onResize, onRemove, onDeselect }: RoomPropertiesProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 13 }}>Room Properties</h4>
        <button
          onClick={onDeselect}
          style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}
        >
          x
        </button>
      </div>

      <label style={{ display: "block", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 4 }}>Label</span>
        <input
          type="text"
          value={room.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "#1a2030",
            border: "1px solid #333",
            borderRadius: 4,
            color: "#e0e0e0",
            fontSize: 13,
          }}
        />
      </label>

      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 4 }}>Preset</span>
        <span style={{ fontSize: 13 }}>{room.preset}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 4 }}>Position</span>
        <span style={{ fontSize: 13 }}>{room.position[0]}, {room.position[1]}</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "#999", display: "block", marginBottom: 4 }}>Size</span>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={1}
            max={10}
            value={room.size[0]}
            onChange={(e) => onResize([parseInt(e.target.value) || 1, room.size[1]])}
            style={numberInput}
          />
          <span style={{ color: "#666", alignSelf: "center" }}>x</span>
          <input
            type="number"
            min={1}
            max={10}
            value={room.size[1]}
            onChange={(e) => onResize([room.size[0], parseInt(e.target.value) || 1])}
            style={numberInput}
          />
        </div>
      </div>

      <button
        onClick={onRemove}
        style={{
          width: "100%",
          padding: "8px 0",
          marginTop: 16,
          background: "transparent",
          color: "#ff6b6b",
          border: "1px solid #ff6b6b33",
          borderRadius: 6,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Remove Room
      </button>
    </div>
  );
}

const numberInput: React.CSSProperties = {
  width: 60,
  padding: "6px 8px",
  background: "#1a2030",
  border: "1px solid #333",
  borderRadius: 4,
  color: "#e0e0e0",
  fontSize: 13,
  textAlign: "center",
};
