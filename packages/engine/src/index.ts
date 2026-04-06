// Config
export { parseConfig, DioramaConfigError } from "./config";
export type { DioramaConfig, RoomConfig, AgentAssignment } from "./config";

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
