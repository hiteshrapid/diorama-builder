"use client";

import * as THREE from "three";
import type { FurnitureItem } from "@diorama/engine";
import { GLBFurniture } from "./GLBFurniture";

interface RoomFurniture3DProps {
  items: FurnitureItem[];
  roomCenter: [number, number, number];
}

export function RoomFurniture3D({ items, roomCenter }: RoomFurniture3DProps) {
  return (
    <group position={roomCenter}>
      {items.map((item, i) => (
        <FurnitureMesh key={i} item={item} />
      ))}
    </group>
  );
}

function FurnitureMesh({ item }: { item: FurnitureItem }) {
  const pos = item.position as [number, number, number];
  const rot = item.rotation as [number, number, number] | undefined;

  // Prefer real GLB model when available
  if (item.glbPath) {
    return (
      <GLBFurniture
        path={item.glbPath}
        position={pos}
        rotation={rot}
        scale={item.glbScale ?? 1}
        fallbackSize={item.size}
      />
    );
  }

  return (
    <mesh position={pos} rotation={rot}>
      <GeometryForType type={item.geometry} size={item.size} />
      <meshStandardMaterial
        color={item.material.color}
        emissive={item.material.emissive ?? "#000000"}
        emissiveIntensity={item.material.emissive ? 0.4 : 0}
        wireframe={item.material.wireframe ?? false}
        transparent={item.material.opacity != null && item.material.opacity < 1}
        opacity={item.material.opacity ?? 1}
        side={item.geometry === "plane" ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

function GeometryForType({ type, size }: { type: FurnitureItem["geometry"]; size: [number, number, number] }) {
  switch (type) {
    case "box":
      return <boxGeometry args={size} />;
    case "cylinder":
      return <cylinderGeometry args={[size[0], size[0], size[1], 16]} />;
    case "sphere":
      return <sphereGeometry args={[size[0], 16, 16]} />;
    case "plane":
      return <planeGeometry args={[size[0], size[1]]} />;
    default:
      return <boxGeometry args={size} />;
  }
}
