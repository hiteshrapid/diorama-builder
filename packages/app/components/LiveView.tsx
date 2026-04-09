"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { DioramaScene } from "./scene/DioramaScene";
import { Room3D } from "./scene/Room3D";
import { AgentFigure3D } from "./scene/AgentFigure3D";
import { useGatewayEvents } from "@/hooks/useGatewayEvents";
import { useMockEventSource } from "@/hooks/useMockEventSource";
import {
  createAgentState,
  updateAgentState,
  buildRoomGraph,
  findRoomPath,
  generateWaypoints,
  findRoomContaining,
  ROOM_PRESETS,
  type DioramaConfig,
  type AgentState,
  type DioramaEvent,
} from "@diorama/engine";

const THEME_COLORS: Record<string, { accent: string; floor: string }> = {
  "neon-dark": { accent: "#8090c0", floor: "#1a1a2e" },
  "warm-office": { accent: "#d4a574", floor: "#2a2420" },
  cyberpunk: { accent: "#ff2d95", floor: "#1a0028" },
  minimal: { accent: "#666666", floor: "#e0e0e0" },
};

const AGENT_COLORS = ["#60a0ff", "#ff6090", "#60ffa0", "#ffa060", "#a060ff", "#ff60ff", "#60ffff"];
const GRID_UNIT = 200;
const SCALE = 0.018;

/** Normalize a label for comparison: lowercase, spaces to hyphens. */
function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

interface LiveViewProps {
  config: DioramaConfig;
  onSelectRoom?: (roomLabel: string | null) => void;
  selectedRoom?: string | null;
}

