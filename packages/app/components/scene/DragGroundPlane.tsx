"use client";

import type { ThreeEvent } from "@react-three/fiber";

interface DragGroundPlaneProps {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: () => void;
}

/**
 * An invisible ground-level mesh that captures pointer events
 * during room dragging. Sits just below the floor (y = -0.002)
 * so it doesn't intercept clicks on rooms, but catches any
 * pointer movement over empty space.
 */
export function DragGroundPlane({ onPointerMove, onPointerUp }: DragGroundPlaneProps) {
  return (
    <mesh
      position={[0, -0.002, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
