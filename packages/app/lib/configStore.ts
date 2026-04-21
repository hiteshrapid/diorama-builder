import fs from "fs";
import path from "path";
import os from "os";
import {
  parseConfig,
  DioramaConfigError,
  type DioramaConfig,
} from "@diorama/engine";

export const DIORAMA_HOME = path.join(os.homedir(), ".diorama");
export const CONFIG_PATH = path.join(DIORAMA_HOME, "config.json");
export const SETUP_STATE_PATH = path.join(DIORAMA_HOME, "setup-state.json");

/**
 * Read the current config and parse it. Returns null if missing or unparseable.
 */
export function readConfig(): DioramaConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return parseConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Read the raw JSON contents of the config without validation.
 * Used when merging partial updates into existing config.
 */
export function readRawConfig(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Write config to disk, creating the ~/.diorama directory if needed.
 */
export function writeConfig(config: DioramaConfig): void {
  fs.mkdirSync(DIORAMA_HOME, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export type MutateResult =
  | { ok: true; config: DioramaConfig }
  | { ok: false; error: string; status: number };

/**
 * Read-merge-write pattern: given a mutator that produces the next config
 * (from the current raw config, or null if none exists), validates via
 * parseConfig and writes to disk. Returns the new parsed config or an error.
 */
export function mutateConfig(
  mutator: (current: Record<string, unknown> | null) => unknown,
): MutateResult {
  try {
    const current = readRawConfig();
    const next = mutator(current);
    const parsed = parseConfig(next);
    writeConfig(parsed);
    return { ok: true, config: parsed };
  } catch (err) {
    if (err instanceof DioramaConfigError) {
      return { ok: false, error: err.message, status: 400 };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message, status: 400 };
    }
    return { ok: false, error: String(err), status: 500 };
  }
}

/**
 * Require an existing config; return 400 result if none exists.
 */
export function requireConfig(): MutateResult {
  const current = readRawConfig();
  if (!current) {
    return {
      ok: false,
      error: "No diorama config found. Design and save an office first.",
      status: 400,
    };
  }
  try {
    const parsed = parseConfig(current);
    return { ok: true, config: parsed };
  } catch (err) {
    if (err instanceof DioramaConfigError) {
      return { ok: false, error: err.message, status: 400 };
    }
    return { ok: false, error: String(err), status: 500 };
  }
}

export interface SetupState {
  savedAt: number | null;
}

export function readSetupState(): SetupState {
  try {
    if (!fs.existsSync(SETUP_STATE_PATH)) return { savedAt: null };
    const raw = fs.readFileSync(SETUP_STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const savedAt = typeof parsed?.savedAt === "number" ? parsed.savedAt : null;
    return { savedAt };
  } catch {
    return { savedAt: null };
  }
}

export function writeSetupState(state: SetupState): void {
  fs.mkdirSync(DIORAMA_HOME, { recursive: true });
  fs.writeFileSync(SETUP_STATE_PATH, JSON.stringify(state, null, 2));
}
