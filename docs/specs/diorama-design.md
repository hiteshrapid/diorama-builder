# Diorama: Configurable 3D Workspace Visualizer for OpenClaw

**Date:** 2026-04-06
**Status:** Design

## Context

Claw3D is a working 3D office visualization for OpenClaw workspaces, but everything is hardcoded — room layouts, agent personalities, colors, event mappings. A developer who wants to visualize their own OpenClaw workspace has to modify source code.

**Diorama** extracts the proven rendering engine from Claw3D into a configurable, plugin-based npm package. Developers install it, connect their local OpenClaw gateway, and build custom layouts through a visual builder or config file — no code changes needed.

## Target User

Individual developers running OpenClaw workspaces locally who want to visualize their agents' activity in customizable 3D/2D environments.

## Product Overview

Diorama is an npm package + CLI:

```bash
npx diorama init my-office    # scaffold from template
cd my-office
npx diorama dev               # dev server with live builder UI
```

Everything is driven by a single `diorama.config.json` file. The builder UI is a visual editor that reads and writes this config.

## Architecture: Plugin-Based Engine

The engine is intentionally minimal. It provides:

- **Scene graph** — Three.js canvas, camera, lighting base
- **Agent system** — figures, idle/walk animations, pathfinding
- **Event bus** — gateway events in, visual state changes out
- **Config loader** — reads `diorama.config.json`

Everything else is a plugin:

| Plugin Type | Purpose | Example |
|-------------|---------|---------|
| `RoomPlugin` | Room type — geometry, furniture, lighting, behavior | `council-chamber`, `test-lab`, `bullpen` |
| `ViewPlugin` | Rendering mode | `3d-office`, `2d-topdown`, `dashboard` |
| `SourcePlugin` | Data source | `openclaw-gateway`, `mock-data` |
| `ThemePlugin` | Color palette, lighting preset, mood | `neon-dark`, `warm-office`, `minimal` |
| `WidgetPlugin` | UI overlay inside rooms | `kanban-board`, `test-results`, `chat` |

### Plugin Registration

Plugins self-register via the engine's plugin API. A room plugin provides:

- `type` — unique identifier (e.g., `"council-chamber"`)
- `defaultSize` — default grid dimensions
- `render(roomState, config)` — R3F component tree
- `reducer(roomState, event)` — state update on events
- `catalog` — metadata for the builder UI (icon, description, configurable options)

### Built-in Plugins (Extracted from Claw3D)

**Rooms:** `council-chamber`, `test-lab`, `reception`, `comms-hub`, `bullpen`, `archive`, `breakroom`
**Views:** `3d-office`, `2d-topdown`, `dashboard`
**Sources:** `openclaw-gateway`, `mock-data`
**Themes:** `neon-dark`, `warm-office`, `minimal`

Community plugins installable via npm:

```bash
npm install @diorama/room-greenhouse
# then add { "type": "greenhouse", ... } to config
```

## Configuration

Single config file drives the entire layout:

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
    {
      "type": "council-chamber",
      "position": [0, 0],
      "size": [3, 3],
      "label": "Strategy Room"
    },
    {
      "type": "test-lab",
      "position": [3, 0],
      "size": [2, 3],
      "label": "QA Lab"
    },
    {
      "type": "bullpen",
      "position": [0, 3],
      "size": [5, 2],
      "label": "Agent Floor"
    }
  ],
  "agents": {
    "aegis-prime": { "desk": "strategy-room-desk-1", "color": "#6366f1" },
    "sentinel": { "desk": "qa-lab-desk-1", "color": "#dc2626" }
  }
}
```

Environment variables (e.g., `$OPENCLAW_TOKEN`) are resolved at runtime.

## View Modes

### 3D Office (default)

Extracted from Claw3D's Aegis office:
- Isometric camera with orbit controls
- Rooms as 3D spaces with walls, floors, neon lighting
- Agent figures with idle/walk animations
- Click room to zoom in and see activity details

### 2D Top-Down

Lightweight bird's-eye view:
- Flat rectangles for rooms, icons for agents
- Color-coded by activity (idle/busy/error)
- Lower resource usage for weaker machines

### Dashboard

No spatial metaphor:
- Card-based layout showing agent status, recent events, test results
- Structured event feed with agent cards
- For devs who want data without visuals

## Builder UI

Accessible via `npx diorama dev`, sidebar panel provides:

- **Room catalog** — browse built-in + installed room plugins, add to layout
- **Grid-based drag** — arrange rooms on a spatial grid
- **Resize** — drag room edges to change dimensions
- **Per-room config** — label, color override, widget selection
- **Agent assignment** — dropdown of discovered agents, assign to desks
- **Theme picker** — switch themes with live preview
- **View mode toggle** — switch between 3D/2D/dashboard
- **Auto-save** — writes changes back to `diorama.config.json`
- **Undo/redo** — history stack (reuses Claw3D's builder store pattern)

## Data Flow

```
OpenClaw Gateway (localhost:4040)
    │ WebSocket
    ▼
