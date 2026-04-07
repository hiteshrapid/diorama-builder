"use client";

import { useMemo, useCallback } from "react";
import { Html } from "@react-three/drei";
import { generateFloor, generateWalls, getFurniture, type RoomConfig } from "@diorama/engine";
import { RoomFurniture3D } from "./RoomFurniture3D";
import type { ThreeEvent } from "@react-three/fiber";

const GRID_UNIT = 200;
const WALL_OPACITY_GLASS = 0.15;

interface Room3DProps {
  room: RoomConfig;
  accentColor: string;
  floorColor: string;
  themeId: string;
  selected?: boolean;
  glowIntensity?: number;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: () => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
}

export function Room3D({ room, accentColor, floorColor, themeId, selected, glowIntensity = 0, onPointerDown, onPointerUp, onPointerMove }: Room3DProps) {
  // Resolve effective colors: per-room overrides > theme defaults
  const effectiveAccent = room.colors?.accent ?? accentColor;
  const effectiveFloor = room.colors?.floor ?? floorColor;
  const effectiveWall = room.colors?.wall ?? accentColor;

  const { floor, walls } = useMemo(() => {
    const rect = {
      x: room.position[0] * GRID_UNIT,
      y: room.position[1] * GRID_UNIT,
      w: room.size[0] * GRID_UNIT,
      h: room.size[1] * GRID_UNIT,
      color: effectiveFloor,
      glassWalls: true,
    };
    return {
      floor: generateFloor(rect),
      walls: generateWalls(rect, []),
    };
  }, [room.position, room.size, effectiveFloor]);

  // If room has custom furniture, use it; otherwise fall back to preset defaults
  const furniture = useMemo(
    () => (room.furniture && room.furniture.length > 0) ? room.furniture : getFurniture(room.preset, themeId),
    [room.furniture, room.preset, themeId],
  );

  const roomCenter: [number, number, number] = [floor.position[0], 0, floor.position[2]];

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerDown?.(e);
  }, [onPointerDown]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerUp?.();
  }, [onPointerUp]);

  return (
    <group
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={onPointerMove}
    >
      {/* Floor */}
      <mesh position={floor.position} receiveShadow>
        <boxGeometry args={[floor.width, 0.05, floor.depth]} />
        <meshStandardMaterial color={floor.color} roughness={0.8} />
      </mesh>

      {/* Selection highlight */}
      {selected && (
        <mesh position={[floor.position[0], 0.06, floor.position[2]]}>
          <boxGeometry args={[floor.width + 0.02, 0.01, floor.depth + 0.02]} />
          <meshStandardMaterial color={effectiveAccent} emissive={effectiveAccent} emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Activity glow */}
      {glowIntensity > 0 && (
        <mesh position={[floor.position[0], 0.08, floor.position[2]]}>
          <boxGeometry args={[floor.width, 0.01, floor.depth]} />
          <meshStandardMaterial
            color={effectiveAccent}
            emissive={effectiveAccent}
            emissiveIntensity={glowIntensity}
            transparent
            opacity={0.3 * glowIntensity}
          />
        </mesh>
      )}

      {/* Walls */}
      {walls.map((wall, i) => (
        <mesh key={i} position={wall.position} rotation={[0, wall.rotation, 0]}>
          <boxGeometry args={[wall.width, wall.height, 0.04]} />
          <meshStandardMaterial
            color={effectiveWall}
            transparent={wall.glass}
            opacity={wall.glass ? WALL_OPACITY_GLASS : 1}
            emissive={effectiveWall}
            emissiveIntensity={wall.glass ? 0.2 : 0}
          />
        </mesh>
      ))}

      {/* Room label */}
      <Html
        position={[floor.position[0], 2.8, floor.position[2]]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none" }}
      >
        <div style={{
          color: effectiveAccent,
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: "nowrap",
          textShadow: "0 0 8px rgba(0,0,0,0.8)",
          userSelect: "none",
        }}>
          {room.label}
        </div>
      </Html>

      {/* Neon edge glow */}
      <mesh position={[floor.position[0], 0.07, floor.position[2]]}>
        <boxGeometry args={[floor.width, 0.01, floor.depth]} />
        <meshStandardMaterial
          color={effectiveAccent}
          emissive={effectiveAccent}
          emissiveIntensity={0.3}
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Furniture */}
      <RoomFurniture3D items={furniture} roomCenter={roomCenter} />
    </group>
  );
}
