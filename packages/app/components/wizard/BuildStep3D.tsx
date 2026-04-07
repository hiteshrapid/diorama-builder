"use client";

import { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Room3D } from "../scene/Room3D";
import { DragGroundPlane } from "../scene/DragGroundPlane";
import { GhostRoom } from "../scene/GhostRoom";
import { ResizeHandles } from "../scene/ResizeHandles";
import { useDragRoom } from "../../hooks/useDragRoom";
import { useResizeRoom } from "../../hooks/useResizeRoom";
import type { RoomPlacement, BuilderAction } from "@diorama/ui/src/builderStore";
import {
  neonDarkTheme,
  warmOfficeTheme,
  cyberpunkTheme,
  minimalTheme,
} from "@diorama/plugins";

const THEMES: Record<string, { background: string; accent: string }> = {
  "neon-dark": neonDarkTheme.colors,
  "warm-office": warmOfficeTheme.colors,
  cyberpunk: cyberpunkTheme.colors,
  minimal: minimalTheme.colors,
};

class Canvas3DErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message + "\n" + err.stack };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#ff6b6b", fontSize: 13, whiteSpace: "pre-wrap", overflow: "auto", maxHeight: "100%" }}>
          <strong>3D Render Error</strong>
          <pre style={{ marginTop: 8 }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

interface BuildStep3DProps {
  rooms: RoomPlacement[];
  theme: string;
  selectedRoomId: string | null;
  dispatch: React.Dispatch<BuilderAction>;
  isPlacingFurniture?: boolean;
  onFurniturePlacementClick?: (e: import("@react-three/fiber").ThreeEvent<PointerEvent>) => void;
}

export function BuildStep3D({ rooms, theme, selectedRoomId, dispatch, isPlacingFurniture, onFurniturePlacementClick }: BuildStep3DProps) {
  const colors = THEMES[theme] ?? THEMES["neon-dark"];

  const {
    isDragging,
    ghost: dragGhost,
    handleRoomPointerDown,
    handlePointerMove: handleDragPointerMove,
    handlePointerUp: handleDragPointerUp,
  } = useDragRoom(rooms, dispatch);

  const {
    isResizing,
    resizeGhost,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
  } = useResizeRoom(rooms, dispatch);

  const selectedRoom = selectedRoomId ? rooms.find((r) => r.id === selectedRoomId) : null;
  const isInteracting = isDragging || isResizing;

  // Merge pointer-move / pointer-up so both drag and resize get events
  const onGroundMove = (e: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
    handleDragPointerMove(e);
    handleResizePointerMove(e);
  };
  const onGroundUp = () => {
    handleDragPointerUp();
    handleResizePointerUp();
  };

  return (
    <Canvas3DErrorBoundary>
      <Canvas
        camera={{ position: [0, 20, 15], fov: 50 }}
        style={{ background: colors.background }}
        onPointerMissed={() => dispatch({ type: "SELECT_ROOM", roomId: null })}
      >
        <ambientLight intensity={0.4} color={colors.accent} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
        <directionalLight position={[-5, 10, -5]} intensity={0.3} />

        {/* Grid helper */}
        <gridHelper args={[40, 40, "#1a2535", "#111825"]} position={[0, -0.01, 0]} />

        {/* Invisible ground plane for drag / resize tracking */}
        <DragGroundPlane
          onPointerMove={onGroundMove}
          onPointerUp={onGroundUp}
        />

        {rooms.map((room) => (
          <Room3D
            key={room.id}
            room={room}
            accentColor={colors.accent}
            floorColor={colors.background}
            themeId={theme}
            selected={selectedRoomId === room.id}
            onPointerDown={(e) => {
              // In furniture placement mode, clicking the selected room places furniture
              if (isPlacingFurniture && selectedRoomId === room.id) {
                onFurniturePlacementClick?.(e);
                return;
              }
              handleRoomPointerDown(room.id, e);
            }}
            onPointerUp={onGroundUp}
            onPointerMove={onGroundMove}
          />
        ))}

        {/* Resize handles on selected room */}
        {selectedRoom && !isDragging && (
          <ResizeHandles
            position={selectedRoom.position}
            size={selectedRoom.size}
            color={colors.accent}
            onPointerDown={(edge, e) => handleResizePointerDown(selectedRoom.id, edge, e)}
            onPointerMove={onGroundMove}
            onPointerUp={onGroundUp}
          />
        )}

        {/* Ghost room shown during drag */}
        {dragGhost && (
          <GhostRoom
            position={dragGhost.position}
            size={dragGhost.size}
            isValid={dragGhost.isValid}
          />
        )}

        {/* Ghost room shown during resize */}
        {resizeGhost && (
          <GhostRoom
            position={resizeGhost.position}
            size={resizeGhost.size}
            isValid={resizeGhost.isValid}
          />
        )}

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={5}
          maxDistance={50}
          enabled={!isInteracting}
        />
      </Canvas>
    </Canvas3DErrorBoundary>
  );
}