Diorama dev server (localhost:3000)
    ├── Reads diorama.config.json
    ├── WebSocket proxy to gateway
    └── Serves React app
        │
        ▼
Browser
    ├── SourcePlugin receives raw gateway events
    ├── Events normalized to DioramaEvent { type, room, agent, payload, timestamp }
    ├── Event bus broadcasts to all room plugins
    ├── Each RoomPlugin reducer: (roomState, event) → newRoomState
    └── ViewPlugin renders based on room states
```

### Auto-Discovery

When connected to a gateway, Diorama auto-discovers:
- Available agents (names, roles, capabilities)
- Active sessions
- This populates the builder UI's agent assignment dropdowns

## Package Structure

```
diorama/
├── packages/
│   ├── engine/       # Core: scene graph, agent system, event bus, config loader
│   ├── plugins/      # Built-in room/view/source/theme plugins
│   ├── cli/          # npx diorama init/dev/build/add
│   └── ui/           # Builder panel, template picker, settings
├── templates/
│   ├── starter/      # Basic 3-room layout
│   ├── full-office/  # 7-room Claw3D-style layout
│   └── minimal/      # Single room + dashboard
└── docs/
```

### CLI Commands

| Command | Purpose |
|---------|---------|
| `npx diorama init [name]` | Scaffold new project from template |
| `npx diorama dev` | Dev server with builder UI + hot reload |
| `npx diorama build` | Production build (static export or Node server) |
| `npx diorama add <plugin>` | Install plugin and register in config |

## Extraction Map: Claw3D to Diorama

| Component | Claw3D Source | Diorama Destination | Work |
|-----------|--------------|---------------------|------|
| 3D rendering (R3F canvas, lighting) | `aegis-office/AegisOffice3D.tsx` | `@diorama/engine` | Extract, parameterize |
| Agent figures + animations | `aegis-office/objects/AgentFigure.tsx` | `@diorama/engine` | Extract as-is |
| Room geometry (walls, floors) | `aegis-office/objects/shared.tsx` | `@diorama/engine` | Generalize dimensions |
| Individual rooms (warRoom, testLab, etc.) | `aegis-office/objects/*.tsx` | `@diorama/plugins` (RoomPlugins) | Wrap as plugins |
| Event detection patterns | `lib/office/aegisEventTriggers.ts` | `@diorama/plugins` (SourcePlugin) | Make patterns configurable |
| Event reducer | `aegis-office/systems/aegisEventReducer.ts` | Split per room plugin | Decompose |
| Gateway client | `lib/gateway/GatewayClient.ts` | `@diorama/plugins` (SourcePlugin) | Extract |
| Builder store (undo/redo) | `office/state/useOfficeBuilderStore.ts` | `@diorama/ui` | Generalize for grid |
| Coordinate transforms | `aegis-office/core/geometry.ts` | `@diorama/engine` | Extract |
| Camera system | `aegis-office/systems/` | `@diorama/engine` | Extract, make configurable |

## New Components (Not in Claw3D)

| Component | Package | Description |
|-----------|---------|-------------|
| Plugin system | `@diorama/engine` | Registration, lifecycle, dependency resolution |
| Config schema + loader | `@diorama/engine` | JSON schema, validation, env var resolution |
| CLI (init, dev, build, add) | `@diorama/cli` | Scaffolding, dev server wrapper |
| 2D top-down view | `@diorama/plugins` | New lightweight renderer |
| Dashboard view | `@diorama/plugins` | Card-based status UI |
| Template system | `@diorama/cli` | Template catalog, scaffolding |
| Grid-based room placement | `@diorama/ui` | New builder with grid snapping |

## Verification

1. `npx diorama init test-office` scaffolds a working project
2. `npx diorama dev` starts and opens browser with builder UI
3. Adding/moving rooms in builder updates `diorama.config.json`
4. Connecting to a local OpenClaw gateway shows live agent events
5. Switching view modes (3D/2D/dashboard) works without config changes
6. Built-in templates render correctly in all three view modes
7. Installing a community room plugin and adding it to config works
