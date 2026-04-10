/**
 * Activity State System — derives visual activity from gateway events.
 *
 * Maps event type + room preset → agent activity for 3D visualization.
 * Pure functions, no React/Three.js dependencies.
 */

export type AgentActivity =
  | "idle"
  | "talking"
  | "working"
  | "testing"
  | "presenting"
  | "listening"
  | "sending"
  | "reviewing";

export interface ActivityRecord {
  activity: AgentActivity;
  startedAt: number;
  eventType: string;
  eventLabel: string;
  roomPreset: string;
}

/** How long an agent stays in an activity before returning to idle (ms). */
export const ACTIVITY_TIMEOUT_MS = 8000;

/**
 * Event type patterns → activity. Checked in order, first match wins.
 * Each entry: [substring to match in eventType, resulting activity].
 */
const EVENT_PATTERNS: Array<[string, AgentActivity]> = [
  ["test", "testing"],
  ["execution", "testing"],
  ["review", "reviewing"],
  ["intake", "reviewing"],
  ["synthesis", "presenting"],
  ["document", "presenting"],
  ["scenario", "presenting"],
  ["message", "sending"],
  ["herald", "sending"],
  ["verdict", "sending"],
  ["advisor.output", "talking"],
  ["council", "talking"],
  ["session", "talking"],
  ["advisor.spawned", "listening"],
  ["pattern", "working"],
  ["scribe", "working"],
  ["archive", "working"],
];

/** Room preset → default activity when event type has no pattern match. */
const PRESET_FALLBACK: Record<string, AgentActivity> = {
  meeting: "talking",
  lab: "testing",
  social: "talking",
  workspace: "working",
  private: "working",
};

/**
 * Derive an agent's visual activity from a gateway event type and the
 * target room's preset. Pattern-matches on event type first, then falls
 * back to the room preset's default activity.
 */
export function deriveActivity(
  eventType: string,
  roomPreset: string,
): AgentActivity {
  const lower = eventType.toLowerCase();
  for (const [pattern, activity] of EVENT_PATTERNS) {
    if (lower.includes(pattern)) return activity;
  }
  return PRESET_FALLBACK[roomPreset] ?? "working";
}

/** Activity → human-readable verb for the feed. */
const ACTIVITY_VERBS: Record<AgentActivity, string> = {
  idle: "idle",
  talking: "discussing",
  working: "working",
  testing: "running tests",
  presenting: "presenting",
  listening: "listening",
  sending: "sending message",
  reviewing: "reviewing",
};

/** Capitalize and clean a hyphenated identifier for display. */
function displayName(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Produce a human-readable label for an event, e.g.
 * "Aegis Prime reviewing in Reception"
 */
export function formatEventLabel(
  eventType: string,
  agent: string,
  room: string,
  roomPreset?: string,
): string {
  const activity = deriveActivity(eventType, roomPreset ?? "");
  const verb = ACTIVITY_VERBS[activity];
  return `${displayName(agent)} ${verb} in ${displayName(room)}`;
}
