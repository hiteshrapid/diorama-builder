"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DioramaConfig } from "@diorama/engine";

// Dynamic import to avoid SSR issues with Three.js
const LiveView = dynamic(() => import("@/components/LiveView").then((m) => ({ default: m.LiveView })), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p>Loading 3D scene...</p>
    </div>
  ),
});

const BuilderSidebar = dynamic(
  () => import("@/components/builder/BuilderSidebar").then((m) => ({ default: m.BuilderSidebar })),
  { ssr: false }
);

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<DioramaConfig | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setConfig(data.config);
        } else {
          router.replace("/wizard");
        }
        setLoading(false);
      })
      .catch(() => {
        router.replace("/wizard");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p>Loading Diorama...</p>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1 }}>
        <LiveView
          config={config}
          selectedRoom={selectedRoom}
          onSelectRoom={setSelectedRoom}
        />
      </div>
      <BuilderSidebar
        config={config}
        selectedRoom={selectedRoom}
        onConfigChange={setConfig}
        onSelectRoom={setSelectedRoom}
      />
    </div>
  );
}
