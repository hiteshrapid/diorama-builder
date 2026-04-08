"use client";

import { useMemo, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface GLBFurnitureProps {
  path: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

function GLBMesh({ path, position, rotation, scale = 1 }: GLBFurnitureProps) {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => {
    const c = scene.clone(true);
    // Ensure shadow casting on all meshes
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <primitive
      object={clone}
      position={position}
      rotation={rotation ?? [0, 0, 0]}
      scale={scale}
    />
  );
}

/** Primitive box fallback rendered while the GLB is loading */
function GLBFallback({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={[position[0], size[1] / 2, position[2]]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#1a2535" transparent opacity={0.5} />
    </mesh>
  );
}

interface GLBFurnitureWithFallbackProps extends GLBFurnitureProps {
  fallbackSize?: [number, number, number];
}

export function GLBFurniture({ path, position, rotation, scale, fallbackSize = [0.5, 0.8, 0.5] }: GLBFurnitureWithFallbackProps) {
  return (
    <Suspense fallback={<GLBFallback position={position} size={fallbackSize} />}>
      <GLBMesh path={path} position={position} rotation={rotation} scale={scale} />
    </Suspense>
  );
}
