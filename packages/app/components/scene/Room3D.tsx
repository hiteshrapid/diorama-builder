"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { generateFloor, generateWalls, getFurniture, type RoomConfig } from "@diorama/engine";
import { RoomFurniture3D } from "./RoomFurniture3D";

const GRID_UNIT = 200;
const WALL_OPACITY_GLASS = 0.15;

interface Room3DProps {
  room: RoomConfig;
  accentColor: string;
  floorColor: string;
  themeId: string;
  selected?: boolean;
  glowIntensity?: number;
  onClick?: () => void;
}

export function Room3D({ room, accentColor, floorColor, themeId, selected, glowIntensity = 0, onClick }: Room3DProps) {
  const { floor, walls } = useMemo(() => {
    const rect = {
      x: room.position[0] * GRID_UNIT,
      y: room.position[1] * GRID_UNIT,
      w: room.size[0] * GRID_UNIT,
      h: room.size[1] * GRID_UNIT,
      color: floorColor,
      glassWalls: true,
    };
    return {
      floor: generateFloor(rect),
      walls: generateWalls(rect, []),
    };
  }, [room.position, room.size, floorColor]);

  const furniture = useMemo(
    () => getFurniture(room.preset, themeId),
    [room.preset, themeId],
  );

  const roomCenter: [number, number, number] = [floor.position[0], 0, floor.position[2]];

  return (
    <group onClick={onClick}>
      {/* Floor */}
      <mesh position={floor.position} receiveShadow>
        <boxGeometry args={[floor.width, 0.05, floor.depth]} />
        <meshStandardMaterial color={floor.color} roughness={0.8} />
      </mesh>

      {/* Selection highlight */}
      {selected && (
        <mesh position={[floor.position[0], 0.06, floor.position[2]]}>
          <boxGeometry args={[floor.width + 0.02, 0.01, floor.depth + 0.02]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Activity glow */}
      {glowIntensity > 0 && (
        <mesh position={[floor.position[0], 0.08, floor.position[2]]}>
          <boxGeometry args={[floor.width, 0.01, floor.depth]} />
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
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
            color={accentColor}
            transparent={wall.glass}
            opacity={wall.glass ? WALL_OPACITY_GLASS : 1}
            emissive={accentColor}
            emissiveIntensity={wall.glass ? 0.2 : 0}
          />
        </mesh>
      ))}

      {/* Room label */}
      <Text
        position={[floor.position[0], 2.8, floor.position[2]]}
        fontSize={0.3}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
      >
        {room.label}
      </Text>

      {/* Neon edge glow */}
      <mesh position={[floor.position[0], 0.07, floor.position[2]]}>
        <boxGeometry args={[floor.width, 0.01, floor.depth]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
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
