"use client";

import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import {
  createBuilderState,
  builderReducer,
  type BuilderAction,
  type RoomPlacement,
} from "../../../ui/src/builderStore";
import type { DioramaConfig } from "@diorama/engine";
import { RoomCatalog } from "./RoomCatalog";
import { RoomProperties } from "./RoomProperties";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { UndoRedo } from "./UndoRedo";

interface BuilderSidebarProps {
  config: DioramaConfig;
  selectedRoom: string | null;
  onConfigChange: (config: DioramaConfig) => void;
  onSelectRoom: (roomLabel: string | null) => void;
}

function configToRooms(config: DioramaConfig): RoomPlacement[] {
  return config.rooms.map((r, i) => ({
    id: `${r.preset}-${r.position[0]}-${r.position[1]}-${i}`,
    preset: r.preset,
    position: r.position as [number, number],
    size: r.size as [number, number],
    label: r.label,
  }));
}

export function BuilderSidebar({ config, selectedRoom, onConfigChange, onSelectRoom }: BuilderSidebarProps) {
  const [state, dispatch] = useReducer(builderReducer, createBuilderState(configToRooms(config)));
  const [tab, setTab] = useState<"rooms" | "theme">("rooms");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save on state change (debounced)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const updatedConfig: DioramaConfig = {
        ...config,
        rooms: state.rooms.map((r) => ({
          preset: r.preset,
          position: r.position,
          size: r.size,
          label: r.label,
        })),
      };
      onConfigChange(updatedConfig);

      // Persist to server
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      }).catch(() => {});
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.rooms]);

  const handleDispatch = useCallback((action: BuilderAction) => {
    dispatch(action);
  }, []);

  const selectedPlacement = state.rooms.find((r) => r.label === selectedRoom) ?? null;

  return (
    <div
      style={{
        width: 280,
        background: "#111827",
        borderLeft: "1px solid #1f2937",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1f2937" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Builder</h3>
      </div>

      {/* Undo/Redo */}
      <UndoRedo
        canUndo={state.history.past.length > 0}
        canRedo={state.history.future.length > 0}
        onUndo={() => handleDispatch({ type: "UNDO" })}
        onRedo={() => handleDispatch({ type: "REDO" })}
      />

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f2937" }}>
        {(["rooms", "theme"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px 0",
              background: "transparent",
              color: tab === t ? "#8090c0" : "#666",
              border: "none",
              borderBottom: tab === t ? "2px solid #8090c0" : "2px solid transparent",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {t === "rooms" ? "Rooms" : "Theme"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {tab === "rooms" && (
          <>
            {selectedPlacement ? (
              <RoomProperties
                room={selectedPlacement}
                onUpdate={(updates) =>
                  handleDispatch({ type: "UPDATE_ROOM", roomId: selectedPlacement.id, updates })
                }
                onResize={(size) =>
                  handleDispatch({ type: "RESIZE_ROOM", roomId: selectedPlacement.id, size })
                }
                onRemove={() => {
                  handleDispatch({ type: "REMOVE_ROOM", roomId: selectedPlacement.id });
                  onSelectRoom(null);
                }}
                onDeselect={() => onSelectRoom(null)}
              />
            ) : (
              <RoomCatalog onAdd={(room) => handleDispatch({ type: "ADD_ROOM", room })} />
            )}
          </>
        )}

        {tab === "theme" && (
          <ThemeSwitcher
            currentTheme={config.theme}
            onThemeChange={(theme) => {
              onConfigChange({ ...config, theme });
              fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...config, theme }),
              }).catch(() => {});
            }}
          />
        )}
      </div>

      {/* Reset button */}
      <div style={{ padding: 12, borderTop: "1px solid #1f2937" }}>
        <button
          onClick={async () => {
            await fetch("/api/config", { method: "DELETE" });
            window.location.href = "/wizard";
          }}
          style={{
            width: "100%",
            padding: "8px 0",
            background: "transparent",
            color: "#666",
            border: "1px solid #333",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Reset Configuration
        </button>
      </div>
    </div>
  );
}
