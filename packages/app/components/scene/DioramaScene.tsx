"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { createSceneConfig } from "@diorama/engine";
import { applyTheme, neonDarkTheme, warmOfficeTheme, cyberpunkTheme, minimalTheme } from "@diorama/plugins";
import * as THREE from "three";

const THEMES: Record<string, typeof neonDarkTheme> = {
  "neon-dark": neonDarkTheme,
  "warm-office": warmOfficeTheme,
  "cyberpunk": cyberpunkTheme,
  "minimal": minimalTheme,
};

/** Syncs camera + OrbitControls to center on rooms */
function CameraSync({ center }: { center: [number, number, number] }) {
  const { camera, controls } = useThree();
  const prevCenter = useRef<string>("");

  useEffect(() => {
    const key = `${center[0].toFixed(2)},${center[2].toFixed(2)}`;
    if (key === prevCenter.current) return;
    prevCenter.current = key;

    camera.position.set(center[0], 20, center[2] + 15);
    camera.lookAt(center[0], 0, center[2]);
    camera.updateProjectionMatrix();

    if (controls) {
      const c = controls as unknown as { target: THREE.Vector3; update: () => void };
      c.target.set(center[0], 0, center[2]);
      c.update();
    }
  }, [center, camera, controls]);

  return null;
}

interface DioramaSceneProps {
  theme: string;
  center?: [number, number, number];
  children: React.ReactNode;
}

export function DioramaScene({ theme, center, children }: DioramaSceneProps) {
  const sceneConfig = useMemo(() => {
    const base = createSceneConfig();
    const themePlugin = THEMES[theme] ?? neonDarkTheme;
    return applyTheme(base, themePlugin);
  }, [theme]);

  const initPos = center
    ? [center[0], 20, center[2] + 15] as [number, number, number]
    : sceneConfig.camera.position;

  return (
    <Canvas
      camera={{
        position: initPos,
        fov: sceneConfig.camera.fov,
        near: sceneConfig.camera.near,
        far: sceneConfig.camera.far,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {center && <CameraSync center={center} />}
      <color attach="background" args={[sceneConfig.background]} />
      <fog attach="fog" args={[sceneConfig.fog.color, sceneConfig.fog.near, sceneConfig.fog.far]} />
      <ambientLight color={sceneConfig.ambientLight.color} intensity={sceneConfig.ambientLight.intensity} />
      {sceneConfig.directionalLights.map((light, i) => (
        <directionalLight
          key={i}
          position={light.position}
          color={light.color}
          intensity={light.intensity}
        />
      ))}
      <OrbitControls
        target={center ?? [0, 0, 0]}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={60}
      />
      <gridHelper args={[50, 50, "#222233", "#181828"]} position={[0, -0.01, 0]} />
      {children}
    </Canvas>
  );
}
