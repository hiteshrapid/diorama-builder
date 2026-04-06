export interface CameraConfig {
  position: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

export interface LightConfig {
  position: [number, number, number];
  color: string;
  intensity: number;
}

export interface FogConfig {
  color: string;
  near: number;
  far: number;
}

export interface SceneConfig {
  camera: CameraConfig;
  ambientLight: { color: string; intensity: number };
  directionalLights: LightConfig[];
  fog: FogConfig;
  background: string;
}

const DEFAULTS: SceneConfig = {
  camera: { position: [0, 32, 16], fov: 50, near: 0.1, far: 100 },
  ambientLight: { color: "#8090c0", intensity: 0.4 },
  directionalLights: [
    { position: [10, 20, 10], color: "#ffffff", intensity: 0.6 },
    { position: [-8, 15, -5], color: "#c0d0ff", intensity: 0.3 },
    { position: [0, 10, -15], color: "#ffe0c0", intensity: 0.2 },
  ],
  fog: { color: "#0e1520", near: 55, far: 90 },
  background: "#0e1520",
};

export function createSceneConfig(): SceneConfig {
  return structuredClone(DEFAULTS);
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function mergeSceneConfig(
  overrides: DeepPartial<SceneConfig>
): SceneConfig {
  const base = createSceneConfig();

  if (overrides.camera) {
    if (overrides.camera.position) base.camera.position = overrides.camera.position as [number, number, number];
    if (overrides.camera.fov !== undefined) base.camera.fov = overrides.camera.fov;
    if (overrides.camera.near !== undefined) base.camera.near = overrides.camera.near;
    if (overrides.camera.far !== undefined) base.camera.far = overrides.camera.far;
  }

  if (overrides.ambientLight) {
    if (overrides.ambientLight.color) base.ambientLight.color = overrides.ambientLight.color;
    if (overrides.ambientLight.intensity !== undefined)
      base.ambientLight.intensity = overrides.ambientLight.intensity;
  }

  if (overrides.directionalLights) {
    base.directionalLights = overrides.directionalLights as LightConfig[];
  }

  if (overrides.fog) {
    if (overrides.fog.color) base.fog.color = overrides.fog.color;
    if (overrides.fog.near !== undefined) base.fog.near = overrides.fog.near;
    if (overrides.fog.far !== undefined) base.fog.far = overrides.fog.far;
  }

  if (overrides.background) base.background = overrides.background;

  return base;
}
