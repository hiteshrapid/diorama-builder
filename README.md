# Diorama

Configurable 3D workspace visualizer for [OpenClaw](https://github.com/openclaw). Build custom layouts for your AI agents — choose rooms, themes, and view modes without touching code.

## Quick Start

```bash
npx diorama init my-office
cd my-office
npx diorama dev
```

This scaffolds a project with a `diorama.config.json` that drives the entire layout.

## How It Works

Diorama is a plugin-based engine. The core is minimal — everything else is a plugin:

| Plugin Type | What it does | Examples |
|-------------|-------------|----------|
| **Room** | A room type with geometry, behavior, and a state reducer | `council-chamber`, `test-lab`, `bullpen` |
| **View** | A rendering mode | `3d-office`, `2d-topdown`, `dashboard` |
| **Source** | A data connection | `openclaw-gateway`, `mock-data` |
| **Theme** | Colors, lighting, mood | `neon-dark`, `warm-office`, `minimal` |

## Configuration

Everything lives in `diorama.config.json`:

```json
{
  "name": "My Agent Office",
  "gateway": {
    "url": "ws://localhost:4040",
    "token": "$OPENCLAW_TOKEN"
  },
  "view": "3d-office",
  "theme": "neon-dark",
  "rooms": [
    { "type": "council-chamber", "position": [0, 0], "size": [3, 3], "label": "Strategy Room" },
    { "type": "test-lab", "position": [3, 0], "size": [2, 3], "label": "QA Lab" },
    { "type": "bullpen", "position": [0, 3], "size": [5, 2], "label": "Agent Floor" }
  ],
  "agents": {
    "aegis-prime": { "desk": "strategy-room-desk-1", "color": "#6366f1" }
  }
}
```

Environment variables (like `$OPENCLAW_TOKEN`) are resolved at runtime.

## Templates

Three built-in templates when you run `npx diorama init`:

- **starter** — 3 rooms (council, test lab, bullpen), neon-dark theme, 3D view
- **full-office** — 7 rooms matching the full Aegis pipeline layout
- **minimal** — single bullpen room with dashboard view

## CLI Commands

| Command | What it does |
|---------|-------------|
| `npx diorama init [name]` | Scaffold a new project from a template |
| `npx diorama dev` | Start dev server with builder UI |
| `npx diorama build` | Production build |
| `npx diorama add <plugin>` | Install a plugin and register it in config |

## View Modes

**3D Office** — Isometric 3D environment with rooms, agents, and neon lighting. Click rooms to zoom in.

**2D Top-Down** — Lightweight bird's-eye floor plan. Color-coded by agent activity.

**Dashboard** — Card-based status view. Agent cards, event feed, test results. No spatial metaphor.

## Builder UI

When running `npx diorama dev`, a sidebar lets you:

- Browse and add rooms from the plugin catalog
- Drag rooms on a grid to arrange the layout
- Resize rooms by dragging edges
- Configure labels, colors, and widgets per room
- Assign agents to desks (auto-discovered from gateway)
- Switch themes and view modes with live preview
- Undo/redo with full history

Changes auto-save to `diorama.config.json`.

## Packages

| Package | Purpose |
|---------|---------|
| `@diorama/engine` | Core: config loader, plugin registry, event bus, geometry, agent state, scene config |
| `@diorama/plugins` | Built-in rooms, sources, themes |
| `@diorama/cli` | Project scaffolding and dev server |
| `@diorama/ui` | Builder panel with grid editor and undo/redo |

## Adding Custom Plugins

Install a community room plugin:

```bash
npm install @diorama/room-greenhouse
```

Then add it to your config:

```json
{
  "rooms": [
    { "type": "greenhouse", "position": [5, 0], "size": [3, 2], "label": "Garden" }
  ]
}
```

## Building a Room Plugin

A room plugin exports:

```typescript
import type { RoomPlugin } from "@diorama/engine";

export const myRoomPlugin: RoomPlugin = {
  kind: "room",
  type: "my-room",
  defaultSize: [2, 2],
  reducer: (state, event) => {
    // Handle events, return new state
    return state;
  },
  catalog: {
    icon: "box",
    description: "My custom room",
  },
};
```

Register it in your app:

```typescript
import { PluginRegistry } from "@diorama/engine";
import { myRoomPlugin } from "./myRoom";

const registry = new PluginRegistry();
registry.register(myRoomPlugin);
```

## Architecture

```
OpenClaw Gateway (ws://localhost:4040)
    |
    v
Diorama Dev Server (localhost:3000)
    |-- Reads diorama.config.json
    |-- WebSocket proxy to gateway
    |-- Serves React app
    |
    v
Browser
    |-- SourcePlugin receives gateway events
    |-- Events normalized to { type, room, agent, payload, timestamp }
    |-- EventBus broadcasts to room plugin reducers
    |-- Each room reducer: (state, event) -> newState
    |-- ViewPlugin renders based on room states
```

## Development

```bash
npm install
npm test          # run all 137 tests
npm run typecheck # type checking
```

Tests cover: config validation, plugin registration, coordinate transforms, event dispatch, room reducers (council sessions, test pyramids), CLI scaffolding, builder undo/redo, overlap detection, and a full end-to-end integration flow.

## License

MIT