export function LiveView({ config, onSelectRoom, selectedRoom }: LiveViewProps) {
  const { eventBus, status, connect } = useGatewayEvents();
  const colors = THEME_COLORS[config.theme] ?? THEME_COLORS["neon-dark"];

  // Track room glow intensity (event pulse)
  const [roomGlows, setRoomGlows] = useState<Record<number, number>>({});
  const glowTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const isDemoMode = !config.gateway.url || config.gateway.url === "";

  useEffect(() => {
    if (!isDemoMode) connect();
  }, [connect, isDemoMode]);

  useMockEventSource(eventBus, isDemoMode);

  // Build room graph once for pathfinding
  const roomGraph = useMemo(
    () => buildRoomGraph(config.rooms, ROOM_PRESETS),
    [config.rooms],
  );

  // Mutable agent states — updated per frame
  const agentStatesRef = useRef<Map<string, { state: AgentState; color: string; energy: number }>>(new Map());
  const [agentSnapshot, setAgentSnapshot] = useState<Array<{ id: string; state: AgentState; color: string; energy: number }>>([]);

  // Initialize agent states from config
  useEffect(() => {
    const states = new Map<string, { state: AgentState; color: string; energy: number }>();
    const agentEntries = Object.entries(config.agents);

    agentEntries.forEach(([agentId, assignment], i) => {
      const deskPrefix = assignment.desk.replace(/-desk-\d+$/, "");
      const room = config.rooms.find(
        (r) => normalizeLabel(r.label) === deskPrefix,
      );

      if (room) {
        const roomCenterX = (room.position[0] + room.size[0] / 2) * GRID_UNIT * SCALE;
        const roomCenterZ = (room.position[1] + room.size[1] / 2) * GRID_UNIT * SCALE;
        const offset = (i % 4) * 0.4 - 0.6;

        states.set(agentId, {
          state: createAgentState({
            x: roomCenterX + offset,
            z: roomCenterZ + (Math.floor(i / 4) * 0.4 - 0.2),
            seatRotation: 0,
          }),
          color: assignment.color ?? AGENT_COLORS[i % AGENT_COLORS.length],
          energy: assignment.energy ?? 0.5,
        });
      }
    });

    agentStatesRef.current = states;
    setAgentSnapshot(Array.from(states.entries()).map(([id, v]) => ({ id, ...v })));
  }, [config]);

  // Handle event → agent movement
  const handleEvent = useCallback((event: DioramaEvent) => {
    // Glow the target room
    if (event.room) {
      const roomIdx = config.rooms.findIndex(
        (r) => normalizeLabel(r.label) === normalizeLabel(event.room),
      );
      if (roomIdx >= 0) {
        setRoomGlows((prev) => ({ ...prev, [roomIdx]: 1 }));
        const existing = glowTimers.current.get(roomIdx);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setRoomGlows((prev) => ({ ...prev, [roomIdx]: 0 }));
        }, 1000);
        glowTimers.current.set(roomIdx, timer);
      }
    }

    // Move agent to the event's room
    if (!event.agent || !event.room) return;

    // Find the agent
    const agentId = Array.from(agentStatesRef.current.keys()).find(
      (id) => normalizeLabel(id) === normalizeLabel(event.agent) || normalizeLabel(id).includes(normalizeLabel(event.agent)),
    );
    if (!agentId) return;

    const agentEntry = agentStatesRef.current.get(agentId);
    if (!agentEntry) return;

    // Check room access
    const assignment = config.agents[agentId];
    if (assignment?.allowedRooms && assignment.allowedRooms.length > 0) {
      const hasAccess = assignment.allowedRooms.some(
        (r) => normalizeLabel(r) === normalizeLabel(event.room),
      );
      if (!hasAccess) return;
    }

    // Find target room
    const targetRoom = config.rooms.find(
      (r) => normalizeLabel(r.label) === normalizeLabel(event.room),
    );
    if (!targetRoom) return;

    // Determine current room
    const currentRoom = findRoomContaining(config.rooms, agentEntry.state.x, agentEntry.state.z);
    if (!currentRoom) return;

    // Pathfind
    const roomPath = findRoomPath(roomGraph, currentRoom, targetRoom.label);
    if (roomPath.length === 0) {
      // No path — teleport to target room center (fallback)
      const tx = (targetRoom.position[0] + targetRoom.size[0] / 2) * GRID_UNIT * SCALE;
      const tz = (targetRoom.position[1] + targetRoom.size[1] / 2) * GRID_UNIT * SCALE;
      agentEntry.state = updateAgentState(agentEntry.state, {
        type: "SET_PATH",
        path: [[tx, 0, tz]],
      });
      return;
    }

    // Generate waypoints through doors
    const targetCenter: [number, number] = [
      (targetRoom.position[0] + targetRoom.size[0] / 2) * GRID_UNIT * SCALE,
      (targetRoom.position[1] + targetRoom.size[1] / 2) * GRID_UNIT * SCALE,
    ];
    const waypoints = generateWaypoints(
      roomGraph,
      roomPath,
      [agentEntry.state.x, agentEntry.state.z],
      targetCenter,
    );

    if (waypoints.length > 0) {
      agentEntry.state = updateAgentState(agentEntry.state, {
        type: "SET_PATH",
        path: waypoints,
      });
    }
  }, [config, roomGraph]);

  // Subscribe to events
  useEffect(() => {
    if (!eventBus) return;
    const unsub = eventBus.subscribe(handleEvent);
    return unsub;
  }, [eventBus, handleEvent]);

  // Animation loop — tick walking agents and update snapshot for rendering
  useEffect(() => {
    let lastTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      let anyWalking = false;
      for (const entry of agentStatesRef.current.values()) {
        if (entry.state.mode === "walking") {
          entry.state = updateAgentState(entry.state, { type: "TICK", delta });
          anyWalking = true;
        }
      }

      // Only update React state when there's movement to show
      if (anyWalking) {
        setAgentSnapshot(
          Array.from(agentStatesRef.current.entries()).map(([id, v]) => ({ id, ...v })),
        );
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
        {agentSnapshot.map((agent, i) => (
          <AgentFigure3D
            key={agent.id}
            state={agent.state}
            color={agent.color}
            label={agent.id}
            phase={i * 3.7}
            energy={agent.energy}
          />
        ))}
      </DioramaScene>
    </div>
  );
}
