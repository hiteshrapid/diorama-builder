# Diorama — Project Knowledge

Configurable 3D workspace visualizer for OpenClaw. Users build spatial layouts for AI agents with rooms, furniture, and themes via a wizard, then watch agents in real time.

## Monorepo Structure

npm workspaces — 8 packages under `packages/`:

| Package | Path | Purpose |
|---------|------|---------|
| `@diorama/engine` | `packages/engine` | Core: config (Zod), plugin registry, event bus + global broadcaster, geometry, agent state, activity state, room graph/pathfinding, room presets, auto-layout, furniture catalog, floor textures |
| `@diorama/plugins` | `packages/plugins` | Source plugins (OpenClaw gateway w/ Ed25519, mock data), theme plugins (neon-dark, warm-office, cyberpunk, minimal) |
| `@diorama/ui` | `packages/ui` | Builder store (reducer, 12 action types, undo/redo), config sync, room catalog |
| `@diorama/cli` | `packages/cli` | Scaffolding (`diorama init`), templates, `startServer()` extracted for reuse by MCP |
| `@diorama/app` | `packages/app` | Next.js 15 app: wizard, R3F 3D scene, builder sidebar, spatial editor, event+config API routes |
| `@diorama/mcp` | `packages/mcp` | MCP (Model Context Protocol) server — 6 tools: start, open_wizard, get_config, add_room, set_theme, emit_event. Stdio transport. Shares broadcaster w/ app |
| `@diorama/client` | `packages/client` | Tiny runtime helper: `dioramaEmit({ type, room, agent, payload })` — fire-and-forget POST to `/api/events/emit`. User's agent code imports this |
| `@diorama/setup` | `packages/setup` | Skill toolkit (pure Node): `scanOpenClawWorkspace`, `proposeEvents`, `registerMcpInOpenClaw`, session read/write |

## Tech Stack

- React 19, Next.js 15.3, TypeScript 5.7
- Three.js r175, @react-three/fiber 9, @react-three/drei 10
- Zod (config validation), Vitest 3.1 (testing)
- No CSS frameworks — all inline styles

## Commands

Node requirement: `/opt/homebrew/opt/node@22/bin/node` (system node may not work).

```bash
# Run all tests (485+ across engine, plugins, ui, cli, mcp, setup, client)
/opt/homebrew/opt/node@22/bin/node node_modules/.bin/vitest run

# Dev server (port 3456)
PATH="/opt/homebrew/bin:$PATH" npx next dev -p 3456

# Typecheck individual packages
/opt/homebrew/opt/node@22/bin/node node_modules/.bin/tsc --project packages/engine/tsconfig.json --noEmit
/opt/homebrew/opt/node@22/bin/node node_modules/.bin/tsc --project packages/app/tsconfig.json --noEmit

# Build all composite packages (required for MCP; `dist/bin.js` is what .mcp.json points to)
/opt/homebrew/opt/node@22/bin/node node_modules/.bin/tsc --build

# Build Next.js
PATH="/opt/homebrew/bin:$PATH" npx next build

# Install as a Claude Code plugin (from repo root)
claude plugins install "$(pwd)"
```

## Architecture

### Coordinate System
- Canvas: 1800×1000, GRID_UNIT = 200 canvas units
- World: scale 0.018 → 1 grid cell = 3.6 world units (GRID_WORLD)
- Room positions/sizes are in grid units, converted for rendering

### Wizard Flow
1. **Connect** — Gateway URL + token, or demo mode
2. **Build Your Office** — Spatial editor (3D view) with sidebar (rooms, agents, theme, furniture tabs)
3. **Configure Agents** — Seat assignment, allowed rooms, energy level per agent
4. **Launch** — Save config to `~/.diorama/config.json`

### Scene (R3F)
- `BuildStep.tsx` — Main component: manages state (useReducer), sidebar, toolbar (Select + undo/redo)
- `BuildStep3D.tsx` — Canvas with PerspectiveCamera (3D only), OrbitControls
  - `CameraSync` component: imperatively centers camera + OrbitControls target on `roomsCenter` (world-space centroid of all rooms via `toWorld()`)
  - Directional + ambient lighting (`meshStandardMaterial`), glass walls, neon edge glow
- `Room3D.tsx` — Renders floor mesh, walls, labels, furniture, selection highlight
  - Full 3D furniture via `RoomFurniture3D`, dimension callouts on all 4 edges when selected
  - Floor texture rendering: procedural canvas textures (512x512) via `drawFloorPattern()`, applied as `meshStandardMaterial` map + emissive self-illumination (`emissiveIntensity: 0.3`) to ensure patterns visible in dark themes
  - Three-tier floor style resolution: per-room override > preset+theme default > "solid" fallback
