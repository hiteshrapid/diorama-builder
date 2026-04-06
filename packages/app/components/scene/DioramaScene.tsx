"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { createSceneConfig, type SceneConfig } from "@diorama/engine";
import { applyTheme, neonDarkTheme, warmOfficeTheme, cyberpunkTheme, minimalTheme } from "@diorama/plugins";

const THEMES: Record<string, typeof neonDarkTheme> = {
  "neon-dark": neonDarkTheme,
  "warm-office": warmOfficeTheme,
  "cyberpunk": cyberpunkTheme,
  "minimal": minimalTheme,
};

interface DioramaSceneProps {
  theme: string;
  children: React.ReactNode;
}

export function DioramaScene({ theme, children }: DioramaSceneProps) {
  const sceneConfig = useMemo(() => {
    const base = createSceneConfig();
    const themePlugin = THEMES[theme] ?? neonDarkTheme;
    return applyTheme(base, themePlugin);
  }, [theme]);

  return (
    <Canvas
      camera={{
        position: sceneConfig.camera.position,
        fov: sceneConfig.camera.fov,
        near: sceneConfig.camera.near,
        far: sceneConfig.camera.far,
      }}
      style={{ width: "100%", height: "100%" }}
    >
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
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={60}
      />
      <gridHelper args={[50, 50, "#222233", "#181828"]} position={[0, -0.01, 0]} />
      {children}
    </Canvas>
  );
}
