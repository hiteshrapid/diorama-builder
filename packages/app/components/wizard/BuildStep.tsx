"use client";

import { useState, useCallback } from "react";
import { ROOM_PRESETS, findNextPosition, type RoomConfig } from "@diorama/engine";
import { PresetPalette } from "./PresetPalette";
import { AgentAssignPanel } from "./AgentAssignPanel";
import { ThemeStep } from "./ThemeStep";
import { BuildStep3D } from "./BuildStep3D";

interface BuildStepProps {
  agents: string[];
  theme: string;
  onThemeChange: (theme: string) => void;
  onComplete: (rooms: RoomConfig[], agentAssignments: Record<string, string>) => void;
  onBack: () => void;
}

export function BuildStep({ agents, theme, onThemeChange, onComplete, onBack }: BuildStepProps) {
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null);
  const [agentAssignments, setAgentAssignments] = useState<Record<string, string>>({});
  const [sidebarTab, setSidebarTab] = useState<"rooms" | "agents" | "theme">("rooms");

  const addRoom = useCallback((presetId: string) => {
    const preset = ROOM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const size: [number, number] = [...preset.defaultSize];
    const existing = rooms.map((r) => ({ position: r.position, size: r.size }));
    const position = findNextPosition(size, existing);

    setRooms((prev) => [
      ...prev,
      { preset: presetId, position, size, label: preset.label },
    ]);
  }, [rooms]);

  const removeRoom = useCallback((index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
    setSelectedRoomIndex(null);
  }, []);

  const handleComplete = () => {
    // Auto-assign unassigned agents to "General" room
    let finalRooms = rooms;
    const assignedAgents = new Set(Object.keys(agentAssignments));
    const unassigned = agents.filter((a) => !assignedAgents.has(a));

    if (unassigned.length > 0 && !finalRooms.some((r) => r.label === "General")) {
      const existing = finalRooms.map((r) => ({ position: r.position, size: r.size }));
      const position = findNextPosition([5, 4], existing);
      finalRooms = [...finalRooms, { preset: "workspace", position, size: [5, 4], label: "General" }];
    }

    const finalAssignments = { ...agentAssignments };
    for (const agent of unassigned) {
      finalAssignments[agent] = "General";
    }

    onComplete(finalRooms, finalAssignments);
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left: 3D Viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <BuildStep3D
          rooms={rooms}
          theme={theme}
          selectedRoomIndex={selectedRoomIndex}
          onSelectRoom={setSelectedRoomIndex}
        />
        {rooms.length === 0 && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "#666",
            pointerEvents: "none",
          }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Your office is empty</p>
            <p style={{ fontSize: 13 }}>Add rooms from the palette on the right</p>
          </div>
        )}
      </div>

      {/* Right: Sidebar */}
      <div style={{
        width: 320,
        background: "#0d1520",
        borderLeft: "1px solid #1a2535",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1a2535" }}>
          {(["rooms", "agents", "theme"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              style={{
                flex: 1,
                padding: "12px 0",
                background: sidebarTab === tab ? "#1a2535" : "transparent",
                border: "none",
                color: sidebarTab === tab ? "#e0e0e0" : "#666",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {sidebarTab === "rooms" && (
            <div>
              <PresetPalette onAdd={addRoom} />
              {selectedRoomIndex != null && rooms[selectedRoomIndex] && (
                <div style={{ marginTop: 24, borderTop: "1px solid #1a2535", paddingTop: 16 }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#999" }}>Selected Room</h4>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>{rooms[selectedRoomIndex].label}</p>
                  <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                    {rooms[selectedRoomIndex].size[0]}x{rooms[selectedRoomIndex].size[1]} at ({rooms[selectedRoomIndex].position[0]}, {rooms[selectedRoomIndex].position[1]})
                  </p>
                  <button
                    onClick={() => removeRoom(selectedRoomIndex)}
                    style={{
                      width: "100%",
                      padding: "8px 0",
                      background: "transparent",
                      color: "#ff6b6b",
                      border: "1px solid #ff6b6b33",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Remove Room
                  </button>
                </div>
              )}
            </div>
          )}

          {sidebarTab === "agents" && (
            <AgentAssignPanel
              agents={agents}
              rooms={rooms}
              assignments={agentAssignments}
              onAssign={(agent, roomLabel) => {
                setAgentAssignments((prev) => ({ ...prev, [agent]: roomLabel }));
              }}
            />
          )}

          {sidebarTab === "theme" && (
            <ThemeStep
              onNext={onThemeChange}
              compact
            />
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: 16, borderTop: "1px solid #1a2535", display: "flex", gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "transparent",
              color: "#888",
              border: "1px solid #333",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            onClick={handleComplete}
            disabled={rooms.length === 0}
            style={{
              flex: 2,
              padding: "10px 0",
              background: rooms.length > 0 ? "#8090c0" : "#333",
              color: rooms.length > 0 ? "#fff" : "#666",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: rooms.length > 0 ? "pointer" : "default",
            }}
          >
            Continue to Launch
          </button>
        </div>
      </div>
    </div>
  );
}
