"use client";

import type { AlignmentGuide } from "../../hooks/useAlignmentDetection";

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

const GUIDE_SPAN = 80; // world units — spans the whole scene

/**
 * Renders colored guide lines in the 3D scene when a room's edge/center
 * aligns with another room during drag or resize.
 * Edge alignment → red, center alignment → blue.
 */
export function AlignmentGuides({ guides }: AlignmentGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <group>
      {guides.map((guide, i) => {
        const color = guide.type === "edge" ? "#e53e3e" : "#3b82f6";
        // X-axis guide: runs along X (spans width), positioned at fixed Z coord
        // Z-axis guide: runs along Z (spans depth), positioned at fixed X coord
        const isX = guide.axis === "x";
        const pos: [number, number, number] = isX
          ? [guide.worldCoord, 0.09, 0]
          : [0, 0.09, guide.worldCoord];
        const size: [number, number, number] = isX
          ? [0.05, 0.02, GUIDE_SPAN]
          : [GUIDE_SPAN, 0.02, 0.05];

        return (
          <mesh key={i} position={pos}>
            <boxGeometry args={size} />
            <meshBasicMaterial color={color} transparent opacity={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}
