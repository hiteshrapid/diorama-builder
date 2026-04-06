import type { ThemePlugin, SceneConfig } from "@diorama/engine";

export const neonDarkTheme: ThemePlugin = {
  kind: "theme",
  type: "neon-dark",
  colors: { background: "#0e1520", accent: "#8090c0" },
};

export const warmOfficeTheme: ThemePlugin = {
  kind: "theme",
  type: "warm-office",
  colors: { background: "#2a2420", accent: "#d4a574" },
};

export const minimalTheme: ThemePlugin = {
  kind: "theme",
  type: "minimal",
  colors: { background: "#f5f5f5", accent: "#666666" },
};

export const cyberpunkTheme: ThemePlugin = {
  kind: "theme",
  type: "cyberpunk",
  colors: { background: "#0a0012", accent: "#ff2d95" },
};

export function applyTheme(config: SceneConfig, theme: ThemePlugin): SceneConfig {
  return {
    ...config,
    background: theme.colors.background,
    ambientLight: { ...config.ambientLight, color: theme.colors.accent },
    fog: { ...config.fog, color: theme.colors.background },
  };
}
