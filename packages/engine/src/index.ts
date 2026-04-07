// Config
export { parseConfig, DioramaConfigError } from "./config";
export type { DioramaConfig, RoomConfig, RoomColors, AgentAssignment } from "./config";

// Plugins
export {
  PluginRegistry,
  DuplicatePluginError,
  PluginNotFoundError,
} from "./plugins";
export type {
  BasePlugin,
  RoomPlugin,
  ViewPlugin,
  SourcePlugin,
  ThemePlugin,
  DioramaPlugin,
} from "./plugins";

// Geometry
export { toWorld, toCanvas, createCoordinateSystem } from "./geometry";
export type { CoordinateSystem } from "./geometry";

// Event Bus
export { EventBus } from "./eventBus";
export type { DioramaEvent, EventFilter } from "./eventBus";

// Room Primitives
export { generateFloor, generateWalls, generateDoor } from "./roomPrimitives";
export type {
  RoomRect,
  DoorConfig,
  FloorGeometry,
  WallSegment,
  DoorGeometry,
} from "./roomPrimitives";

// Agent State
export {
  createAgentState,
  updateAgentState,
  computeIdlePose,
} from "./agentState";
export type { AgentState, AgentMode, AgentAction, IdlePose } from "./agentState";

// Scene Config
export { createSceneConfig, mergeSceneConfig } from "./sceneConfig";
export type { SceneConfig, CameraConfig, LightConfig, FogConfig } from "./sceneConfig";

// Auto Layout
export { generateAutoLayout, findNextPosition } from "./autoLayout";
export type { AutoLayoutResult } from "./autoLayout";

// Room Presets
export { ROOM_PRESETS, getPreset, getFurniture } from "./roomPresets";
export type { RoomPreset, FurnitureItem, ThemeId } from "./roomPresets";

// Furniture Catalog
export {
  FURNITURE_CATALOG,
  getCatalogByCategory,
  getCatalogItem,
  catalogItemToFurniture,
} from "./furnitureCatalog";
export type { CatalogItem, FurnitureCategory } from "./furnitureCatalog";