- `ProToolbar.tsx` — Select indicator + undo/redo buttons
- Hooks: `useDragRoom` (drag-to-move with grid snap), `useResizeRoom` (8-handle resize), `useFurniturePlacement` (click-to-place)
- All hooks use ref-based patterns for R3F event handlers (avoid stale closures)
- Sidebar scroll: `minHeight: 0` + `overflow: hidden` on flex containers in the height chain (wizard page → BuildStep → sidebar)

### Builder Store (`@diorama/ui`)
- `builderReducer` with actions: ADD_ROOM, REMOVE_ROOM, MOVE_ROOM, RESIZE_ROOM, SELECT_ROOM, SET_ROOM_COLORS, SET_FLOOR_STYLE, ADD_FURNITURE, REMOVE_FURNITURE, UNDO, REDO
- Full undo/redo via past/future history stacks

### Room Presets
5 types: meeting, workspace, private, social, lab — each with theme-dependent furniture and floor/wall colors.

### Themes
4 built-in: neon-dark (sci-fi), warm-office (modern), cyberpunk, minimal. Each exports `colors` (background, accent) and furniture material definitions.

## Conventions

- All app components use `"use client"` directive
- Inline styles throughout (no Tailwind, no CSS modules)
- Dark theme: layered surfaces from `packages/app/lib/tokens.ts` — `bg0: #0a1018` (page), `bg1: #0f1620` (sidebar/panels), `bg2: #1a2535` (active tab / hover), `bg3: #263143` (disabled). Borders `#1f2b3d`. Accent `#5b8def` reserved for primary CTAs.
- Engine exports pure functions; React/Three.js code lives only in `packages/app`
- Type scale: `Inter` (body/headings, via `next/font/google`), `JetBrains Mono` (small labels, code). Both wired via CSS variables `--font-inter`, `--font-mono`

## Plugin & MCP Integration

Diorama is distributed as a **Claude Code plugin**. Top-level plugin files:

- `.claude-plugin/plugin.json` — manifest
- `commands/diorama.md` — `/diorama` slash command (delegates to skill)
- `.mcp.json` — auto-registers the MCP server on plugin install (`node ${CLAUDE_PLUGIN_ROOT}/packages/mcp/dist/bin.js`)
- `skills/diorama-setup/SKILL.md` — 11-step orchestration skill: launch builder → scan OpenClaw → interview → propose events → write integration code → register MCP → launch live view

### MCP server (`packages/mcp`)

Stdio transport via `@modelcontextprotocol/sdk` low-level `Server` pattern (sidesteps Zod version conflicts). 6 tools:

| Tool | Purpose |
|------|---------|
| `diorama_start({ route })` | Spawn/ensure Next.js app running, open browser to `/builder`, `/live`, or `/` |
| `diorama_open_wizard` | Shortcut for `/builder` |
| `diorama_get_config({ waitForSave })` | Read `~/.diorama/config.json`; long-poll (up to 10m) for Save & Continue signal |
| `diorama_add_room` | POST to `/api/config/rooms` |
| `diorama_set_theme` | POST to `/api/config/theme` |
| `diorama_emit_event` | POST to `/api/events/emit` (fan-out to live browser) |

Lifecycle: first tool call runs `startServer()` (exported from `@diorama/cli`) in-process, stores PID + port in `~/.diorama/runtime.json`. Subsequent calls probe `/api/health` and reuse. Shared broadcaster singleton in `@diorama/engine` (`getGlobalBroadcaster()`) ensures MCP-emitted events and real gateway events fan out through the same WS pipe (`/api/events/stream`).

### User-code integration (`@diorama/client`)

Zero-dependency helper the user's agent code imports:

```typescript
import { dioramaEmit } from "@diorama/client";
await dioramaEmit({ type: "reviewer.ticket.approved", room: "reviewer-room", agent: "reviewer", payload: {...} });
```

Fire-and-forget POST to `/api/events/emit` (URL configurable via `DIORAMA_URL`). Never throws — agents must not fail when Diorama is down.

### Setup toolkit (`packages/setup`)

Pure Node library the skill invokes via `node -e 'require("@diorama/setup/dist/index.js")...'`:

