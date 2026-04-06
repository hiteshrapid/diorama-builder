"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Room3D } from "../scene/Room3D";
import type { RoomConfig } from "@diorama/engine";
import {
  neonDarkTheme,
  warmOfficeTheme,
  cyberpunkTheme,
  minimalTheme,
} from "@diorama/plugins";

const THEMES: Record<string, { background: string; accent: string }> = {
  "neon-dark": neonDarkTheme.colors,
  "warm-office": warmOfficeTheme.colors,
  cyberpunk: cyberpunkTheme.colors,
  minimal: minimalTheme.colors,
};

interface BuildStep3DProps {
  rooms: RoomConfig[];
  theme: string;
  selectedRoomIndex: number | null;
  onSelectRoom: (index: number | null) => void;
}

export function BuildStep3D({ rooms, theme, selectedRoomIndex, onSelectRoom }: BuildStep3DProps) {
  const colors = THEMES[theme] ?? THEMES["neon-dark"];

  return (
    <Canvas
      camera={{ position: [0, 20, 15], fov: 50 }}
      style={{ background: colors.background }}
      onPointerMissed={() => onSelectRoom(null)}
    >
      <ambientLight intensity={0.4} color={colors.accent} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />

      {/* Grid helper */}
      <gridHelper args={[40, 40, "#1a2535", "#111825"]} position={[0, -0.01, 0]} />

      {rooms.map((room, i) => (
        <Room3D
          key={`${room.preset}-${room.position[0]}-${room.position[1]}`}
          room={room}
          accentColor={colors.accent}
          floorColor={colors.background}
          themeId={theme}
          selected={selectedRoomIndex === i}
          onClick={() => onSelectRoom(i)}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={50}
      />
    </Canvas>
  );
}
