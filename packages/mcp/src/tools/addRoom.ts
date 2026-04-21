import { ensureAppRunning } from "../lifecycle.js";
import { apiFetch } from "../httpClient.js";

export const addRoomTool = {
  name: "diorama_add_room",
  description:
    "Programmatically append a single room to the existing diorama config. The config must already exist (user has saved the office at least once). Validates the merged config via the engine schema.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        enum: ["meeting", "workspace", "private", "social", "lab"],
        description: "Room preset type",
      },
      label: {
        type: "string",
        description: "Human-readable room label, unique per config",
      },
      position: {
        type: "array",
        items: { type: "number" },
        minItems: 2,
        maxItems: 2,
        description: "Grid position [x, y]",
      },
      size: {
        type: "array",
        items: { type: "number" },
        minItems: 2,
        maxItems: 2,
        description: "Grid size [width, height]",
      },
    },
    required: ["preset", "label", "position", "size"],
  },
} as const;

interface AddRoomArgs {
  preset: string;
  label: string;
  position: [number, number];
  size: [number, number];
}

interface AddRoomResult {
  ok: boolean;
  config?: unknown;
  error?: string;
}

export async function handleAddRoom(args: AddRoomArgs) {
  const { port } = await ensureAppRunning();
  const result = await apiFetch<AddRoomResult>({
    port,
    path: "/api/config/rooms",
    method: "POST",
    body: args,
  });

  if (!result.ok) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Failed to add room: ${result.error ?? "unknown error"}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `Added room '${args.label}' (${args.preset}) at [${args.position.join(",")}] size [${args.size.join(",")}].`,
      },
    ],
  };
}
