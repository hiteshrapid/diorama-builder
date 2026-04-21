import { ensureAppRunning } from "../lifecycle.js";
import { apiFetch } from "../httpClient.js";

export const emitEventTool = {
  name: "diorama_emit_event",
  description:
    "Emit a DioramaEvent to the running Diorama app. The event fans out via WebSocket to any browser viewing the live 3D scene, triggering activity indicators, room glows, and feed entries. Use this to test wiring or to drive visuals from a tool that can't POST to /api/events/emit directly.",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description:
          "Event type (e.g. 'advisor.opinion.submitted'). Arbitrary strings are allowed; deriveActivity() pattern-matches common verbs.",
      },
      room: {
        type: "string",
        description: "Room label (matches the `label` field on a RoomConfig).",
      },
      agent: {
        type: "string",
        description: "Agent id (matches a key in config.agents).",
      },
      payload: {
        type: "object",
        description: "Event-specific data; stored with the event record.",
        additionalProperties: true,
      },
    },
    required: ["type", "room", "agent"],
  },
} as const;

interface EmitEventArgs {
  type: string;
  room: string;
  agent: string;
  payload?: Record<string, unknown>;
}

interface EmitResult {
  ok: boolean;
  delivered?: number;
  error?: string;
}

export async function handleEmitEvent(args: EmitEventArgs) {
  const { port } = await ensureAppRunning();
  const result = await apiFetch<EmitResult>({
    port,
    path: "/api/events/emit",
    method: "POST",
    body: args,
  });

  if (!result.ok) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Failed to emit event: ${result.error ?? "unknown error"}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Event '${args.type}' emitted to ${result.delivered ?? 0} subscribers (room='${args.room}', agent='${args.agent}').`,
      },
    ],
  };
}
