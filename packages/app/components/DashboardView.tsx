"use client";

import type { DioramaConfig, RoomConfig } from "@diorama/engine";

const PRESET_ICONS: Record<string, string> = {
  meeting: "Meeting",
  workspace: "Workspace",
  private: "Private",
  social: "Social",
  lab: "Lab",
};

interface DashboardViewProps {
  config: DioramaConfig;
}

function RoomCard({ room }: { room: RoomConfig }) {
  return (
    <div
      style={{
        background: "#1a2030",
        borderRadius: 8,
        padding: 16,
        border: "1px solid #1f2937",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#666" }}>{PRESET_ICONS[room.preset] ?? "Room"}</span>
        <span style={{ fontSize: 11, color: "#555" }}>
          {room.size[0]}x{room.size[1]}
        </span>
      </div>
      <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>{room.label}</h4>
      <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
        {room.preset} preset
      </p>
    </div>
  );
}

export function DashboardView({ config }: DashboardViewProps) {
  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <h2 style={{ margin: "0 0 24px", fontSize: 18 }}>Dashboard</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {config.rooms.map((room, i) => (
          <RoomCard key={`${room.preset}-${i}`} room={room} />
        ))}
      </div>
    </div>
  );
}
