"use client";

import { useState, useCallback, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { RoomPlacement, BuilderAction } from "@diorama/ui/src/builderStore";
import { detectAlignments, type AlignmentGuide } from "./useAlignmentDetection";

/** GRID_UNIT(200) * SCALE(0.018) */
const GRID_WORLD = 3.6;
const DRAG_THRESHOLD = 0.3;
const MIN_ROOM_SIZE = 2; // minimum 2 grid units in each dimension

type HandleEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface ResizeInfo {
  roomId: string;
  edge: HandleEdge;
  startWorldX: number;
  startWorldZ: number;
  startPos: [number, number];
  startSize: [number, number];
  hasMoved: boolean;
}

export interface ResizeGhost {
  position: [number, number];
  size: [number, number];
  isValid: boolean;
}

/**
 * Resize hook for room selection handles.
 *
 * Each handle edge constrains which axes change:
 *   n  → top edge moves, height changes
 *   s  → bottom edge moves, height changes
 *   e  → right edge moves, width changes
 *   w  → left edge moves, width changes
 *   ne, nw, se, sw → corner, both axes
 */
export function useResizeRoom(
  rooms: RoomPlacement[],
  dispatch: React.Dispatch<BuilderAction>,
) {
  const [ghost, setGhost] = useState<ResizeGhost | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const infoRef = useRef<ResizeInfo | null>(null);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const ghostRef = useRef<ResizeGhost | null>(null);

  const checkOverlap = (
    pos: [number, number],
    size: [number, number],
    excludeId: string,
  ): boolean =>
    roomsRef.current.some((r) => {
      if (r.id === excludeId) return false;
      return (
        pos[0] < r.position[0] + r.size[0] &&
        pos[0] + size[0] > r.position[0] &&
        pos[1] < r.position[1] + r.size[1] &&
        pos[1] + size[1] > r.position[1]
      );
    });

  const handleResizePointerDown = useCallback(
    (roomId: string, edge: HandleEdge, e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const room = roomsRef.current.find((r) => r.id === roomId);
      if (!room) return;

      infoRef.current = {
        roomId,
        edge,
        startWorldX: e.point.x,
        startWorldZ: e.point.z,
        startPos: [...room.position],
        startSize: [...room.size],
        hasMoved: false,
      };
    },
    [],
  );

  const handleResizePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const info = infoRef.current;
      if (!info) return;

      const dx = e.point.x - info.startWorldX;
      const dz = e.point.z - info.startWorldZ;

      if (!info.hasMoved) {
        if (Math.sqrt(dx * dx + dz * dz) < DRAG_THRESHOLD) return;
        info.hasMoved = true;
      }

      const gridDx = Math.round(dx / GRID_WORLD);
      const gridDz = Math.round(dz / GRID_WORLD);

      let newX = info.startPos[0];
      let newY = info.startPos[1];
      let newW = info.startSize[0];
      let newH = info.startSize[1];

      const edge = info.edge;

      // X-axis: west edge moves position, east edge moves size
      if (edge.includes("w")) {
        const shift = Math.min(gridDx, newW - MIN_ROOM_SIZE);
        newX += shift;
        newW -= shift;
      } else if (edge.includes("e")) {
        newW = Math.max(MIN_ROOM_SIZE, info.startSize[0] + gridDx);
      }

      // Z-axis (mapped to grid Y): north moves position, south moves size
      if (edge.includes("n")) {
        const shift = Math.min(gridDz, newH - MIN_ROOM_SIZE);
        newY += shift;
        newH -= shift;
      } else if (edge.includes("s")) {
        newH = Math.max(MIN_ROOM_SIZE, info.startSize[1] + gridDz);
      }

      const newPos: [number, number] = [newX, newY];
      const newSize: [number, number] = [newW, newH];

      // Snap moving edge to aligned edges/centers of other rooms
      const { snappedPos, guides } = detectAlignments(newPos, newSize, roomsRef.current, info.roomId);
      const overlaps = checkOverlap(snappedPos, newSize, info.roomId);

      setAlignmentGuides(guides);
      const g: ResizeGhost = { position: snappedPos, size: newSize, isValid: !overlaps };
      ghostRef.current = g;
      setGhost(g);
    },
    [],
  );

  const handleResizePointerUp = useCallback(() => {
    const info = infoRef.current;
    if (!info) return;

    if (info.hasMoved && ghostRef.current?.isValid) {
      const g = ghostRef.current;
      // Move if position changed
      if (g.position[0] !== info.startPos[0] || g.position[1] !== info.startPos[1]) {
        dispatchRef.current({
          type: "MOVE_ROOM",
          roomId: info.roomId,
          position: g.position,
        });
      }
      // Resize if size changed
      if (g.size[0] !== info.startSize[0] || g.size[1] !== info.startSize[1]) {
        dispatchRef.current({
          type: "RESIZE_ROOM",
          roomId: info.roomId,
          size: g.size,
        });
      }
    }

    infoRef.current = null;
    ghostRef.current = null;
    setGhost(null);
    setAlignmentGuides([]);
  }, []);

  return {
    isResizing: ghost !== null,
    resizeGhost: ghost,
    alignmentGuides,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
  };
}
