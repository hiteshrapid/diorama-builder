import type { PluginRegistry } from "@diorama/engine";

export interface RoomCatalogEntry {
  type: string;
  icon: string;
  description: string;
  defaultSize: [number, number];
}

export function createRoomCatalog(registry: PluginRegistry): RoomCatalogEntry[] {
  return registry.getRoomPlugins().map((p) => ({
    type: p.type,
    icon: p.catalog.icon,
    description: p.catalog.description,
    defaultSize: p.defaultSize,
  }));
}
