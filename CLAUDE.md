# Diorama — Project Knowledge

Configurable 3D workspace visualizer for OpenClaw. Users build spatial layouts for AI agents with rooms, furniture, and themes via a wizard, then watch agents in real time.

## Monorepo Structure

npm workspaces — 5 packages under `packages/`:

| Package | Path | Purpose |
|---------|------|---------|
| `@diorama/engine` | `packages/engine` | Core: config (Zod), plugin registry, event bus, geometry/coordinates, agent state, room presets (5 presets × 4 themes), auto-layout, furniture catalog (20 items), floor textures (5 styles) |
| `@diorama/plugins` | `packages/plugins` | Source plugins (OpenClaw gateway w/ Ed25519, mock data), theme plugins (neon-dark, warm-office, cyberpunk, minimal) |
| `@diorama/ui` | `packages/ui` | Builder store (reducer, 12 action types, undo/redo), config sync, room catalog |
| `@diorama/cli` | `packages/cli` | Scaffolding (`diorama init`), templates (starter, full-office, minimal) |
| `@diorama/app` | `packages/app` | Next.js 15 app: 3-step wizard, R3F 3D scene, builder sidebar, spatial editor |

## Tech Stack

- React 19, Next.js 15.3, TypeScript 5.7
- Three.js r175, @react-three/fiber 9, @react-three/drei 10
- Zod (config validation), Vitest 3.1 (testing)
- No CSS frameworks — all inline styles

## Commands

Node requirement: `/opt/homebrew/opt/node@22/bin/node` (system node may not work).

```bash
# Run all tests (372+ across engine, plugins, ui, cli)
/opt/homebrew/opt/node@22/bin/node node_modules/.bin/vitest run

# Dev server (port 3456)
PATH="/opt/homebrew/bin:$PATH" npx next dev -p 3456

# Typecheck individual packages
/opt/homebrew/opt/node@22/bin/node node_modules/.bin/tsc --project packages/engine/tsconfig.json --noEmit
/opt/homebrew/opt/node@22/bin/node node_modules/.bin/tsc --project packages/app/tsconfig.json --noEmit

# Build
PATH="/opt/homebrew/bin:$PATH" npx next build
```

## Architecture

### Coordinate System
- Canvas: 1800×1000, GRID_UNIT = 200 canvas units
- World: scale 0.018 → 1 grid cell = 3.6 world units (GRID_WORLD)
- Room positions/sizes are in grid units, converted for rendering

### Wizard Flow
1. **Connect** — Gateway URL + token, or demo mode
2. **Build Your Office** — Spatial editor (3D view) with sidebar (rooms, agents, theme, furniture tabs)
3. **Launch** — Save config to `~/.diorama/config.json`

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
- Dark theme: `#0d1520` backgrounds, `#1a2535` borders, `#8090c0` accents
- Engine exports pure functions; React/Three.js code lives only in `packages/app`
- Monospace font: `'SF Mono', 'Fira Code', monospace`

## Key Files

- `packages/app/app/wizard/page.tsx` — Wizard step flow
- `packages/app/components/wizard/BuildStep.tsx` — Spatial editor main (state, sidebar, toolbar)
- `packages/app/components/wizard/BuildStep3D.tsx` — R3F canvas (cameras, CameraSync, lighting, OrbitControls)
- `packages/app/components/scene/Room3D.tsx` — Room rendering (3D full)
- `packages/app/components/scene/RoomFurniture3D.tsx` — 3D furniture geometry rendering
- `packages/app/components/scene/ResizeHandles.tsx` — 8-handle room resize
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
