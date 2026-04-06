import fs from "fs";

export interface RoomEntry {
  type: string;
  position: [number, number];
  size: [number, number];
  label: string;
}

export function addPluginToConfig(configPath: string, room: RoomEntry): void {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw);

  if (!Array.isArray(config.rooms)) {
    config.rooms = [];
  }

  config.rooms.push(room);

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
