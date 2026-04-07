import fs from "fs";
import { createBuilderState, type BuilderState, type RoomPlacement } from "./builderStore";

export function loadBuilderStateFromConfig(configPath: string): BuilderState {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const rooms: RoomPlacement[] = (raw.rooms ?? []).map(
    (r: { preset: string; position: [number, number]; size: [number, number]; label: string; colors?: RoomPlacement["colors"]; furniture?: RoomPlacement["furniture"] }, i: number) => ({
      id: `${r.preset}-${r.position[0]}-${r.position[1]}-${i}`,
      preset: r.preset,
      position: r.position,
      size: r.size,
      label: r.label,
      ...(r.colors ? { colors: r.colors } : {}),
      ...(r.furniture ? { furniture: r.furniture } : {}),
    })
  );
  return createBuilderState(rooms);
}

export function saveBuilderStateToConfig(configPath: string, state: BuilderState): void {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  raw.rooms = state.rooms.map((r) => ({
    preset: r.preset,
    position: r.position,
    size: r.size,
    label: r.label,
    ...(r.colors ? { colors: r.colors } : {}),
    ...(r.furniture ? { furniture: r.furniture } : {}),
  }));
  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2));
}
