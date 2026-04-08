export type FurnitureCategory = "seating" | "surfaces" | "tech" | "decor";

export interface CatalogItem {
  id: string;
  label: string;
  category: FurnitureCategory;
  geometry: "box" | "cylinder" | "sphere" | "plane";
  defaultSize: [number, number, number];
  /** Override Y placement position (centre of item). Defaults to defaultSize[1]/2 (sits on floor). */
  defaultY?: number;
  /** Override rotation applied on placement (radians). Needed for plane geometry items like rugs. */
  defaultRotation?: [number, number, number];
  defaultMaterial: {
    color: string;
    emissive?: string;
    wireframe?: boolean;
    opacity?: number;
  };
  /** Path to GLB model served from /public. When present, used instead of procedural geometry. */
  glbPath?: string;
  /** Uniform scale for the GLB model (default 1). */
  glbScale?: number;
}

const KF = "/models/kenney-furniture/"; // shorthand

/**
 * 20 furniture items across 4 categories.
 * Sizes are in 3D world units (approximately real-world at 1 unit ≈ 1 metre).
 */
export const FURNITURE_CATALOG: CatalogItem[] = [
  // ── Seating ──
  { id: "chair", label: "Chair", category: "seating", geometry: "box", defaultSize: [0.35, 0.6, 0.35], defaultMaterial: { color: "#4a5568" }, glbPath: `${KF}chair.glb`, glbScale: 1.0 },
  { id: "office-chair", label: "Office Chair", category: "seating", geometry: "cylinder", defaultSize: [0.3, 0.7, 0.3], defaultMaterial: { color: "#2d3748" }, glbPath: `${KF}chairDesk.glb`, glbScale: 1.0 },
  { id: "stool", label: "Stool", category: "seating", geometry: "cylinder", defaultSize: [0.25, 0.5, 0.25], defaultMaterial: { color: "#718096" }, glbPath: `${KF}stoolBar.glb`, glbScale: 1.0 },
  { id: "couch", label: "Couch", category: "seating", geometry: "box", defaultSize: [1.2, 0.5, 0.5], defaultMaterial: { color: "#553c9a" }, glbPath: `${KF}loungeSofa.glb`, glbScale: 1.0 },
  { id: "bean-bag", label: "Lounge Chair", category: "seating", geometry: "sphere", defaultSize: [0.4, 0.35, 0.4], defaultMaterial: { color: "#9f7aea" }, glbPath: `${KF}loungeChair.glb`, glbScale: 1.0 },

  // ── Surfaces ──
  { id: "desk", label: "Desk", category: "surfaces", geometry: "box", defaultSize: [1.0, 0.04, 0.55], defaultY: 0, defaultMaterial: { color: "#8b6914" }, glbPath: `${KF}desk.glb`, glbScale: 1.0 },
  { id: "table", label: "Table", category: "surfaces", geometry: "box", defaultSize: [1.2, 0.04, 0.8], defaultY: 0, defaultMaterial: { color: "#6b4f1d" }, glbPath: `${KF}table.glb`, glbScale: 1.0 },
  { id: "standing-desk", label: "Corner Desk", category: "surfaces", geometry: "box", defaultSize: [1.0, 0.04, 0.5], defaultY: 0, defaultMaterial: { color: "#4a5568" }, glbPath: `${KF}deskCorner.glb`, glbScale: 1.0 },
  { id: "coffee-table", label: "Coffee Table", category: "surfaces", geometry: "box", defaultSize: [0.8, 0.04, 0.5], defaultY: 0, defaultMaterial: { color: "#744210" }, glbPath: `${KF}tableCoffee.glb`, glbScale: 1.0 },
  { id: "bookshelf", label: "Bookshelf", category: "surfaces", geometry: "box", defaultSize: [0.8, 1.4, 0.3], defaultY: 0, defaultMaterial: { color: "#5a3e1b" }, glbPath: `${KF}bookcaseOpen.glb`, glbScale: 1.0 },

  // ── Tech ──
  { id: "monitor", label: "Monitor", category: "tech", geometry: "box", defaultSize: [0.5, 0.35, 0.05], defaultMaterial: { color: "#1a202c", emissive: "#4299e1" }, glbPath: `${KF}computerScreen.glb`, glbScale: 1.0 },
  { id: "server-rack", label: "Server Rack", category: "tech", geometry: "box", defaultSize: [0.6, 1.8, 0.8], defaultMaterial: { color: "#2d3748", emissive: "#48bb78" } },
  { id: "whiteboard", label: "Whiteboard", category: "tech", geometry: "box", defaultSize: [1.2, 0.9, 0.05], defaultMaterial: { color: "#f7fafc" } },
  { id: "display-screen", label: "Display Screen", category: "tech", geometry: "box", defaultSize: [1.6, 0.9, 0.06], defaultMaterial: { color: "#0a0a0a", emissive: "#805ad5" } },
  { id: "laptop", label: "Laptop", category: "tech", geometry: "box", defaultSize: [0.35, 0.02, 0.25], defaultMaterial: { color: "#a0aec0", emissive: "#63b3ed" }, glbPath: `${KF}laptop.glb`, glbScale: 1.0 },

  // ── Decor ──
  { id: "plant", label: "Plant", category: "decor", geometry: "cylinder", defaultSize: [0.2, 0.6, 0.2], defaultMaterial: { color: "#38a169" }, glbPath: `${KF}pottedPlant.glb`, glbScale: 1.0 },
  { id: "lamp", label: "Lamp", category: "decor", geometry: "cylinder", defaultSize: [0.15, 0.5, 0.15], defaultMaterial: { color: "#ecc94b", emissive: "#ecc94b" }, glbPath: `${KF}lampSquareFloor.glb`, glbScale: 1.0 },
  { id: "rug", label: "Rug", category: "decor", geometry: "plane", defaultSize: [1.5, 1.0, 0.01], defaultY: 0.09, defaultRotation: [-Math.PI / 2, 0, 0], defaultMaterial: { color: "#b83280", opacity: 0.8 }, glbPath: `${KF}rugRectangle.glb`, glbScale: 1.0 },
  { id: "partition-wall", label: "Partition", category: "decor", geometry: "box", defaultSize: [1.5, 1.8, 0.08], defaultMaterial: { color: "#4a5568", opacity: 0.6 } },
  { id: "cabinet", label: "Cabinet", category: "decor", geometry: "box", defaultSize: [0.8, 1.0, 0.4], defaultMaterial: { color: "#5a3e1b" }, glbPath: `${KF}bookcaseClosed.glb`, glbScale: 1.0 },
];

