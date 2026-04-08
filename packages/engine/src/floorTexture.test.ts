import { describe, it, expect, vi } from "vitest";
import { adjustColor, getBrightness, contrastAdjust, drawFloorPattern, FLOOR_STYLES, FLOOR_STYLE_LABELS } from "./floorTexture";

describe("adjustColor", () => {
  it("darkens a color", () => {
    expect(adjustColor("#ffffff", -30)).toBe("#e1e1e1");
  });
  it("lightens a color", () => {
    expect(adjustColor("#101010", 30)).toBe("#2e2e2e");
  });
  it("clamps at 0", () => {
    expect(adjustColor("#000000", -50)).toBe("#000000");
  });
  it("clamps at 255", () => {
    expect(adjustColor("#ffffff", 50)).toBe("#ffffff");
  });
});

describe("getBrightness", () => {
  it("returns 255 for white", () => {
    expect(getBrightness("#ffffff")).toBeCloseTo(255, 0);
  });
  it("returns 0 for black", () => {
    expect(getBrightness("#000000")).toBe(0);
  });
  it("returns ~76 for pure red (ITU-R BT.601 weighting)", () => {
    expect(getBrightness("#ff0000")).toBeCloseTo(76.245, 0);
  });
  it("returns ~150 for pure green", () => {
    expect(getBrightness("#00ff00")).toBeCloseTo(149.685, 0);
  });
  it("returns ~29 for pure blue", () => {
    expect(getBrightness("#0000ff")).toBeCloseTo(29.07, 0);
  });
});

describe("contrastAdjust", () => {
  it("lightens dark colors (brightness < 128)", () => {
    const result = contrastAdjust("#222222", 40);
    expect(result).toBe(adjustColor("#222222", 40));
  });
  it("darkens light colors (brightness >= 128)", () => {
    const result = contrastAdjust("#dddddd", 40);
    expect(result).toBe(adjustColor("#dddddd", -40));
  });
  it("lightens mid-dark color (#555555)", () => {
    expect(contrastAdjust("#555555", 30)).toBe(adjustColor("#555555", 30));
  });
});

describe("FLOOR_STYLES", () => {
  it("has 5 styles", () => {
    expect(FLOOR_STYLES).toHaveLength(5);
  });
  it("has a label for every style", () => {
    for (const s of FLOOR_STYLES) {
      expect(FLOOR_STYLE_LABELS[s]).toBeTruthy();
    }
  });
});

describe("drawFloorPattern", () => {
  function makeMockCtx(): CanvasRenderingContext2D {
    return {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;
  }

  for (const style of FLOOR_STYLES) {
    it(`draws ${style} without throwing`, () => {
      const ctx = makeMockCtx();
      expect(() => drawFloorPattern(ctx, style, "#2a3a55")).not.toThrow();
    });
  }

  it("falls back to solid fill for an unknown style", () => {
    const ctx = makeMockCtx();
    expect(() => drawFloorPattern(ctx, "nonexistent" as any, "#aabbcc")).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
