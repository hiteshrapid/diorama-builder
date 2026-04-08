"use client";

import { FLOOR_STYLES, FLOOR_STYLE_LABELS, type FloorStyle } from "@diorama/engine";

interface FloorStylePickerProps {
  value: FloorStyle | undefined;     // undefined = using preset default
  presetDefault: FloorStyle;         // what the preset+theme uses
  onChange: (style: FloorStyle | undefined) => void;
}

const STYLE_ICONS: Record<FloorStyle, string> = {
  "solid":       "■",
  "grid-tiles":  "▦",
  "wood-planks": "≡",
  "hex-tiles":   "⬡",
  "carpet":      "░",
};

export function FloorStylePicker({ value, presetDefault, onChange }: FloorStylePickerProps) {
  const active = value ?? presetDefault;
  const hasOverride = value !== undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h5 style={{ margin: 0, fontSize: 12, color: "#999" }}>Floor Style</h5>
        {hasOverride && (
          <button
            onClick={() => onChange(undefined)}
            style={{
              background: "transparent",
              border: "none",
              color: "#8090c0",
              fontSize: 10,
              cursor: "pointer",
              padding: 0,
            }}
          >
            reset
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {FLOOR_STYLES.map((style) => {
          const isActive = style === active;
          const isOverride = style === value;
          return (
            <button
              key={style}
              title={FLOOR_STYLE_LABELS[style]}
              onClick={() => onChange(style === presetDefault ? undefined : style)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 2px",
                background: isActive ? "#1a3520" : "#1a2535",
                border: isActive
                  ? `1px solid ${isOverride ? "#8090c0" : "#48bb78"}`
                  : "1px solid #2a3545",
                borderRadius: 6,
                color: isActive ? "#e0e0e0" : "#666",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <span>{STYLE_ICONS[style]}</span>
              <span style={{ fontSize: 9 }}>{FLOOR_STYLE_LABELS[style]}</span>
            </button>
          );
        })}
      </div>

      {!hasOverride && (
        <p style={{ margin: 0, fontSize: 10, color: "#555" }}>
          Using preset default ({FLOOR_STYLE_LABELS[presetDefault]})
        </p>
      )}
    </div>
  );
}
