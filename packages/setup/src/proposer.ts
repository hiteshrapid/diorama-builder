import type { ScanResult } from "./scanner";

export interface ProposedEvent {
  agentId: string;
  type: string;
  roomGuess: string | null;
  defaultVisual:
    | "talking"
    | "working"
    | "testing"
    | "presenting"
    | "listening"
    | "sending"
    | "reviewing";
  file: string | null;
  line: number | null;
  rationale: string;
}

export interface ProposeOptions {
  /** Rooms configured in the user's diorama. Used to suggest a room for each event. */
  rooms?: string[];
  /** Optional verb hints keyed by agent; bypasses transcript parsing. */
  verbHints?: Record<string, string>;
}

const VERB_TO_VISUAL: Record<string, ProposedEvent["defaultVisual"]> = {
  submit: "sending",
  send: "sending",
  post: "sending",
  emit: "sending",
  approve: "reviewing",
  review: "reviewing",
  reject: "reviewing",
  test: "testing",
  run: "testing",
  present: "presenting",
  pitch: "presenting",
  announce: "presenting",
  listen: "listening",
  hear: "listening",
  speak: "talking",
  say: "talking",
  tell: "talking",
};

/**
 * Extract the first known verb from text, returning its visual mapping.
 * Defaults to "working" if no known verb is present.
 */
function visualFromText(text: string): ProposedEvent["defaultVisual"] {
  const lower = text.toLowerCase();
  for (const [verb, visual] of Object.entries(VERB_TO_VISUAL)) {
    if (lower.includes(verb)) return visual;
  }
  return "working";
}

/**
 * Propose a first-cut list of events based on scanner output and the user's
 * free-form interview transcript. The skill refines this list — this function
 * just seeds it with sensible defaults (one event per agent, room guessed by
 * name match, visual derived from transcript verbs).
 */
export function proposeEvents(
  scan: ScanResult,
  transcript: string,
  options: ProposeOptions = {},
): ProposedEvent[] {
  const proposals: ProposedEvent[] = [];
  const rooms = options.rooms ?? [];
  const visualFromTranscript = visualFromText(transcript);

  for (const agentId of scan.agents) {
    const hint = options.verbHints?.[agentId];
    const visual = hint
      ? VERB_TO_VISUAL[hint.toLowerCase()] ?? visualFromTranscript
      : visualFromTranscript;

    // Try to match room by substring
    const normalizedAgent = agentId.toLowerCase();
    const roomMatch =
      rooms.find((r) => r.toLowerCase().includes(normalizedAgent)) ??
      rooms.find((r) => normalizedAgent.includes(r.toLowerCase())) ??
      rooms[0] ??
      null;

    proposals.push({
      agentId,
      type: `${agentId}.action.submitted`,
      roomGuess: roomMatch,
      defaultVisual: visual,
      file: null,
      line: null,
      rationale: `Seed proposal derived from scanner (agent="${agentId}"). Skill should refine the event type, line, and room by reading the agent's entry file.`,
    });
  }

  return proposals;
}
