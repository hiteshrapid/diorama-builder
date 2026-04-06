"use client";

import { ROOM_PRESETS } from "@diorama/engine";

const PRESET_ICONS: Record<string, string> = {
  meeting: "M",
  workspace: "W",
  private: "P",
  social: "S",
  lab: "L",
};

interface PresetPaletteProps {
  onAdd: (presetId: string) => void;
}

export function PresetPalette({ onAdd }: PresetPaletteProps) {
  return (
    <div>
      <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#999" }}>Room Presets</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ROOM_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onAdd(preset.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              background: "#1a2535",
              border: "1px solid #2a3545",
              borderRadius: 8,
              color: "#e0e0e0",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#8090c0")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a3545")}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#0d1520",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "#8090c0",
            }}>
              {PRESET_ICONS[preset.id] ?? "?"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{preset.label}</div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {preset.defaultSize[0]}x{preset.defaultSize[1]}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
