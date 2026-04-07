"use client";

import { useState } from "react";

interface CustomRoomFormProps {
  onAdd: (name: string, width: number, height: number) => void;
  onCancel: () => void;
}

/**
 * Inline form for creating a blank custom room.
 * User sets a name and width/height (1–10 grid units).
 */
export function CustomRoomForm({ onAdd, onCancel }: CustomRoomFormProps) {
  const [name, setName] = useState("");
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(4);

  const canSubmit = name.trim().length > 0 && width >= 1 && height >= 1;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAdd(name.trim(), width, height);
  };

  return (
    <div style={{
      padding: 12,
      background: "#111d2e",
      borderRadius: 8,
      border: "1px solid #2a3545",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <h5 style={{ margin: 0, fontSize: 12, color: "#8090c0" }}>New Custom Room</h5>

      {/* Name */}
      <input
        type="text"
        placeholder="Room name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus
        style={{
          padding: "8px 10px",
          background: "#0d1520",
          border: "1px solid #2a3545",
          borderRadius: 6,
          color: "#e0e0e0",
          fontSize: 13,
          outline: "none",
        }}
      />

      {/* Size spinners */}
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1 }}>
          <span style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Width</span>
          <input
            type="number"
            min={1}
            max={10}
            value={width}
            onChange={(e) => setWidth(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "#0d1520",
              border: "1px solid #2a3545",
              borderRadius: 6,
              color: "#e0e0e0",
              fontSize: 13,
              outline: "none",
            }}
          />
        </label>
        <label style={{ flex: 1 }}>
          <span style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Height</span>
          <input
            type="number"
            min={1}
            max={10}
            value={height}
            onChange={(e) => setHeight(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "#0d1520",
              border: "1px solid #2a3545",
              borderRadius: 6,
              color: "#e0e0e0",
              fontSize: 13,
              outline: "none",
            }}
          />
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "7px 0",
            background: "transparent",
            color: "#666",
            border: "1px solid #333",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            flex: 1,
            padding: "7px 0",
            background: canSubmit ? "#8090c0" : "#333",
            color: canSubmit ? "#fff" : "#666",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: canSubmit ? "pointer" : "default",
          }}
        >
          Add Room
        </button>
      </div>
    </div>
  );
}
