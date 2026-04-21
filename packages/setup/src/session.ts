import fs from "fs";
import path from "path";

export interface SetupSession {
  startedAt: number;
  scan?: unknown;
  transcript?: string;
  proposals?: unknown;
  mappings?: unknown;
  step?: string;
}

function sessionPath(homeDir: string): string {
  return path.join(homeDir, ".diorama", "setup-session.json");
}

export function writeSetupSession(homeDir: string, session: SetupSession): void {
  const filePath = sessionPath(homeDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
}

export function readSetupSession(homeDir: string): SetupSession | null {
  const filePath = sessionPath(homeDir);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as SetupSession)
      : null;
  } catch {
    return null;
  }
}

export function clearSetupSession(homeDir: string): void {
  const filePath = sessionPath(homeDir);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}
