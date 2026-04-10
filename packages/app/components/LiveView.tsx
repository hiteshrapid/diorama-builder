"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { DioramaScene } from "./scene/DioramaScene";
import { Room3D } from "./scene/Room3D";
import { AgentFigure3D } from "./scene/AgentFigure3D";
import { useGatewayEvents } from "@/hooks/useGatewayEvents";
import { useMockEventSource } from "@/hooks/useMockEventSource";
import {
  createAgentState,
  toWorld,
  deriveActivity,
  formatEventLabel,
  getFurniture,
  ACTIVITY_TIMEOUT_MS,
  type DioramaConfig,
  type AgentState,
  type ActivityRecord,
  type DioramaEvent,
  type FurnitureItem,
} from "@diorama/engine";
import { ActivityFeed, type FeedEntry } from "./ActivityFeed";

const THEME_COLORS: Record<string, { accent: string; floor: string }> = {
  "neon-dark": { accent: "#8090c0", floor: "#1a1a2e" },
  "warm-office": { accent: "#d4a574", floor: "#2a2420" },
  cyberpunk: { accent: "#ff2d95", floor: "#1a0028" },
  minimal: { accent: "#666666", floor: "#e0e0e0" },
};

const AGENT_COLORS = ["#60a0ff", "#ff6090", "#60ffa0", "#ffa060", "#a060ff", "#ff60ff", "#60ffff"];
const GRID_UNIT = 200;

const SEATING_KEYWORDS = ["chair", "couch", "sofa", "stool", "lounge"];

function isSeating(item: FurnitureItem): boolean {
  const label = (item.label ?? "").toLowerCase();
  return SEATING_KEYWORDS.some((k) => label.includes(k));
}

/** Normalize a label for comparison: lowercase, spaces to hyphens. */
function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Get the world-space center of a room. Room3D uses generateFloor which calls
 * toWorld(cx, cy) where cx = room.position[0]*GRID_UNIT + w/2, cy = room.position[1]*GRID_UNIT + h/2.
 * We replicate that logic here.
 */
function getRoomWorldCenter(room: { position: [number, number]; size: [number, number] }): [number, number, number] {
  const cx = (room.position[0] + room.size[0] / 2) * GRID_UNIT;
  const cy = (room.position[1] + room.size[1] / 2) * GRID_UNIT;
  return toWorld(cx, cy);
}

/**
 * Get a seat position in world coordinates.
 * Furniture positions in presets are relative to room center.
 */
