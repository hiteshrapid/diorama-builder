# Diorama Onboarding Redesign: Spatial Design Tool

## Problem

The current onboarding hardcodes 7 Aegis-specific room types (council-chamber, test-lab, etc.) with typed event reducers. This only works for one pipeline. A user with 2 custom agents or 15 unknown-role agents gets a useless layout. The room model needs to be generic.

## Solution

Redesign onboarding as a spatial design tool — like an architecture/interior design app. Rooms are generic containers with visual presets. The wizard IS the builder: a live 3D viewport where you see your office take shape in real time.

---

## Architecture

### 3-Step Wizard Flow

**Step 1: Connect**
- Gateway URL + token form with "Test Connection" button
- "Use Demo Data" skip option for offline/demo use
- Reuses existing `ConnectStep.tsx` with minor updates

**Step 2: Build Your Office**
- Split-pane layout: live 3D viewport (left) + sidebar (right)
- Sidebar contains: room preset palette, agent assignment panel, theme switcher
- Click preset -> room auto-places at next open grid spot -> 3D updates instantly
- Rooms can be dragged to reposition, resized via sidebar, assigned agents
- Unassigned agents auto-drop into a "General" room created on launch

**Step 3: Launch**
- Summary of rooms created + agents assigned
- "Save & Launch" button saves config and navigates to live view

### 5 Generic Room Presets

Each preset defines a visual style (furniture, layout) that morphs based on the selected theme:

| Preset | Purpose | Default Size | Sci-Fi | Modern Office | Cyberpunk | Minimal |
|--------|---------|-------------|--------|---------------|-----------|---------|
| Meeting | Group discussions | 4x3 | Holo-table, floating chairs | Wood conference table | Neon-edge table, wire chairs | White slab |
| Workspace | Individual desks | 5x4 | Pod workstations | Cubicle desks | Neon-lit terminals | Clean desks |
| Private | 1:1, focus | 2x2 | Isolation pod | Glass office | Dark booth | Small cube |
| Social | Break room | 3x3 | Lounge pods | Couch + coffee table | Arcade corner | Bean bags |
| Lab | Testing/experiments | 4x4 | Holographic displays | Whiteboard + monitors | Glitch screens | Empty canvas |

### Data Model

```typescript
interface FurnitureItem {
  geometry: "box" | "cylinder" | "sphere" | "plane";
  size: [number, number, number];       // width, height, depth
  position: [number, number, number];   // offset within room
  rotation?: [number, number, number];  // euler angles
  material: {
    color: string;
    emissive?: string;
    wireframe?: boolean;
    opacity?: number;
  };
}

interface RoomPreset {
  id: string;                           // "meeting", "workspace", etc.
  label: string;                        // "Meeting Room"
  defaultSize: [number, number];        // grid units [width, depth]
  furnitureByTheme: Record<string, FurnitureItem[]>;
}
```

### Room Interaction: Auto-Place + Adjust

1. Click preset in palette -> room auto-snaps to next open grid position (row-packing)
2. Room appears instantly in 3D viewport with furniture for current theme
3. Drag room in 3D to reposition (grid-snapping)
4. Select room in 3D -> highlight + properties panel in sidebar
5. Resize, rename, or delete via sidebar

### Theme-Dependent Furniture

Furniture meshes are simple Three.js geometries (BoxGeometry, CylinderGeometry, etc.) composed per preset+theme combo. No external 3D model files.

Example — "Meeting" room in Cyberpunk theme:
- Table: BoxGeometry(3, 0.1, 1.5), emissive neon edges (accent color)
- Chairs: CylinderGeometry(0.2, 0.2, 0.8) x6, wireframe material
- Ambient: PointLight with accent color, intensity 0.5

### Generic Event Visualization

Remove all 7 Aegis-specific room plugins and their typed reducers. Rooms are visual containers only.

When gateway events arrive:
- Agent figures animate (pulse/bob) on any event mentioning their name
- Room accent glow pulses when events target agents in that room
- No event-type-specific logic

### Agent Assignment

- Discovered agents appear in sidebar list during Step 2
- Assign via dropdown or drag onto room in 3D
- Unassigned agents auto-placed in "General" room
- Agents get auto-distributed desk positions within their room

---

## Components

### New Files

| File | Purpose |
|------|---------|
| `packages/engine/src/roomPresets.ts` | `RoomPreset` type, `ROOM_PRESETS` array, `FurnitureItem` type, furniture data per theme |
| `packages/engine/src/roomPresets.test.ts` | Validate presets have furniture for all themes, sizes > 0 |
| `packages/app/components/wizard/BuildStep.tsx` | Split-pane wizard Step 2: 3D viewport + sidebar |
| `packages/app/components/wizard/BuildStep3D.tsx` | R3F Canvas for wizard builder |
| `packages/app/components/wizard/PresetPalette.tsx` | 5 preset cards with "Add" buttons |
| `packages/app/components/wizard/AgentAssignPanel.tsx` | Agent list with room assignment dropdowns |
| `packages/app/components/wizard/LaunchStep.tsx` | Summary + "Save & Launch" |
| `packages/app/components/scene/RoomFurniture3D.tsx` | Renders `FurnitureItem[]` as Three.js meshes |

### Modified Files

| File | Change |
|------|--------|
| `packages/engine/src/autoLayout.ts` | Rewrite: preset-based, no role-to-room mapping |
| `packages/engine/src/autoLayout.test.ts` | Update for new preset-based API |
| `packages/engine/src/config.ts` | `RoomConfig.type` -> `RoomConfig.preset` |
| `packages/engine/src/index.ts` | Export new types |
| `packages/plugins/src/index.ts` | Remove room plugin exports |
| `packages/ui/src/builderStore.ts` | Add `preset` to `RoomPlacement`, auto-place logic |
| `packages/app/app/wizard/page.tsx` | 3 steps instead of 5 |
| `packages/app/components/scene/Room3D.tsx` | Accept preset, render furniture children |
| `packages/app/components/scene/DioramaScene.tsx` | Click-to-select rooms |
| `packages/app/components/LiveView.tsx` | Generic event pulse instead of typed room state |
| `packages/app/components/builder/RoomCatalog.tsx` | Use presets instead of hardcoded catalog |
| `packages/app/components/builder/BuilderSidebar.tsx` | Adapt for presets |

### Deleted Files

| File | Reason |
|------|--------|
| `packages/plugins/src/rooms/*` (7 room plugins) | Aegis-specific, replaced by generic presets |
| `packages/app/components/wizard/DiscoveryStep.tsx` | Merged into BuildStep |
| `packages/app/components/wizard/PreviewStep.tsx` | Replaced by live 3D in BuildStep |
| `packages/app/components/wizard/DoneStep.tsx` | Replaced by LaunchStep |
| `packages/app/hooks/useRoomStates.ts` | No typed reducers |

---

## Testing

### Unit Tests
- Room presets: all 5 presets have furniture for all 4 themes, valid sizes
- Auto-layout: preset-based placement, no overlaps, agents distributed
- Builder store: ADD_ROOM with preset, auto-place, overlap prevention

### Integration
- Wizard flow: connect -> build -> launch round-trip
- Config persistence: save layout with presets, reload matches

### Visual Verification
1. `npx diorama` -> wizard Step 1
2. Test gateway connection
3. Click "Meeting" preset -> room appears in 3D with furniture
4. Add 3 more rooms -> all auto-placed, no overlaps
5. Switch theme -> furniture morphs in all rooms
6. Assign agents -> figures appear in rooms
7. Launch -> live view renders all rooms + agents
8. Re-run -> loads saved layout directly
