# Diorama

Configurable 3D workspace visualizer for [OpenClaw](https://github.com/openclaw). Build custom layouts for your AI agents with a spatial design tool — add rooms, choose themes, and watch your office take shape in real time.

## Quick Start

```bash
npx diorama init my-office
cd my-office
npx diorama dev
```

This scaffolds a project with a `diorama.config.json` that drives the entire layout.

## How It Works

Diorama uses a preset-based room system with theme-dependent furniture. No hardcoded room types — you build your office from 5 generic room presets, and the furniture morphs based on your chosen theme.

### Room Presets

| Preset | Purpose | Default Size |
|--------|---------|-------------|
| **Meeting** | Group discussions, strategy sessions | 4x3 |
| **Workspace** | Individual desks, general work | 5x4 |
| **Private** | 1:1 meetings, focus work | 2x2 |
| **Social** | Break room, casual hangouts | 3x3 |
| **Lab** | Testing, experiments, whiteboards | 4x4 |

Each preset renders different furniture per theme:
- **Sci-Fi (neon-dark):** Holo-tables, pod workstations, floating chairs
- **Modern Office (warm-office):** Wood tables, cubicle desks, couches
- **Cyberpunk:** Neon-edge tables, wireframe chairs, glitch screens
- **Minimal:** Clean white surfaces, simple geometry

### Plugin Types

| Type | What it does | Examples |
|------|-------------|----------|
| **View** | A rendering mode | `3d-office`, `dashboard` |
| **Source** | A data connection | `openclaw-gateway`, `mock-data` |
| **Theme** | Colors, lighting, mood | `neon-dark`, `warm-office`, `cyberpunk`, `minimal` |

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
    { "preset": "meeting", "position": [0, 0], "size": [4, 3], "label": "Strategy Room" },
    { "preset": "workspace", "position": [4, 0], "size": [5, 4], "label": "Workspace" },
    { "preset": "lab", "position": [0, 3], "size": [4, 4], "label": "Lab" }
  ],
  "agents": {
    "aegis-prime": { "desk": "strategy-room-desk-1", "color": "#6366f1" }
  }
}
```

Environment variables (like `$OPENCLAW_TOKEN`) are resolved at runtime.

## Onboarding Wizard

Running `npx diorama` without a config launches a 3-step wizard:

1. **Connect** — Enter gateway URL + token, or use demo data
2. **Build Your Office** — Live 3D viewport + sidebar with room presets, agent assignment, and theme switcher. Click a preset to auto-place a room, see it appear instantly in 3D.
3. **Launch** — Review and save your layout

## Templates

Three built-in templates when you run `npx diorama init`:

- **starter** — 3 rooms (meeting, workspace, lab), neon-dark theme, 3D view
- **full-office** — 7 rooms with all 5 presets, neon-dark theme
- **minimal** — single workspace room with dashboard view

## Builder UI

When running `npx diorama dev`, a sidebar lets you:

- Add rooms from 5 preset types with auto-placement
- Select rooms in 3D to edit properties
- Resize rooms, update labels
- Switch themes — furniture morphs in real time
- Assign agents to rooms
- Undo/redo with full history

Changes auto-save to `diorama.config.json`.

## Packages

| Package | Purpose |
|---------|---------|
| `@diorama/engine` | Core: config, plugin registry, event bus, geometry, agent state, room presets, auto-layout |
| `@diorama/plugins` | Sources (OpenClaw gateway, mock data), themes (4 built-in) |
| `@diorama/cli` | Project scaffolding and dev server |
| `@diorama/ui` | Builder store with grid editor and undo/redo |
| `@diorama/app` | Next.js app with 3D scene, wizard, and builder sidebar |

## Architecture

```
OpenClaw Gateway (ws://...)
    |
    v
Diorama Dev Server (localhost:3000)
    |-- Reads ~/.diorama/config.json
    |-- WebSocket proxy to gateway (Ed25519 auth server-side)
    |-- Serves Next.js app
    |
    v
Browser
    |-- Source plugin receives gateway events
    |-- Events normalized to { type, room, agent, payload, timestamp }
    |-- EventBus broadcasts events
    |-- Generic visualization: agent figures pulse, room glows on activity
    |-- Room3D renders preset furniture per theme
```

## Development

```bash
npm install
npm test          # run all 192 tests
npm run typecheck # type checking
```

Tests cover: config validation, plugin registration, coordinate transforms, event dispatch, room presets (furniture data for all themes), auto-layout placement, CLI scaffolding, template validation, builder undo/redo, overlap detection, config sync, and full integration flows.

## License

MIT
