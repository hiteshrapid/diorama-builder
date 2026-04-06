const DEFAULT_CANVAS_W = 1800;
const DEFAULT_CANVAS_H = 1000;
const DEFAULT_SCALE = 0.018;

export interface CoordinateSystem {
  toWorld: (cx: number, cy: number) => [number, number, number];
  toCanvas: (wx: number, wz: number) => [number, number];
}

export function createCoordinateSystem(
  canvasW: number,
  canvasH: number,
  scale: number
): CoordinateSystem {
  const halfW = canvasW * scale * 0.5;
  const halfH = canvasH * scale * 0.5;

  return {
    toWorld(cx, cy) {
      return [cx * scale - halfW, 0, cy * scale - halfH];
    },
    toCanvas(wx, wz) {
      return [(wx + halfW) / scale, (wz + halfH) / scale];
    },
  };
}

const defaultSystem = createCoordinateSystem(
  DEFAULT_CANVAS_W,
  DEFAULT_CANVAS_H,
  DEFAULT_SCALE
);

export const toWorld = defaultSystem.toWorld;
export const toCanvas = defaultSystem.toCanvas;
