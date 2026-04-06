import { describe, it, expect } from "vitest";
import { ROOM_PRESETS, getPreset, getFurniture, type RoomPreset } from "./roomPresets";

const THEME_IDS = ["neon-dark", "warm-office", "cyberpunk", "minimal"];

describe("ROOM_PRESETS", () => {
  it("has exactly 5 presets", () => {
    expect(ROOM_PRESETS).toHaveLength(5);
  });

  it("each preset has a unique id", () => {
    const ids = ROOM_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each preset has valid defaultSize", () => {
    for (const preset of ROOM_PRESETS) {
      expect(preset.defaultSize[0]).toBeGreaterThan(0);
      expect(preset.defaultSize[1]).toBeGreaterThan(0);
    }
  });

  it("each preset has furniture for all 4 themes", () => {
    for (const preset of ROOM_PRESETS) {
      for (const theme of THEME_IDS) {
        const furniture = preset.furnitureByTheme[theme];
        expect(furniture, `${preset.id} missing furniture for ${theme}`).toBeDefined();
        expect(furniture.length, `${preset.id} has 0 furniture for ${theme}`).toBeGreaterThan(0);
      }
    }
  });

  it("all furniture items have valid geometry type", () => {
    const validGeo = new Set(["box", "cylinder", "sphere", "plane"]);
    for (const preset of ROOM_PRESETS) {
      for (const theme of THEME_IDS) {
        for (const item of preset.furnitureByTheme[theme]) {
          expect(validGeo.has(item.geometry), `invalid geometry: ${item.geometry}`).toBe(true);
        }
      }
    }
  });

  it("all furniture items have 3-component size and position", () => {
    for (const preset of ROOM_PRESETS) {
      for (const theme of THEME_IDS) {
        for (const item of preset.furnitureByTheme[theme]) {
          expect(item.size).toHaveLength(3);
          expect(item.position).toHaveLength(3);
        }
      }
    }
  });
});

describe("getPreset", () => {
  it("returns preset by id", () => {
    const p = getPreset("meeting");
    expect(p).toBeDefined();
    expect(p!.label).toBe("Meeting Room");
  });

  it("returns undefined for unknown id", () => {
    expect(getPreset("nonexistent")).toBeUndefined();
  });
});

describe("getFurniture", () => {
  it("returns furniture for valid preset + theme", () => {
    const items = getFurniture("meeting", "cyberpunk");
    expect(items.length).toBeGreaterThan(0);
  });

  it("falls back to neon-dark for unknown theme", () => {
    const items = getFurniture("meeting", "unknown-theme");
    const neonItems = getFurniture("meeting", "neon-dark");
    expect(items).toEqual(neonItems);
  });

  it("returns empty array for unknown preset", () => {
    expect(getFurniture("nonexistent", "neon-dark")).toEqual([]);
  });
});
