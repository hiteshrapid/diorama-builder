import { describe, it, expect } from "vitest";
import {
  neonDarkTheme,
  warmOfficeTheme,
  minimalTheme,
  applyTheme,
} from "./themes";
import { createSceneConfig } from "@diorama/engine";

describe("theme plugins", () => {
  it("neon-dark has correct metadata", () => {
    expect(neonDarkTheme.kind).toBe("theme");
    expect(neonDarkTheme.type).toBe("neon-dark");
    expect(neonDarkTheme.colors.background).toBeTruthy();
    expect(neonDarkTheme.colors.accent).toBeTruthy();
  });

  it("warm-office has correct metadata", () => {
    expect(warmOfficeTheme.kind).toBe("theme");
    expect(warmOfficeTheme.type).toBe("warm-office");
  });

  it("minimal has correct metadata", () => {
    expect(minimalTheme.kind).toBe("theme");
    expect(minimalTheme.type).toBe("minimal");
  });
});

describe("applyTheme", () => {
  it("applies neon-dark theme to scene config", () => {
    const base = createSceneConfig();
    const themed = applyTheme(base, neonDarkTheme);
    expect(themed.background).toBe(neonDarkTheme.colors.background);
    expect(themed.fog.color).toBe(neonDarkTheme.colors.background);
  });

  it("applies warm-office theme with different colors", () => {
    const base = createSceneConfig();
    const themed = applyTheme(base, warmOfficeTheme);
    expect(themed.background).toBe(warmOfficeTheme.colors.background);
    expect(themed.background).not.toBe(neonDarkTheme.colors.background);
  });

  it("does not mutate the original config", () => {
    const base = createSceneConfig();
    const originalBg = base.background;
    applyTheme(base, neonDarkTheme);
    expect(base.background).toBe(originalBg);
  });

  it("overrides ambient light color from theme", () => {
    const base = createSceneConfig();
    const themed = applyTheme(base, neonDarkTheme);
    expect(themed.ambientLight.color).toBe(neonDarkTheme.colors.accent);
  });
});
