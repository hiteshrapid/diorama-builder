import fs from "fs";
import { createBuilderState, type BuilderState, type RoomPlacement } from "./builderStore";

export function loadBuilderStateFromConfig(configPath: string): BuilderState {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const rooms: RoomPlacement[] = (raw.rooms ?? []).map(
    (r: { type: string; position: [number, number]; size: [number, number]; label: string }, i: number) => ({
      id: `${r.type}-${r.position[0]}-${r.position[1]}-${i}`,
      type: r.type,
      position: r.position,
      size: r.size,
      label: r.label,
    })
  );
  return createBuilderState(rooms);
}

export function saveBuilderStateToConfig(configPath: string, state: BuilderState): void {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  raw.rooms = state.rooms.map((r) => ({
    type: r.type,
    position: r.position,
    size: r.size,
    label: r.label,
  }));
  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2));
}
