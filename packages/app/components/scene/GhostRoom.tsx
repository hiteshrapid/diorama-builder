"use client";

import { useMemo } from "react";
import { toWorld } from "@diorama/engine";

const GRID_UNIT = 200;
const SCALE = 0.018;

interface GhostRoomProps {
  position: [number, number]; // grid position (top-left)
  size: [number, number]; // grid size
  isValid: boolean;
}

/**
 * Translucent room-shaped overlay shown during drag.
 * Green = valid drop position, Red = overlapping another room.
 */
export function GhostRoom({ position, size, isValid }: GhostRoomProps) {
  const { worldPos, width, depth } = useMemo(() => {
    const centerCx = position[0] * GRID_UNIT + (size[0] * GRID_UNIT) / 2;
    const centerCy = position[1] * GRID_UNIT + (size[1] * GRID_UNIT) / 2;
    const [wx, , wz] = toWorld(centerCx, centerCy);
    return {
      worldPos: [wx, 0.1, wz] as [number, number, number],
      width: size[0] * GRID_UNIT * SCALE,
      depth: size[1] * GRID_UNIT * SCALE,
    };
  }, [position, size]);

  const color = isValid ? "#00ff88" : "#ff4444";

  return (
    <group>
      {/* Filled ghost floor */}
      <mesh position={worldPos}>
        <boxGeometry args={[width, 0.02, depth]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.25}
        />
      </mesh>
      {/* Bright edge outline */}
      <mesh position={[worldPos[0], 0.12, worldPos[2]]}>
        <boxGeometry args={[width + 0.04, 0.01, depth + 0.04]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}
