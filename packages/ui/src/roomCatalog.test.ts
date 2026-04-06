import { describe, it, expect } from "vitest";
import { createRoomCatalog } from "./roomCatalog";

describe("createRoomCatalog", () => {
  it("returns 5 preset entries", () => {
    const catalog = createRoomCatalog();
    expect(catalog).toHaveLength(5);
  });

  it("each entry has preset, label, defaultSize", () => {
    const catalog = createRoomCatalog();
    for (const entry of catalog) {
      expect(entry.preset).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.defaultSize[0]).toBeGreaterThan(0);
      expect(entry.defaultSize[1]).toBeGreaterThan(0);
    }
  });

  it("includes meeting preset", () => {
    const catalog = createRoomCatalog();
    const meeting = catalog.find((e) => e.preset === "meeting");
    expect(meeting).toBeDefined();
    expect(meeting!.label).toBe("Meeting Room");
  });

  it("filters catalog by search query", () => {
    const catalog = createRoomCatalog();
    const filtered = catalog.filter((e) =>
      e.preset.includes("work") || e.label.toLowerCase().includes("work"),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].preset).toBe("workspace");
  });
});