function getSeatWorldPos(
  roomCenter: [number, number, number],
  furniture: FurnitureItem,
): [number, number, number] {
  return [
    roomCenter[0] + furniture.position[0],
    0,
    roomCenter[2] + furniture.position[2],
  ];
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

  // Calculate rooms centroid for camera (same logic as BuildStep3D)
  const roomsCenter = useMemo<[number, number, number]>(() => {
    if (config.rooms.length === 0) return [0, 0, 0];
    let minGx = Infinity, minGy = Infinity, maxGx = -Infinity, maxGy = -Infinity;
    for (const r of config.rooms) {
      minGx = Math.min(minGx, r.position[0]);
      minGy = Math.min(minGy, r.position[1]);
      maxGx = Math.max(maxGx, r.position[0] + r.size[0]);
      maxGy = Math.max(maxGy, r.position[1] + r.size[1]);
    }
    const cx = ((minGx + maxGx) / 2) * GRID_UNIT;
    const cy = ((minGy + maxGy) / 2) * GRID_UNIT;
    const [wx, , wz] = toWorld(cx, cy);
    return [wx, 0, wz];
  }, [config.rooms]);

  // Agent states
  const [agentSnapshot, setAgentSnapshot] = useState<Array<{
    id: string; state: AgentState; color: string; energy: number;
  }>>([]);

  // Activity tracking
  const agentActivitiesRef = useRef<Map<string, ActivityRecord>>(new Map());
  const [activitySnapshot, setActivitySnapshot] = useState<Map<string, ActivityRecord>>(new Map());
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([]);

  // Initialize agents — auto-seat in chairs
  useEffect(() => {
    const agents: Array<{ id: string; state: AgentState; color: string; energy: number }> = [];
    const agentEntries = Object.entries(config.agents);

    // Build a pool of seats per room
    const seatPool = new Map<number, Array<{ pos: [number, number, number]; rotation: number }>>();
    config.rooms.forEach((room, roomIdx) => {
      const furniture = (room.furniture && room.furniture.length > 0)
        ? room.furniture
        : getFurniture(room.preset, config.theme);
      const roomCenter = getRoomWorldCenter(room);
      const seats: Array<{ pos: [number, number, number]; rotation: number }> = [];
      for (const item of furniture) {
        if (isSeating(item)) {
          seats.push({
            pos: getSeatWorldPos(roomCenter, item),
            rotation: item.rotation ? item.rotation[1] : 0,
          });
        }
      }
      seatPool.set(roomIdx, seats);
    });

    // Assign agents round-robin to rooms, then to seats within that room
    const seatCursors = new Map<number, number>();
    agentEntries.forEach(([agentId, assignment], i) => {
      // Find assigned room by desk prefix, or fall back to round-robin
      const deskPrefix = assignment.desk.replace(/-desk-\d+$/, "");
      let roomIdx = config.rooms.findIndex(
        (r) => normalizeLabel(r.label) === deskPrefix,
      );
      if (roomIdx < 0) roomIdx = i % config.rooms.length;

      const room = config.rooms[roomIdx];
      const roomCenter = getRoomWorldCenter(room);
      const seats = seatPool.get(roomIdx) ?? [];
      const cursor = seatCursors.get(roomIdx) ?? 0;

      let x: number, z: number, seatRotation: number | null = null;

      if (cursor < seats.length) {
        // Seat available — place agent at chair
        const seat = seats[cursor];
        x = seat.pos[0];
        z = seat.pos[2];
        seatRotation = seat.rotation;
        seatCursors.set(roomIdx, cursor + 1);
      } else {
        // No more seats — stand near room center with offset
        const overflow = cursor - seats.length;
        x = roomCenter[0] + (overflow % 3) * 0.6 - 0.6;
        z = roomCenter[2] + Math.floor(overflow / 3) * 0.6 - 0.3;
        seatCursors.set(roomIdx, cursor + 1);
      }

      const state = createAgentState({ x, z, seatRotation: seatRotation ?? 0 });
      // If we have a seat, put them in seated mode
      if (seatRotation !== null) {
        state.mode = "seated" as const;
        state.seatRotation = seatRotation;
      }

      agents.push({
        id: agentId,
        state,
        color: assignment.color ?? AGENT_COLORS[i % AGENT_COLORS.length],
        energy: assignment.energy ?? 0.5,
      });
    });

    setAgentSnapshot(agents);
  }, [config]);

  // Handle events — activity + glow only, no movement
  const handleEvent = useCallback((event: DioramaEvent) => {
    // Glow any matching room (or random room in demo fallback)
    if (event.room) {
      let roomIdx = config.rooms.findIndex(
        (r) => normalizeLabel(r.label) === normalizeLabel(event.room),
      );
      if (roomIdx < 0) roomIdx = Math.floor(Math.random() * config.rooms.length);
      if (roomIdx >= 0) {
        setRoomGlows((prev) => ({ ...prev, [roomIdx]: 1 }));
        const existing = glowTimers.current.get(roomIdx);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setRoomGlows((prev) => ({ ...prev, [roomIdx]: 0 }));
        }, 1200);
        glowTimers.current.set(roomIdx, timer);
      }
    }

    if (!event.agent || !event.room) return;

    // Find the agent
    const agentId = agentSnapshot.find(
      (a) => normalizeLabel(a.id) === normalizeLabel(event.agent) || normalizeLabel(a.id).includes(normalizeLabel(event.agent)),
    )?.id;
    if (!agentId) return;

    // Derive the target room's preset for activity mapping
    const targetRoom =
      config.rooms.find((r) => normalizeLabel(r.label) === normalizeLabel(event.room)) ??
      config.rooms[0];
    const preset = targetRoom?.preset ?? "workspace";

    // Set activity
    const activity = deriveActivity(event.type, preset);
    const label = formatEventLabel(event.type, event.agent, event.room, preset);

    agentActivitiesRef.current.set(agentId, {
      activity,
      startedAt: Date.now(),
      eventType: event.type,
      eventLabel: label,
      roomPreset: preset,
    });
    setActivitySnapshot(new Map(agentActivitiesRef.current));

    // Add to feed
    const agentColor = agentSnapshot.find((a) => a.id === agentId)?.color ?? "#8090c0";
    setFeedEntries((prev) => {
      const entry: FeedEntry = {
        id: `${Date.now()}-${agentId}`,
        label,
        agentColor,
        timestamp: Date.now(),
        activity,
      };
      const next = [...prev, entry];
      return next.length > 15 ? next.slice(-15) : next;
    });
  }, [config, agentSnapshot]);

  // Subscribe to events
  useEffect(() => {
    if (!eventBus) return;
    const unsub = eventBus.subscribe(handleEvent);
    return unsub;
  }, [eventBus, handleEvent]);

  // Activity timeout loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const now = Date.now();
      let changed = false;
      for (const [id, record] of agentActivitiesRef.current.entries()) {
        if (record.activity !== "idle" && now - record.startedAt > ACTIVITY_TIMEOUT_MS) {
          agentActivitiesRef.current.set(id, { ...record, activity: "idle" });
          changed = true;
        }
      }
      if (changed) setActivitySnapshot(new Map(agentActivitiesRef.current));
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
          fontFamily: "'SF Mono', 'Fira Code', monospace",
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

      {/* Activity feed */}
      <ActivityFeed entries={feedEntries} />

      <DioramaScene theme={config.theme} center={roomsCenter}>
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
            activity={activitySnapshot.get(agent.id)?.activity ?? "idle"}
          />
        ))}
      </DioramaScene>
    </div>
  );
}
