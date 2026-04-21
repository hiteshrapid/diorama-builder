/**
 * Design tokens for the Diorama builder UI.
 * Layered surfaces, reserved accent usage, clear type scale.
 */

export const colors = {
  // Layered dark surfaces
  bg0: "#0a1018",
  bg1: "#0f1620",
  bg2: "#1a2535",
  bg3: "#263143",

  // Borders
  border: "#1f2b3d",
  borderStrong: "#2e3b52",

  // Text
  text: "#e6ebf5",
  textDim: "#8899b0",
  textFaint: "#5a6a80",

  // Accent (reserved for primary CTAs and strong emphasis)
  accent: "#5b8def",
  accentHover: "#7aa3ff",
  accentText: "#ffffff",

  // Secondary accents for status
  success: "#4ade80",
  warn: "#fbbf24",
  danger: "#f87171",
} as const;

export const fonts = {
  sans: "var(--font-inter), system-ui, -apple-system, sans-serif",
  mono: "var(--font-mono), 'SF Mono', 'Fira Code', monospace",
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 10,
  pill: 9999,
} as const;

export const shadows = {
  card: "0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)",
  elevated: "0 4px 8px rgba(0,0,0,0.4), 0 16px 32px rgba(0,0,0,0.3)",
} as const;