- `scanOpenClawWorkspace(homeDir)` — reads `~/.openclaw/openclaw.json` + `workspace/` for agent list, MCP servers, `.md` files
- `proposeEvents(scan, transcript)` — seeds one event proposal per agent using verb-to-visual map (`submit→sending`, `review→reviewing`, `test→testing`, etc.)
- `registerMcpInOpenClaw(homeDir, name, entry)` — idempotent write of `mcp.servers.<name>` into the user's openclaw.json (shallow-equal check to avoid redundant writes)
- `writeSetupSession`, `readSetupSession`, `clearSetupSession` — persist interview state to `~/.diorama/setup-session.json`

### New API routes (for MCP control plane)

- `POST /api/events/emit` — receives `DioramaEvent`, validates, hands off to global broadcaster
- WS `/api/events/stream` — browser subscription, wired in `packages/cli/src/server.ts` upgrade handler alongside `/api/gateway/ws`
- `POST /api/config/rooms` — append a room
- `POST /api/config/theme` — update theme
- `POST /api/config/mappings` — set `events.mappings` (user's approved list)
- `POST /api/setup/continue` — save-done signal; `GET` returns `{ savedAt: number }` for MCP long-poll
- `GET /api/health` — `{ ok: true, port, version }`

### Shared config mutator (`packages/app/lib/configStore.ts`)

All mutation routes go through `mutateConfig(fn)`:

```typescript
export function mutateConfig(mutator): MutateResult {
  try {
    const current = readRawConfig();
    const next = mutator(current);
    const parsed = parseConfig(next);
    writeConfig(parsed);
    return { ok: true, config: parsed };
  } catch (err) { /* returns { ok: false, status, error } */ }
}
```

Wraps the entire read-mutate-validate-write cycle in one try/catch. Validation failures return 400 (via `DioramaConfigError`), disk errors 500.

## Key Files

- `packages/app/app/wizard/page.tsx` — Wizard step flow
- `packages/app/components/wizard/BuildStep.tsx` — Spatial editor main (state, sidebar, toolbar)
- `packages/app/components/wizard/BuildStep3D.tsx` — R3F canvas (cameras, CameraSync, lighting, OrbitControls)
- `packages/app/components/scene/Room3D.tsx` — Room rendering (3D full)
- `packages/app/components/scene/RoomFurniture3D.tsx` — 3D furniture geometry rendering
- `packages/app/components/scene/ResizeHandles.tsx` — 8-handle room resize
- `packages/app/components/scene/DragGroundPlane.tsx` — Invisible ground plane for drag tracking + click-to-deselect
- `packages/app/components/scene/AlignmentGuides.tsx` — Snap alignment guides
- `packages/app/components/scene/GLBFurniture.tsx` — GLB model loading for furniture
- `packages/app/components/wizard/ProToolbar.tsx` — Toolbar: Select indicator + undo/redo
- `packages/app/components/builder/BuilderSidebar.tsx` — Sidebar with tabs (rooms, agents, theme, furniture)
- `packages/app/components/builder/FurnitureCatalogPanel.tsx` — Furniture catalog in sidebar
- `packages/app/components/builder/FloorStylePicker.tsx` — Floor texture selection
- `packages/app/hooks/useDragRoom.ts` — Drag-to-move with grid snap
- `packages/app/hooks/useResizeRoom.ts` — 8-handle resize
- `packages/app/hooks/useFurniturePlacement.ts` — Click-to-place furniture
- `packages/app/hooks/useAlignmentDetection.ts` — Alignment/snap detection
- `packages/app/components/wizard/AgentBehaviorStep.tsx` — Wizard step 3: agent seat, room access, energy
- `packages/app/components/LiveView.tsx` — Live 3D view with pathfinding-driven agent movement
- `packages/engine/src/roomGraph.ts` — Room connectivity graph, BFS pathfinding, waypoint generation
- `packages/engine/src/agentState.ts` — Agent state machine, energy-based idle pose
- `packages/engine/src/activityState.ts` — Activity derivation (event type + room preset → visual activity)
- `packages/app/components/scene/ActivityIndicator3D.tsx` — Activity icons + agent name labels above heads
- `packages/app/components/ActivityFeed.tsx` — Rolling event log panel (bottom-left overlay)
- `packages/engine/src/roomPresets.ts` — Preset definitions + furniture per theme
- `packages/engine/src/furnitureCatalog.ts` — 20-item catalog (4 categories)
- `packages/engine/src/floorTexture.ts` — 5 floor texture styles
- `packages/engine/src/geometry.ts` — `toWorld()`, `toCanvas()`, coordinate conversion
- `packages/ui/src/builderStore.ts` — Reducer + undo/redo (12 action types)

## Changelog

### 2026-04-08 — Floor Style Fix (4 bugs)

Fixed floor texture system that broke after 2D view removal:

1. **Floor textures invisible in 3D** — Dark theme colors made patterns unreadable under `meshStandardMaterial` lighting. Added emissive self-illumination (`emissive="#ffffff"`, `emissiveMap`, `emissiveIntensity=0.3`) to textured floor material in `Room3D.tsx`.
2. **Custom room preset default mismatch** — Custom rooms fell back to workspace preset (carpet) instead of solid. Removed stale workspace fallback in `Room3D.tsx`.
3. **Floor style/colors/furniture lost on config save** — `BuilderSidebar.tsx` `configToRooms()` and save effect only copied core fields. Added conditional spread for `colors`, `floorStyle`, `furniture`.
4. **`drawFloorPattern` missing default case** — Invalid floor style silently rendered transparent. Added solid-color default case in `floorTexture.ts`.

Tests added: 15 new tests across `floorTexture.test.ts`, `roomPresets.test.ts`, `builderStore.test.ts`, `config.test.ts`. Total: 372+.

### 2026-04-08 — Click-to-Deselect Rooms

Clicking empty space in the 3D scene now deselects the selected room. Previously `onPointerMissed` on the Canvas never fired because the `DragGroundPlane` mesh intercepted all empty-space clicks.

- Added `onPointerDown` prop to `DragGroundPlane.tsx` that dispatches `SELECT_ROOM` with `null`
- Optimized `builderReducer` SELECT_ROOM to short-circuit when selection unchanged (same state ref)
- 3 new tests in `builderStore.test.ts`. Total: 378+.

### 2026-04-09 — Agent Behavior System

Added pathfinding, energy system, and agent behavior wizard step:

- **Room graph & pathfinding** (`roomGraph.ts`) — Builds connectivity graph from room positions/doors, BFS shortest path, world-space waypoint generation for smooth agent movement between rooms
- **Agent behavior wizard step** (`AgentBehaviorStep.tsx`) — New step 3: seat assignment (dropdown grouped by room), allowed-rooms checkboxes, energy slider (0=calm, 1=restless) per agent
- **Wizard expanded** from 3 to 4 steps: Connect → Build → Configure Agents → Launch
- **Agent state extended** (`agentState.ts`) — Energy field (0–1 float) drives idle animation speed/magnitude via `computeIdlePose()`
- **LiveView enhanced** (`LiveView.tsx`) — Pathfinding-driven movement, energy-based idle animation, room access control
- **Config schema extended** (`config.ts`) — `seat`, `allowedRooms`, `energy` fields added to agent config
- Fixed `catalogItemToFurniture` rug rotation bug: `defaultRotation` now applied regardless of `glbPath`
- Deduplicated `AgentBehavior` interface: `LaunchStep.tsx` imports from `AgentBehaviorStep.tsx`
- Tests: 10 new pathfinding tests in `roomGraph.test.ts`, 6 new agent state tests. Total: 395+.

### 2026-04-09 — Agent Activity Visualization

Agents now show what they're doing, not just where they are. Activity is auto-derived from gateway events — no user mapping needed.

- **Activity state engine** (`activityState.ts`) — Pure-function module: 8 activity types (idle, talking, working, testing, presenting, listening, sending, reviewing). `deriveActivity(eventType, roomPreset)` pattern-matches event type first, falls back to room preset semantics. `formatEventLabel()` generates human-readable feed labels.
- **Activity indicators** (`ActivityIndicator3D.tsx`) — Html overlays above agent heads showing activity icon (speech bubble, microscope, satellite, etc.) with animated dots (talking/working) or CSS pulse (testing/sending), plus agent name label always visible.
- **Activity feed** (`ActivityFeed.tsx`) — Rolling log panel (bottom-left) showing last 15 events with agent color dots, readable labels, and relative timestamps. Auto-scrolls, updates every second.
- **LiveView wiring** — Activity derivation runs on every event regardless of pathfinding success. Activity timeout (8s) returns agents to idle. Random room fallback when event room names don't match config rooms (demo mode compatibility).
- **AgentFigure3D** extended with `activity` prop to render `ActivityIndicator3D`.
- Tests: 27 new activity state tests. Total: 422+.

### 2026-04-09 — Live View Fix (Camera + Auto-Seating)

Fixed the live view (post-wizard `/` page) which was completely broken — camera pointed at origin while rooms rendered elsewhere, agents spawned at wrong coordinates.

- **DioramaScene** (`DioramaScene.tsx`) — Added `center` prop and `CameraSync` component (same pattern as `BuildStep3D.tsx`). Camera dynamically positions at `[centerX, 20, centerZ + 15]` looking at room centroid. Falls back to default position when no center provided.
- **LiveView rewrite** (`LiveView.tsx`) — Calculates `roomsCenter` from config rooms using `toWorld()` (same as wizard). Passes center to DioramaScene. Agents auto-seat in chairs: builds seat pool from room furniture, assigns round-robin, places at chair world positions with `mode: "seated"`. Overflow agents stand near room center.
- **Stripped pathfinding from events** — Agents stay seated. Events trigger activity indicators + room glow + feed entries only. No walking/movement complexity.
- **Removed imports**: `buildRoomGraph`, `findRoomPath`, `generateWaypoints`, `findRoomContaining`, `updateAgentState`.

### 2026-04-21 — Claude Code Plugin + MCP (from CLI to `/diorama`)

Diorama went from a standalone Next.js app to a **Claude Code plugin** that does the whole integration dance for the user. One `/diorama` command now: opens the builder, scans the user's OpenClaw workspace, interviews them, proposes events with file:line citations, writes the `dioramaEmit()` calls into their agent code via CC's Edit tool, registers itself in `~/.openclaw/openclaw.json`, and launches the live view.

**Plugin scaffolding (top-level):**
- `.claude-plugin/plugin.json` — manifest
- `commands/diorama.md` — `/diorama` slash command
- `.mcp.json` — auto-registers the MCP on install (`node ${CLAUDE_PLUGIN_ROOT}/packages/mcp/dist/bin.js`)
- `skills/diorama-setup/SKILL.md` — 11-step orchestration skill

**New packages:**
- `@diorama/mcp` — Stdio MCP server using `@modelcontextprotocol/sdk` low-level `Server` pattern. 6 tools (`diorama_start`, `diorama_open_wizard`, `diorama_get_config` with long-poll `waitForSave`, `diorama_add_room`, `diorama_set_theme`, `diorama_emit_event`). Lifecycle in `lifecycle.ts` reuses `startServer()` from `@diorama/cli` in-process; stores PID+port in `~/.diorama/runtime.json` and reuses across invocations via `/api/health` probe.
- `@diorama/client` — zero-dep `dioramaEmit()` fire-and-forget POST helper the user's agent code imports
- `@diorama/setup` — pure Node library: `scanOpenClawWorkspace`, `proposeEvents` (verb→visual map), `registerMcpInOpenClaw` (idempotent shallow-equal mutator), setup session R/W

**New API routes (`packages/app/app/api/`):**
- `events/emit` POST, `events/stream` WS (wired in `packages/cli/src/server.ts` upgrade handler alongside `/api/gateway/ws`)
- `config/rooms`, `config/theme`, `config/mappings` POST — all go through shared `mutateConfig()` in `packages/app/lib/configStore.ts`
- `setup/continue` POST/GET — save-done signal + MCP long-poll target
- `health` GET

**Global broadcaster:** `getGlobalBroadcaster()` in `@diorama/engine` uses `globalThis.__dioramaBroadcaster` singleton so Next.js route handlers and the CLI's WS upgrade handler share one event bus. Live view's `useDioramaEvents` hook accepts the same external bus as `useGatewayEvents` to unify rendering.

**Save & Continue handoff:** `LaunchStep.tsx` POSTs to `/api/setup/continue` after a successful `/api/config` save. The MCP's `diorama_get_config({ waitForSave: true })` polls `GET /api/setup/continue` every 1s until `savedAt >= startedAt`, then returns the saved config.

**UI polish (Step 11):** New design tokens in `packages/app/lib/tokens.ts` (layered surfaces `bg0-bg3`, reserved `accent: #5b8def` for CTAs). `app/layout.tsx` wired with `next/font/google` for Inter + JetBrains Mono. `BuildStep.tsx` sidebar migrated off flat `#0d1520` onto layered tokens.

**CLI refactor:** `startServer()` extracted from `packages/cli/src/bin.ts` into `packages/cli/src/server.ts` so MCP can reuse it in-process. CLI `bin.ts` gains `mcp` subcommand that delegates to `@diorama/mcp`.

**Tests added:** 8 MCP tool shape tests, 28 setup tests (scanner/proposer/mutator/session), plus broadcaster + client tests. Total: 485+.

**Shipping flow:**
```bash
npm install            # runs prepare → tsc --build → generates all dist/ including packages/mcp/dist/bin.js
claude plugins install "$(pwd)"
# in a new Claude Code session:
> /diorama
```
