import { describe, it, expect } from "vitest";
import { createRoomCatalog, type RoomCatalogEntry } from "./roomCatalog";
import { PluginRegistry } from "@diorama/engine";
import { councilChamberPlugin } from "@diorama/plugins/rooms/councilChamber";
import { testLabPlugin } from "@diorama/plugins/rooms/testLab";

describe("createRoomCatalog", () => {
  it("returns catalog entries from registered room plugins", () => {
    const registry = new PluginRegistry();
    registry.register(councilChamberPlugin);
    registry.register(testLabPlugin);

    const catalog = createRoomCatalog(registry);
    expect(catalog).toHaveLength(2);
  });

  it("each entry has type, label, icon, description, defaultSize", () => {
    const registry = new PluginRegistry();
    registry.register(councilChamberPlugin);

    const catalog = createRoomCatalog(registry);
    const entry = catalog[0];
    expect(entry.type).toBe("council-chamber");
    expect(entry.icon).toBe("shield");
    expect(entry.description).toBeTruthy();
    expect(entry.defaultSize).toEqual([3, 3]);
  });

  it("returns empty array when no room plugins registered", () => {
    const registry = new PluginRegistry();
    const catalog = createRoomCatalog(registry);
    expect(catalog).toEqual([]);
  });

  it("filters catalog by search query", () => {
    const registry = new PluginRegistry();
    registry.register(councilChamberPlugin);
    registry.register(testLabPlugin);

    const catalog = createRoomCatalog(registry);
    const filtered = catalog.filter((e) =>
      e.type.includes("council") || e.description.toLowerCase().includes("council")
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe("council-chamber");
  });
});
