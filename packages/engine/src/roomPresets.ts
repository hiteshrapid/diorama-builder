export interface FurnitureItem {
  geometry: "box" | "cylinder" | "sphere" | "plane";
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  material: {
    color: string;
    emissive?: string;
    wireframe?: boolean;
    opacity?: number;
  };
}

export interface RoomPreset {
  id: string;
  label: string;
  defaultSize: [number, number];
  furnitureByTheme: Record<string, FurnitureItem[]>;
}

// Theme IDs matching the 4 themes in plugins/themes
const THEME_IDS = ["neon-dark", "warm-office", "cyberpunk", "minimal"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

// ---------- Meeting Room ----------
const meetingFurniture: Record<string, FurnitureItem[]> = {
  "neon-dark": [
    { geometry: "box", size: [2.4, 0.08, 1.2], position: [0, 0.75, 0], material: { color: "#1a2a40", emissive: "#8090c0" } },
    ...chairRing(6, 1.4, 0.7, { color: "#2a3a55", emissive: "#8090c0" }),
  ],
  "warm-office": [
    { geometry: "box", size: [2.4, 0.1, 1.2], position: [0, 0.74, 0], material: { color: "#8b6b4a" } },
    ...chairRing(6, 1.4, 0.7, { color: "#5a4030" }),
  ],
  cyberpunk: [
    { geometry: "box", size: [2.4, 0.06, 1.2], position: [0, 0.76, 0], material: { color: "#1a0025", emissive: "#ff2d95" } },
    ...chairRing(6, 1.4, 0.7, { color: "#220033", wireframe: true }),
  ],
  minimal: [
    { geometry: "box", size: [2.4, 0.1, 1.2], position: [0, 0.74, 0], material: { color: "#e8e8e8" } },
    ...chairRing(6, 1.4, 0.7, { color: "#cccccc" }),
  ],
};

// ---------- Workspace ----------
const workspaceFurniture: Record<string, FurnitureItem[]> = {
  "neon-dark": [
    ...deskRow(3, { color: "#1a2a40", emissive: "#8090c0" }),
  ],
  "warm-office": [
    ...deskRow(3, { color: "#8b6b4a" }),
  ],
  cyberpunk: [
    ...deskRow(3, { color: "#1a0025", emissive: "#ff2d95" }),
  ],
  minimal: [
    ...deskRow(3, { color: "#e0e0e0" }),
  ],
};

// ---------- Private ----------
const privateFurniture: Record<string, FurnitureItem[]> = {
  "neon-dark": [
    { geometry: "box", size: [1.0, 0.08, 0.6], position: [0, 0.75, 0], material: { color: "#1a2a40", emissive: "#8090c0" } },
    { geometry: "cylinder", size: [0.2, 0.7, 0.2], position: [0, 0.35, -0.5], material: { color: "#2a3a55" } },
  ],
  "warm-office": [
    { geometry: "box", size: [1.0, 0.08, 0.6], position: [0, 0.75, 0], material: { color: "#8b6b4a" } },
    { geometry: "cylinder", size: [0.2, 0.7, 0.2], position: [0, 0.35, -0.5], material: { color: "#5a4030" } },
  ],
  cyberpunk: [
    { geometry: "box", size: [1.0, 0.06, 0.6], position: [0, 0.76, 0], material: { color: "#1a0025", emissive: "#ff2d95" } },
    { geometry: "cylinder", size: [0.25, 0.8, 0.25], position: [0, 0.4, -0.5], material: { color: "#220033", wireframe: true } },
  ],
  minimal: [
    { geometry: "box", size: [1.0, 0.08, 0.6], position: [0, 0.75, 0], material: { color: "#e8e8e8" } },
    { geometry: "cylinder", size: [0.2, 0.7, 0.2], position: [0, 0.35, -0.5], material: { color: "#cccccc" } },
  ],
};

// ---------- Social ----------
const socialFurniture: Record<string, FurnitureItem[]> = {
  "neon-dark": [
    { geometry: "box", size: [1.6, 0.4, 0.7], position: [-0.5, 0.2, 0], material: { color: "#2a3a55", emissive: "#8090c0" } },
    { geometry: "box", size: [0.6, 0.35, 0.6], position: [0.8, 0.18, 0], material: { color: "#1a2a40" } },
  ],
  "warm-office": [
    { geometry: "box", size: [1.6, 0.45, 0.7], position: [-0.5, 0.22, 0], material: { color: "#7a5a3a" } },
    { geometry: "cylinder", size: [0.3, 0.4, 0.3], position: [0.8, 0.2, 0], material: { color: "#8b6b4a" } },
  ],
  cyberpunk: [
    { geometry: "box", size: [1.6, 0.35, 0.7], position: [-0.5, 0.18, 0], material: { color: "#220033", emissive: "#ff2d95" } },
    { geometry: "box", size: [0.8, 1.2, 0.1], position: [1.0, 0.6, -0.5], material: { color: "#1a0025", emissive: "#ff2d95" } },
  ],
  minimal: [
    { geometry: "box", size: [1.6, 0.4, 0.7], position: [-0.5, 0.2, 0], material: { color: "#d0d0d0" } },
    { geometry: "sphere", size: [0.3, 0.3, 0.3], position: [0.8, 0.3, 0], material: { color: "#e8e8e8" } },
  ],
};

// ---------- Lab ----------
const labFurniture: Record<string, FurnitureItem[]> = {
  "neon-dark": [
    { geometry: "box", size: [2.0, 0.08, 0.8], position: [0, 0.9, -0.8], material: { color: "#1a2a40", emissive: "#8090c0" } },
    { geometry: "plane", size: [1.8, 1.2, 1], position: [0, 1.4, -1.3], material: { color: "#8090c0", emissive: "#8090c0", opacity: 0.3 } },
  ],
  "warm-office": [
    { geometry: "box", size: [2.0, 0.08, 0.8], position: [0, 0.9, -0.8], material: { color: "#8b6b4a" } },
    { geometry: "plane", size: [1.8, 1.2, 1], position: [0, 1.4, -1.3], material: { color: "#f5f0e8", opacity: 0.9 } },
  ],
  cyberpunk: [
    { geometry: "box", size: [2.0, 0.06, 0.8], position: [0, 0.9, -0.8], material: { color: "#1a0025", emissive: "#ff2d95" } },
    { geometry: "plane", size: [1.8, 1.2, 1], position: [0, 1.4, -1.3], material: { color: "#ff2d95", emissive: "#ff2d95", opacity: 0.2 } },
    { geometry: "plane", size: [0.8, 1.0, 1], position: [-1.2, 1.2, -1.0], material: { color: "#00ffaa", emissive: "#00ffaa", opacity: 0.15 } },
  ],
  minimal: [
    { geometry: "box", size: [2.0, 0.08, 0.8], position: [0, 0.9, -0.8], material: { color: "#e0e0e0" } },
    { geometry: "plane", size: [1.8, 1.2, 1], position: [0, 1.4, -1.3], material: { color: "#ffffff", opacity: 0.5 } },
  ],
};

// ---------- Helpers ----------

function chairRing(
  count: number,
  radiusX: number,
  radiusZ: number,
  mat: FurnitureItem["material"],
): FurnitureItem[] {
  const chairs: FurnitureItem[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    chairs.push({
      geometry: "cylinder",
      size: [0.2, 0.7, 0.2],
      position: [
        Math.round(Math.cos(angle) * radiusX * 100) / 100,
        0.35,
        Math.round(Math.sin(angle) * radiusZ * 100) / 100,
      ],
      material: mat,
    });
  }
  return chairs;
}

function deskRow(
  count: number,
  mat: FurnitureItem["material"],
): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const spacing = 1.8;
  const startX = -((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
    items.push({
      geometry: "box",
      size: [1.2, 0.08, 0.6],
      position: [x, 0.75, 0],
      material: mat,
    });
    items.push({
      geometry: "cylinder",
      size: [0.2, 0.7, 0.2],
      position: [x, 0.35, -0.5],
      material: { ...mat, emissive: undefined },
    });
  }
  return items;
}

// ---------- Presets ----------

export const ROOM_PRESETS: RoomPreset[] = [
  {
    id: "meeting",
    label: "Meeting Room",
    defaultSize: [4, 3],
    furnitureByTheme: meetingFurniture,
  },
  {
    id: "workspace",
    label: "Workspace",
    defaultSize: [5, 4],
    furnitureByTheme: workspaceFurniture,
  },
  {
    id: "private",
    label: "Private Office",
    defaultSize: [2, 2],
    furnitureByTheme: privateFurniture,
  },
  {
    id: "social",
    label: "Social Lounge",
    defaultSize: [3, 3],
    furnitureByTheme: socialFurniture,
  },
  {
    id: "lab",
    label: "Lab",
    defaultSize: [4, 4],
    furnitureByTheme: labFurniture,
  },
];

export function getPreset(id: string): RoomPreset | undefined {
  return ROOM_PRESETS.find((p) => p.id === id);
}

export function getFurniture(presetId: string, themeId: string): FurnitureItem[] {
  const preset = getPreset(presetId);
  if (!preset) return [];
  return preset.furnitureByTheme[themeId] ?? preset.furnitureByTheme["neon-dark"] ?? [];
}
