# Diorama MVP v2 — Re-scoped

**Date:** 2026-04-06
**Status:** Design (replaces original spec)

## What Changed

The original spec over-focused on library architecture (plugins, registries, CLI scaffolding). The actual product is simpler and more powerful: **one command, browser opens, guided wizard, live 3D world.**

## Product in One Sentence

`npx diorama` opens a web app that connects to your OpenClaw gateway, walks you through setup, auto-generates a 3D workspace from your agents, and lets you customize it.

## User Flow

```
1. npx diorama
   └─ Starts local web server at localhost:3000
   └─ Opens browser automatically

2. First run → Setup Wizard
   ├─ Step 1: Connect — enter gateway URL + token → validates connection
   ├─ Step 2: Discovery — shows detected agents (names, roles, count)
   ├─ Step 3: Theme — pick style: Sci-Fi / Modern Office / Cyberpunk / Minimal
   ├─ Step 4: Preview — auto-generated layout based on agents + theme
   └─ Step 5: Done — saves config, enters live view

3. Live View
   ├─ 3D world with rooms, agents at desks, live gateway events
   ├─ Builder sidebar (always accessible) to tweak layout
   └─ View mode toggle (3D / 2D / Dashboard)

4. Subsequent runs → Straight to live view (config persisted locally)
```

## What Gets Auto-Generated

When we discover agents from the gateway, we analyze:
- **Agent count** → determines office size
- **Agent names/roles** → suggests room types and desk assignments
- **Theme choice** → applies color palette, lighting, materials

Example: User has agents `aegis-prime`, `herald`, `sentinel`, `scribe`, `contrarian`
→ Auto-generates: Council Chamber (aegis-prime + contrarian), Comms Hub (herald), Test Lab (sentinel), Archive (scribe), shared Bullpen

## Technical Architecture

```
npx diorama
    │
    ▼
Next.js app (localhost:3000)
    ├── /               → Wizard (first run) or Live View (saved config)
    ├── /api/gateway/ws → WebSocket proxy to OpenClaw gateway
    └── /api/config     → Read/write local config
        │
        ▼
~/.diorama/config.json  → Persisted layout, theme, gateway settings
```

### Why Next.js (same as Claw3D)

- Same stack we're extracting from → easier to reuse components
- Server routes for gateway proxy (same pattern as Claw3D's studio)
- React for UI + Three.js/R3F for 3D rendering
- `npx` can run it directly

## What We Reuse from Claw3D

| Component | Claw3D Source | Reuse How |
|-----------|-------------|-----------|
| 3D room rendering | `aegis-office/objects/*.tsx` | Extract, parameterize colors from theme |
| Agent figures | `AgentFigure.tsx` | Extract as-is, themeable badge colors |
| Floor/wall geometry | `objects/shared.tsx` | Already extracted to engine |
| Camera system | `aegis-office/systems/` | Extract |
| Gateway proxy | `server/gateway-proxy.js` | Adapt for Diorama's Next.js API routes |
| Event detection | `aegisEventTriggers.ts` | Reuse patterns |

## What We Reuse from Current Diorama Code

| Module | Status | Reuse |
|--------|--------|-------|
| `@diorama/engine` config parser | Done | Config validation |
| `@diorama/engine` event bus | Done | Event dispatch |
| `@diorama/engine` geometry | Done | Coordinate transforms |
| `@diorama/engine` agent state | Done | Walk/sit/idle state machine |
| `@diorama/engine` scene config | Done | Camera/lighting defaults |
| `@diorama/engine` room primitives | Done | Floor/wall generation |
| Room plugin reducers | Done | State management for rooms |
| Gateway protocol + client | Done | Real gateway connection with Ed25519 auth |
| Builder store | Done | Undo/redo, overlap detection |
| Theme system | Done | Apply theme to scene config |

## What's New to Build

### 1. Next.js App Shell
- `npx diorama` entry point that starts the Next.js dev server
- Pages: `/` (wizard or live view), config API routes
- Gateway WebSocket proxy route

### 2. Setup Wizard (React)
- Step 1: Gateway connection form + validation
- Step 2: Agent discovery display (list agents from gateway)
- Step 3: Theme picker (visual previews of each theme)
- Step 4: Auto-generated layout preview (uses builder store + room primitives)
- Step 5: Save to `~/.diorama/config.json`

### 3. Auto-Layout Generator
- Input: discovered agents + chosen theme
- Output: room placements + desk assignments
- Logic: map agent roles to room types, arrange on grid, avoid overlaps

### 4. Live 3D View (React Three Fiber)
- Extract Claw3D's room components, make colors/materials theme-driven
- Connect event bus to gateway client → room reducers → 3D state
- Agent figures at desks, walking, idle animations

### 5. Builder Sidebar (React)
- Room catalog, drag to add
- Click room to configure (label, color)
- Agent assignment dropdowns
- Theme/view switcher
- Uses existing builder store

### 6. Config Persistence
- `~/.diorama/config.json` — gateway URL, token, layout, theme, agent assignments
- On startup: if config exists → skip wizard, load directly into live view
- Reset/reconfigure option in UI

## Themes

Each theme defines:
- Background color + fog
- Ambient light color + intensity
- Room floor/wall colors
- Neon accent color per room
- Wall material (glass opacity, emissive glow)
- Agent badge color

**Built-in themes:**
- **Sci-Fi** — dark background, neon glows (current Claw3D look)
- **Modern Office** — warm beige/wood tones, soft lighting
- **Cyberpunk** — dark with magenta/cyan neon, high contrast
- **Minimal** — light gray, no glow, clean lines

## MVP Scope Boundary

**In scope:**
- One command to run
- Wizard on first run
- Auto-discovery of agents
- Auto-layout generation
- Live 3D view with real gateway events
- Builder sidebar for customization
- 4 themes
- Local config persistence

**Out of scope for MVP:**
- Community plugins / npm plugin install
- 2D top-down view (just 3D + dashboard for now)
- Multiple workspaces
- Remote/hosted mode
- Sharing layouts between users

## Verification

1. `npx diorama` starts server, opens browser
2. Wizard connects to local gateway, shows discovered agents
3. Picking a theme generates a layout preview
4. Completing wizard saves config and shows live 3D view
5. Real gateway events update room states (agents move, lights change)
6. Builder sidebar can add/move/resize rooms
7. Closing and re-running `npx diorama` loads saved config directly
