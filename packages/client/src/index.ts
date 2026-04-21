/**
 * @diorama/client — runtime helper for emitting events from agent code.
 *
 * Users' agent scripts import `dioramaEmit` and call it at workflow milestones.
 * Events POST to a running Diorama's /api/events/emit endpoint, which fans out
 * to the browser via WebSocket. Fire-and-forget: if Diorama is down, the agent
 * code should not fail.
 */

export interface DioramaEmitInput {
  type: string;
  room: string;
  agent: string;
  payload?: Record<string, unknown>;
}

export interface DioramaEmitOptions {
  /** Override URL; defaults to DIORAMA_URL env var or http://localhost:3000/api/events/emit */
  url?: string;
  /** Milliseconds before aborting the POST; defaults to 2000. */
  timeoutMs?: number;
}

const DEFAULT_URL = "http://localhost:3000/api/events/emit";
const DEFAULT_TIMEOUT_MS = 2000;

function resolveUrl(override?: string): string {
  if (override) return override;
  if (typeof process !== "undefined" && process.env?.DIORAMA_URL) {
    return process.env.DIORAMA_URL;
  }
  return DEFAULT_URL;
}

export async function dioramaEmit(
  evt: DioramaEmitInput,
  options: DioramaEmitOptions = {},
): Promise<void> {
  const url = resolveUrl(options.url);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const body = JSON.stringify({ ...evt, timestamp: Date.now() });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: controller.signal,
    });
  } catch {
    // Fire-and-forget: Diorama down, network error, or timeout shouldn't break the caller.
  } finally {
    clearTimeout(timer);
  }
}
