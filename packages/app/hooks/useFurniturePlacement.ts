"use client";

import { useState, useCallback, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import {
  catalogItemToFurniture,
  toCanvas,
  type CatalogItem,
} from "@diorama/engine";
import type { RoomPlacement, BuilderAction } from "@diorama/ui/src/builderStore";

const GRID_UNIT = 200;

/**
 * Furniture placement state machine: idle → placing → placed.
 *
 * In "placing" mode, clicking inside the selected room drops
 * the catalog item at the click position (converted to room-local coords).
 */
export function useFurniturePlacement(
  rooms: RoomPlacement[],
  selectedRoomId: string | null,
  dispatch: React.Dispatch<BuilderAction>,
) {
  const [placingItem, setPlacingItem] = useState<CatalogItem | null>(null);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const startPlacing = useCallback((item: CatalogItem) => {
    setPlacingItem(item);
  }, []);

  const cancelPlacement = useCallback(() => {
    setPlacingItem(null);
  }, []);

  /**
   * Called when user clicks inside a room while in placement mode.
   * Converts the world click position to room-local coordinates
   * and dispatches ADD_FURNITURE.
   */
  const handlePlacementClick = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!placingItem || !selectedRoomId) return;

      const room = roomsRef.current.find((r) => r.id === selectedRoomId);
      if (!room) return;

      // Convert world click to canvas, then to room-local
      const [canvasX, canvasY] = toCanvas(e.point.x, e.point.z);
      const roomCanvasX = room.position[0] * GRID_UNIT;
      const roomCanvasY = room.position[1] * GRID_UNIT;
      const roomCanvasW = room.size[0] * GRID_UNIT;
      const roomCanvasH = room.size[1] * GRID_UNIT;

      // Check click is actually inside this room
      if (
        canvasX < roomCanvasX ||
        canvasX > roomCanvasX + roomCanvasW ||
        canvasY < roomCanvasY ||
        canvasY > roomCanvasY + roomCanvasH
      ) {
        return; // click is outside the room bounds
      }

      // Room-local position: fraction of room width/height, centered on origin
      // FurnitureItem positions are relative to room center (see RoomFurniture3D)
      const SCALE = 0.018;
      const localX = ((canvasX - roomCanvasX) / roomCanvasW - 0.5) * roomCanvasW * SCALE;
      const localZ = ((canvasY - roomCanvasY) / roomCanvasH - 0.5) * roomCanvasH * SCALE;

      // Use the actual clicked surface Y so items land on whatever was clicked
      // (floor ≈ 0.025, desk top ≈ 0.77, coffee table ≈ 0.42, etc.).
      // catalogItemToFurniture will use item.defaultY first if set (rug, surfaces),
      // falling back to surfaceY for tech/decor items that have no fixed height.
      const surfaceY = e.point.y + placingItem.defaultSize[1] / 2;

      const furniture = catalogItemToFurniture(placingItem, [localX, 0, localZ], surfaceY);

      dispatchRef.current({
        type: "ADD_FURNITURE",
        roomId: selectedRoomId,
        item: furniture,
      });

      // Stay in placement mode so user can place multiple items quickly
      // They can cancel via the panel or press Escape
    },
    [placingItem, selectedRoomId],
  );

  return {
    placingItem,
    startPlacing,
    cancelPlacement,
    handlePlacementClick,
  };
}
