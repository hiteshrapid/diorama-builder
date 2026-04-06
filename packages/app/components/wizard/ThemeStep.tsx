"use client";

import { useState } from "react";

const THEMES = [
  { type: "neon-dark", label: "Sci-Fi", bg: "#0e1520", accent: "#8090c0", desc: "Dark with neon glows" },
  { type: "warm-office", label: "Modern Office", bg: "#2a2420", accent: "#d4a574", desc: "Warm beige and wood tones" },
  { type: "cyberpunk", label: "Cyberpunk", bg: "#0a0012", accent: "#ff2d95", desc: "Dark with magenta neon" },
  { type: "minimal", label: "Minimal", bg: "#f5f5f5", accent: "#666666", desc: "Clean and light" },
];

interface ThemeStepProps {
  onNext: (theme: string) => void;
  onBack?: () => void;
  compact?: boolean;
}

export function ThemeStep({ onNext, onBack, compact }: ThemeStepProps) {
  const [selected, setSelected] = useState("neon-dark");

  if (compact) {
    return (
      <div>
        <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#999" }}>Theme</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {THEMES.map((theme) => (
            <button
              key={theme.type}
              onClick={() => {
                setSelected(theme.type);
                onNext(theme.type);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: theme.bg,
                border: selected === theme.type ? `2px solid ${theme.accent}` : "2px solid #2a3545",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 3, background: theme.accent, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: theme.type === "minimal" ? "#333" : "#e0e0e0" }}>
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h2>Choose a Theme</h2>
      <p style={{ color: "#999", marginBottom: 24 }}>
        This sets the visual style of your 3D workspace.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {THEMES.map((theme) => (
          <button
            key={theme.type}
            onClick={() => setSelected(theme.type)}
            style={{
              padding: 16,
              background: theme.bg,
              border: selected === theme.type ? `2px solid ${theme.accent}` : "2px solid #333",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: theme.accent }} />
              <span style={{ fontWeight: 600, color: theme.type === "minimal" ? "#333" : "#e0e0e0" }}>
                {theme.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: theme.type === "minimal" ? "#666" : "#999" }}>
              {theme.desc}
            </p>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        {onBack && <button onClick={onBack} style={buttonSecondary}>Back</button>}
        <button onClick={() => onNext(selected)} style={buttonPrimary}>
          Next
        </button>
      </div>
    </div>
  );
}

const buttonPrimary: React.CSSProperties = {
  padding: "10px 24px",
  background: "#8090c0",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const buttonSecondary: React.CSSProperties = {
  padding: "10px 24px",
  background: "transparent",
  color: "#8090c0",
  border: "1px solid #8090c0",
  borderRadius: 6,
  fontSize: 14,
  cursor: "pointer",
};
