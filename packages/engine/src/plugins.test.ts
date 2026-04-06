import { describe, it, expect } from "vitest";
import {
  PluginRegistry,
  DuplicatePluginError,
  PluginNotFoundError,
  type RoomPlugin,
  type ViewPlugin,
  type SourcePlugin,
  type ThemePlugin,
} from "./plugins";

function makeRoomPlugin(type: string): RoomPlugin {
  return {
    kind: "room",
    type,
    defaultSize: [2, 2] as [number, number],
    reducer: (state: unknown) => state,
    catalog: { icon: "box", description: `A ${type} room` },
  };
}

function makeViewPlugin(type: string): ViewPlugin {
  return {
    kind: "view",
    type,
    catalog: { icon: "eye", description: `${type} view` },
  };
}

function makeSourcePlugin(type: string): SourcePlugin {
  return {
    kind: "source",
    type,
    connect: async () => {},
    disconnect: async () => {},
  };
}

function makeThemePlugin(type: string): ThemePlugin {
  return {
    kind: "theme",
    type,
    colors: { background: "#000", accent: "#fff" },
  };
}

describe("PluginRegistry", () => {
  it("starts empty", () => {
    const registry = new PluginRegistry();
    expect(registry.getRoomPlugins()).toEqual([]);
    expect(registry.getViewPlugins()).toEqual([]);
    expect(registry.getSourcePlugins()).toEqual([]);
    expect(registry.getThemePlugins()).toEqual([]);
  });

  it("registers and retrieves a room plugin", () => {
    const registry = new PluginRegistry();
    const plugin = makeRoomPlugin("council-chamber");
    registry.register(plugin);
    expect(registry.getRoomPlugins()).toEqual([plugin]);
    expect(registry.getRoomPlugin("council-chamber")).toBe(plugin);
  });

  it("registers and retrieves a view plugin", () => {
    const registry = new PluginRegistry();
    const plugin = makeViewPlugin("3d-office");
    registry.register(plugin);
    expect(registry.getViewPlugins()).toEqual([plugin]);
    expect(registry.getViewPlugin("3d-office")).toBe(plugin);
  });

  it("registers and retrieves a source plugin", () => {
    const registry = new PluginRegistry();
    const plugin = makeSourcePlugin("openclaw-gateway");
    registry.register(plugin);
    expect(registry.getSourcePlugins()).toEqual([plugin]);
    expect(registry.getSourcePlugin("openclaw-gateway")).toBe(plugin);
  });

  it("registers and retrieves a theme plugin", () => {
    const registry = new PluginRegistry();
    const plugin = makeThemePlugin("neon-dark");
    registry.register(plugin);
    expect(registry.getThemePlugins()).toEqual([plugin]);
    expect(registry.getThemePlugin("neon-dark")).toBe(plugin);
  });

  it("throws DuplicatePluginError on duplicate registration", () => {
    const registry = new PluginRegistry();
    registry.register(makeRoomPlugin("bullpen"));
    expect(() => registry.register(makeRoomPlugin("bullpen"))).toThrow(
      DuplicatePluginError
    );
  });

  it("throws PluginNotFoundError for unknown room plugin", () => {
    const registry = new PluginRegistry();
    expect(() => registry.getRoomPlugin("nonexistent")).toThrow(
      PluginNotFoundError
    );
  });

  it("throws PluginNotFoundError for unknown view plugin", () => {
    const registry = new PluginRegistry();
    expect(() => registry.getViewPlugin("nonexistent")).toThrow(
      PluginNotFoundError
    );
  });

  it("registers multiple plugins of different kinds", () => {
    const registry = new PluginRegistry();
    registry.register(makeRoomPlugin("bullpen"));
    registry.register(makeViewPlugin("3d-office"));
    registry.register(makeSourcePlugin("mock-data"));
    registry.register(makeThemePlugin("minimal"));

    expect(registry.getRoomPlugins()).toHaveLength(1);
    expect(registry.getViewPlugins()).toHaveLength(1);
    expect(registry.getSourcePlugins()).toHaveLength(1);
    expect(registry.getThemePlugins()).toHaveLength(1);
  });

  it("allows same type name across different plugin kinds", () => {
    const registry = new PluginRegistry();
    registry.register(makeRoomPlugin("office"));
    registry.register(makeViewPlugin("office"));
    // No error — different kinds
    expect(registry.getRoomPlugin("office").kind).toBe("room");
    expect(registry.getViewPlugin("office").kind).toBe("view");
  });

  it("lists all registered plugins", () => {
    const registry = new PluginRegistry();
    registry.register(makeRoomPlugin("a"));
    registry.register(makeRoomPlugin("b"));
    registry.register(makeViewPlugin("v1"));

    const all = registry.getAll();
    expect(all).toHaveLength(3);
  });
});
