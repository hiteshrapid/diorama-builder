"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { DioramaScene } from "./scene/DioramaScene";
import { Room3D } from "./scene/Room3D";
import { AgentFigure3D } from "./scene/AgentFigure3D";
import { useGatewayEvents } from "@/hooks/useGatewayEvents";
import { useMockEventSource } from "@/hooks/useMockEventSource";
import { createAgentState, type DioramaConfig, type AgentState } from "@diorama/engine";

const THEME_COLORS: Record<string, { accent: string; floor: string }> = {
  "neon-dark": { accent: "#8090c0", floor: "#1a1a2e" },
  "warm-office": { accent: "#d4a574", floor: "#2a2420" },
  cyberpunk: { accent: "#ff2d95", floor: "#1a0028" },
  minimal: { accent: "#666666", floor: "#e0e0e0" },
};

const AGENT_COLORS = ["#60a0ff", "#ff6090", "#60ffa0", "#ffa060", "#a060ff", "#ff60ff", "#60ffff"];
const GRID_UNIT = 200;
const SCALE = 0.018;

interface LiveViewProps {
  config: DioramaConfig;
  onSelectRoom?: (roomLabel: string | null) => void;
  selectedRoom?: string | null;
}

export function LiveView({ config, onSelectRoom, selectedRoom }: LiveViewProps) {
  const { eventBus, status, connect } = useGatewayEvents();
  const colors = THEME_COLORS[config.theme] ?? THEME_COLORS["neon-dark"];

  // Track room glow intensity (generic event pulse)
  const [roomGlows, setRoomGlows] = useState<Record<number, number>>({});
  const glowTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const isDemoMode = !config.gateway.url || config.gateway.url === "";

  useEffect(() => {
    if (!isDemoMode) connect();
  }, [connect, isDemoMode]);

  useMockEventSource(eventBus, isDemoMode);

  // Subscribe to events for generic glow pulses
  useEffect(() => {
    if (!eventBus) return;
    const unsub = eventBus.subscribe(() => {
      // Pulse a random room on each event (generic visualization)
      const roomIdx = Math.floor(Math.random() * config.rooms.length);
      setRoomGlows((prev) => ({ ...prev, [roomIdx]: 1 }));

      // Clear existing timer for this room
      const existing = glowTimers.current.get(roomIdx);
      if (existing) clearTimeout(existing);

      // Fade out after 1s
      const timer = setTimeout(() => {
        setRoomGlows((prev) => ({ ...prev, [roomIdx]: 0 }));
      }, 1000);
      glowTimers.current.set(roomIdx, timer);
    });
    return unsub;
  }, [eventBus, config.rooms.length]);

  const agentStates = useMemo(() => {
    const states: Array<{ id: string; state: AgentState; color: string }> = [];
    const agentEntries = Object.entries(config.agents);

    agentEntries.forEach(([agentId, assignment], i) => {
      const deskPrefix = assignment.desk.replace(/-desk-\d+$/, "");
      const room = config.rooms.find(
        (r) => r.label.toLowerCase().replace(/\s+/g, "-") === deskPrefix,
      );

      if (room) {
        const roomCenterX = (room.position[0] + room.size[0] / 2) * GRID_UNIT * SCALE;
        const roomCenterZ = (room.position[1] + room.size[1] / 2) * GRID_UNIT * SCALE;
        const offset = (i % 4) * 0.4 - 0.6;

        states.push({
          id: agentId,
          state: createAgentState({
            x: roomCenterX + offset,
            z: roomCenterZ + (Math.floor(i / 4) * 0.4 - 0.2),
            seatRotation: 0,
          }),
          color: assignment.color ?? AGENT_COLORS[i % AGENT_COLORS.length],
        });
      }
    });

    return states;
  }, [config]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Connection status badge */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          padding: "6px 12px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 6,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isDemoMode ? "#ffdd6b" : status === "connected" ? "#6bff6b" : status === "connecting" ? "#ffdd6b" : "#ff6b6b",
          }}
        />
        {isDemoMode ? "Demo" : status === "connected" ? "Live" : status === "connecting" ? "Connecting..." : "Disconnected"}
      </div>

      <DioramaScene theme={config.theme}>
        {config.rooms.map((room, i) => (
          <Room3D
            key={`${room.preset}-${i}`}
            room={room}
            accentColor={colors.accent}
            floorColor={colors.floor}
            themeId={config.theme}
            selected={selectedRoom === room.label}
            glowIntensity={roomGlows[i] ?? 0}
            onPointerUp={() => onSelectRoom?.(room.label === selectedRoom ? null : room.label)}
          />
        ))}
        {agentStates.map((agent, i) => (
          <AgentFigure3D
            key={agent.id}
            state={agent.state}
            color={agent.color}
            label={agent.id}
            phase={i * 3.7}
          />
        ))}
      </DioramaScene>
    </div>
  );
}
