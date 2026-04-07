"use client";

import { useReducer, useState, useCallback, useEffect } from "react";
import { ROOM_PRESETS, findNextPosition, type RoomConfig, type CatalogItem } from "@diorama/engine";
import { builderReducer, createBuilderState } from "@diorama/ui/src/builderStore";
import { PresetPalette } from "./PresetPalette";
import { AgentAssignPanel } from "./AgentAssignPanel";
import { ThemeStep } from "./ThemeStep";
import { BuildStep3D } from "./BuildStep3D";
import { RoomColorPicker } from "../builder/RoomColorPicker";
import { FurnitureCatalogPanel } from "../builder/FurnitureCatalogPanel";
import { useFurniturePlacement } from "../../hooks/useFurniturePlacement";
import {
  neonDarkTheme,
  warmOfficeTheme,
  cyberpunkTheme,
  minimalTheme,
} from "@diorama/plugins";

const THEME_COLORS: Record<string, { background: string; accent: string }> = {
  "neon-dark": neonDarkTheme.colors,
  "warm-office": warmOfficeTheme.colors,
  cyberpunk: cyberpunkTheme.colors,
  minimal: minimalTheme.colors,
};

let nextRoomId = 0;
function genRoomId(): string {
  return `room-${Date.now()}-${nextRoomId++}`;
}

interface BuildStepProps {
  agents: string[];
  theme: string;
  onThemeChange: (theme: string) => void;
  onComplete: (rooms: RoomConfig[], agentAssignments: Record<string, string>) => void;
  onBack: () => void;
}

export function BuildStep({ agents, theme, onThemeChange, onComplete, onBack }: BuildStepProps) {
  const [state, dispatch] = useReducer(builderReducer, createBuilderState());
  const [agentAssignments, setAgentAssignments] = useState<Record<string, string>>({});
  const [sidebarTab, setSidebarTab] = useState<"rooms" | "agents" | "theme" | "furniture">("rooms");

  const { rooms, selectedRoomId } = state;
  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) ?? null : null;

  // Furniture placement
  const {
    placingItem,
    startPlacing,
    cancelPlacement,
    handlePlacementClick,
  } = useFurniturePlacement(rooms, selectedRoomId, dispatch);

  // Undo/Redo + Escape keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelPlacement();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "REDO" : "UNDO" });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const addRoom = useCallback((presetId: string) => {
    const preset = ROOM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const size: [number, number] = [...preset.defaultSize];
    const existing = rooms.map((r) => ({ position: r.position, size: r.size }));
    const position = findNextPosition(size, existing);

    dispatch({
      type: "ADD_ROOM",
      room: {
        id: genRoomId(),
        preset: presetId,
        position,
        size,
        label: preset.label,
      },
    });
  }, [rooms]);

  const addCustomRoom = useCallback((name: string, width: number, height: number) => {
    const size: [number, number] = [width, height];
    const existing = rooms.map((r) => ({ position: r.position, size: r.size }));
    const position = findNextPosition(size, existing);

    dispatch({
      type: "ADD_ROOM",
      room: {
        id: genRoomId(),
        preset: "custom",
        position,
        size,
        label: name,
      },
    });
  }, [rooms]);

  const removeRoom = useCallback((roomId: string) => {
    dispatch({ type: "REMOVE_ROOM", roomId });
  }, []);

  const handleComplete = () => {
    // Convert RoomPlacement[] to RoomConfig[] (strip IDs)
    let finalRooms: RoomConfig[] = rooms.map(({ id: _id, ...rest }) => rest);
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

  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Left: 3D Viewport */}
      <div style={{ flex: 1, position: "relative" }}>
        <BuildStep3D
          rooms={rooms}
          theme={theme}
          selectedRoomId={selectedRoomId}
          dispatch={dispatch}
          isPlacingFurniture={placingItem !== null}
          onFurniturePlacementClick={handlePlacementClick}
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
        {/* Undo/Redo toolbar */}
        {rooms.length > 0 && (
          <div style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 4,
          }}>
            <button
              onClick={() => dispatch({ type: "UNDO" })}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{
                width: 32,
                height: 32,
                background: canUndo ? "#1a2535" : "#111",
                color: canUndo ? "#e0e0e0" : "#444",
                border: "1px solid #2a3545",
                borderRadius: 6,
                fontSize: 14,
                cursor: canUndo ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↩
            </button>
            <button
              onClick={() => dispatch({ type: "REDO" })}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              style={{
                width: 32,
                height: 32,
                background: canRedo ? "#1a2535" : "#111",
                color: canRedo ? "#e0e0e0" : "#444",
                border: "1px solid #2a3545",
                borderRadius: 6,
                fontSize: 14,
                cursor: canRedo ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↪
            </button>
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
          {(["rooms", "agents", "theme", "furniture"] as const).map((tab) => (
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
              <PresetPalette onAdd={addRoom} onAddCustom={addCustomRoom} />
              {selectedRoom && (
                <div style={{ marginTop: 24, borderTop: "1px solid #1a2535", paddingTop: 16 }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#999" }}>Selected Room</h4>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>{selectedRoom.label}</p>
                  <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
                    {selectedRoom.size[0]}x{selectedRoom.size[1]} at ({selectedRoom.position[0]}, {selectedRoom.position[1]})
                  </p>
                  {/* Per-room color picker */}
                  <div style={{ marginTop: 16, marginBottom: 16 }}>
                    <RoomColorPicker
                      accent={selectedRoom.colors?.accent}
                      floor={selectedRoom.colors?.floor}
                      wall={selectedRoom.colors?.wall}
                      defaultAccent={(THEME_COLORS[theme] ?? THEME_COLORS["neon-dark"]).accent}
                      defaultFloor={(THEME_COLORS[theme] ?? THEME_COLORS["neon-dark"]).background}
                      onChange={(colors) => {
                        dispatch({ type: "SET_ROOM_COLORS", roomId: selectedRoom.id, colors });
                      }}
                    />
                  </div>

                  <button
                    onClick={() => removeRoom(selectedRoom.id)}
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

          {sidebarTab === "furniture" && (
            selectedRoom ? (
              <FurnitureCatalogPanel
                selectedRoomLabel={selectedRoom.label}
                placingItemId={placingItem?.id ?? null}
                onSelectItem={startPlacing}
                onCancelPlacement={cancelPlacement}
                existingFurniture={(selectedRoom.furniture ?? []).map((f) => ({
                  geometry: f.geometry,
                  size: f.size,
                }))}
                onRemoveFurniture={(idx) => {
                  dispatch({ type: "REMOVE_FURNITURE", roomId: selectedRoom.id, furnitureIndex: idx });
                }}
              />
            ) : (
              <div style={{ color: "#666", fontSize: 13 }}>
                <p>Select a room first to add furniture.</p>
                <p style={{ fontSize: 12, marginTop: 8 }}>
                  Click on a room in the 3D viewport, then choose items from the catalog.
                </p>
              </div>
            )
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
