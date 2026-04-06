"use client";

const THEMES = [
  { type: "neon-dark", label: "Sci-Fi", bg: "#0e1520", accent: "#8090c0" },
  { type: "warm-office", label: "Modern Office", bg: "#2a2420", accent: "#d4a574" },
  { type: "cyberpunk", label: "Cyberpunk", bg: "#0a0012", accent: "#ff2d95" },
  { type: "minimal", label: "Minimal", bg: "#f5f5f5", accent: "#666666" },
];

interface ThemeSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#999" }}>
        Visual theme
      </p>
      {THEMES.map((theme) => (
        <button
          key={theme.type}
          onClick={() => onThemeChange(theme.type)}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 6,
            background: theme.bg,
            border: currentTheme === theme.type ? `2px solid ${theme.accent}` : "2px solid #1f2937",
            borderRadius: 6,
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 3, background: theme.accent }} />
          <span style={{ fontSize: 13, color: theme.type === "minimal" ? "#333" : "#e0e0e0" }}>
            {theme.label}
          </span>
        </button>
      ))}
    </div>
  );
}
