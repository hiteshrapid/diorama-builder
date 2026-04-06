"use client";

import type { RoomConfig } from "@diorama/engine";

interface AgentAssignPanelProps {
  agents: string[];
  rooms: RoomConfig[];
  assignments: Record<string, string>;
  onAssign: (agent: string, roomLabel: string) => void;
}

export function AgentAssignPanel({ agents, rooms, assignments, onAssign }: AgentAssignPanelProps) {
  if (agents.length === 0) {
    return (
      <div style={{ color: "#666", fontSize: 13 }}>
        <p>No agents discovered yet.</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>
          Agents will appear here after connecting to a gateway or using demo data.
        </p>
      </div>
    );
  }

  const roomLabels = rooms.map((r) => r.label);

  return (
    <div>
      <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#999" }}>
        Agent Assignment ({agents.length} agents)
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {agents.map((agent) => (
          <div
            key={agent}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "#1a2535",
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 13, color: "#e0e0e0" }}>{agent}</span>
            <select
              value={assignments[agent] ?? ""}
              onChange={(e) => onAssign(agent, e.target.value)}
              style={{
                padding: "4px 8px",
                background: "#0d1520",
                border: "1px solid #333",
                borderRadius: 4,
                color: "#e0e0e0",
                fontSize: 12,
              }}
            >
              <option value="">Auto (General)</option>
              {roomLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "#555", marginTop: 12 }}>
        Unassigned agents will be placed in a General workspace room.
      </p>
    </div>
  );
}
