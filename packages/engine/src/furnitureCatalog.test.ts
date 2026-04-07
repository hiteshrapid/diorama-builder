import { describe, it, expect } from "vitest";
import {
  FURNITURE_CATALOG,
  getCatalogByCategory,
  getCatalogItem,
  catalogItemToFurniture,
} from "./furnitureCatalog";

describe("furnitureCatalog", () => {
  it("has exactly 20 items", () => {
    expect(FURNITURE_CATALOG).toHaveLength(20);
  });

  it("every item has required fields", () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(["seating", "surfaces", "tech", "decor"]).toContain(item.category);
      expect(["box", "cylinder", "sphere", "plane"]).toContain(item.geometry);
      expect(item.defaultSize).toHaveLength(3);
      expect(item.defaultMaterial.color).toBeTruthy();
    }
  });

  it("all IDs are unique", () => {
    const ids = FURNITURE_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe("getCatalogByCategory", () => {
    it("groups items into 4 categories", () => {
      const grouped = getCatalogByCategory();
      expect(Object.keys(grouped)).toHaveLength(4);
      expect(grouped.seating.length).toBe(5);
      expect(grouped.surfaces.length).toBe(5);
      expect(grouped.tech.length).toBe(5);
      expect(grouped.decor.length).toBe(5);
    });

    it("total items across categories equals catalog length", () => {
      const grouped = getCatalogByCategory();
      const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);
      expect(total).toBe(FURNITURE_CATALOG.length);
    });
  });

  describe("getCatalogItem", () => {
    it("finds existing item by id", () => {
      const item = getCatalogItem("couch");
      expect(item).toBeDefined();
      expect(item!.label).toBe("Couch");
      expect(item!.category).toBe("seating");
    });

    it("returns undefined for unknown id", () => {
      expect(getCatalogItem("nonexistent")).toBeUndefined();
    });
  });

  describe("catalogItemToFurniture", () => {
    it("converts catalog item to furniture placement data", () => {
      const item = getCatalogItem("desk")!;
      const pos: [number, number, number] = [1.5, 0.02, -0.3];
      const result = catalogItemToFurniture(item, pos);

      expect(result.geometry).toBe("box");
      expect(result.size).toEqual(item.defaultSize);
      expect(result.position).toEqual(pos);
      expect(result.material.color).toBe(item.defaultMaterial.color);
    });

    it("returns independent copies (no shared refs)", () => {
      const item = getCatalogItem("monitor")!;
      const a = catalogItemToFurniture(item, [0, 0, 0]);
      const b = catalogItemToFurniture(item, [1, 1, 1]);

      a.position[0] = 99;
      expect(b.position[0]).toBe(1);
      expect(item.defaultSize[0]).not.toBe(99);
    });
  });
});
