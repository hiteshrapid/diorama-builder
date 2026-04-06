export interface BasePlugin {
  kind: string;
  type: string;
}

export interface RoomPlugin extends BasePlugin {
  kind: "room";
  defaultSize: [number, number];
  reducer: (state: unknown, event: import("./eventBus").DioramaEvent) => unknown;
  catalog: { icon: string; description: string };
}

export interface ViewPlugin extends BasePlugin {
  kind: "view";
  catalog: { icon: string; description: string };
}

export interface SourcePlugin extends BasePlugin {
  kind: "source";
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface ThemePlugin extends BasePlugin {
  kind: "theme";
  colors: { background: string; accent: string };
}

export type DioramaPlugin = RoomPlugin | ViewPlugin | SourcePlugin | ThemePlugin;

export class DuplicatePluginError extends Error {
  constructor(kind: string, type: string) {
    super(`Plugin "${type}" of kind "${kind}" is already registered`);
    this.name = "DuplicatePluginError";
  }
}

export class PluginNotFoundError extends Error {
  constructor(kind: string, type: string) {
    super(`Plugin "${type}" of kind "${kind}" not found`);
    this.name = "PluginNotFoundError";
  }
}

export class PluginRegistry {
  private rooms = new Map<string, RoomPlugin>();
  private views = new Map<string, ViewPlugin>();
  private sources = new Map<string, SourcePlugin>();
  private themes = new Map<string, ThemePlugin>();

  register(plugin: DioramaPlugin): void {
    const map = this.mapFor(plugin.kind);
    if (map.has(plugin.type)) {
      throw new DuplicatePluginError(plugin.kind, plugin.type);
    }
    map.set(plugin.type, plugin as never);
  }

  getRoomPlugin(type: string): RoomPlugin {
    const p = this.rooms.get(type);
    if (!p) throw new PluginNotFoundError("room", type);
    return p;
  }

  getViewPlugin(type: string): ViewPlugin {
    const p = this.views.get(type);
    if (!p) throw new PluginNotFoundError("view", type);
    return p;
  }

  getSourcePlugin(type: string): SourcePlugin {
    const p = this.sources.get(type);
    if (!p) throw new PluginNotFoundError("source", type);
    return p;
  }

  getThemePlugin(type: string): ThemePlugin {
    const p = this.themes.get(type);
    if (!p) throw new PluginNotFoundError("theme", type);
    return p;
  }

  getRoomPlugins(): RoomPlugin[] {
    return [...this.rooms.values()];
  }

  getViewPlugins(): ViewPlugin[] {
    return [...this.views.values()];
  }

  getSourcePlugins(): SourcePlugin[] {
    return [...this.sources.values()];
  }

  getThemePlugins(): ThemePlugin[] {
    return [...this.themes.values()];
  }

  getAll(): DioramaPlugin[] {
    return [
      ...this.rooms.values(),
      ...this.views.values(),
      ...this.sources.values(),
      ...this.themes.values(),
    ];
  }

  private mapFor(kind: string): Map<string, unknown> {
    switch (kind) {
      case "room": return this.rooms as Map<string, unknown>;
      case "view": return this.views as Map<string, unknown>;
      case "source": return this.sources as Map<string, unknown>;
      case "theme": return this.themes as Map<string, unknown>;
      default: throw new Error(`Unknown plugin kind: ${kind}`);
    }
  }
}