/** Group catalog items by category */
export function getCatalogByCategory(): Record<FurnitureCategory, CatalogItem[]> {
  const result: Record<FurnitureCategory, CatalogItem[]> = {
    seating: [],
    surfaces: [],
    tech: [],
    decor: [],
  };
  for (const item of FURNITURE_CATALOG) {
    result[item.category].push(item);
  }
  return result;
}

/** Look up a catalog item by ID */
export function getCatalogItem(id: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find((item) => item.id === id);
}

/**
 * Convert a catalog item + click position into a FurnitureItem
 * ready to be stored in RoomPlacement.furniture.
 *
 * Uses item.defaultY for vertical placement (so surfaces appear at desk height)
 * and item.defaultRotation for items like rugs that need to lie flat.
 */
export function catalogItemToFurniture(
  item: CatalogItem,
  position: [number, number, number],
  /** Y of the surface that was clicked (world space). Used for items without a defaultY so they
   *  land on whatever surface the user clicked (e.g. desk top) rather than always on the floor. */
  surfaceY?: number,
): {
  geometry: CatalogItem["geometry"];
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
  material: CatalogItem["defaultMaterial"];
  glbPath?: string;
  glbScale?: number;
} {
  const y = item.defaultY ?? surfaceY ?? item.defaultSize[1] / 2;
  return {
    geometry: item.geometry,
    size: [...item.defaultSize],
    position: [position[0], y, position[2]],
    ...(item.defaultRotation && !item.glbPath ? { rotation: [...item.defaultRotation] } : {}),
    label: item.label,
    material: { ...item.defaultMaterial },
    ...(item.glbPath ? { glbPath: item.glbPath, glbScale: item.glbScale } : {}),
  };
}
