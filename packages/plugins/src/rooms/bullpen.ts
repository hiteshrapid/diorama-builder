import type { RoomPlugin, DioramaEvent } from "@diorama/engine";

interface ChannelState { active: boolean; lastActivity: number | null; }

export interface BullpenState {
  channels: { linear: ChannelState; slack: ChannelState; jira: ChannelState };
  messengerLocation: "desk" | "walking" | "posting" | "pinning";
}

export function createBullpenState(): BullpenState {
  return {
    channels: {
      linear: { active: false, lastActivity: null },
      slack: { active: false, lastActivity: null },
      jira: { active: false, lastActivity: null },
    },
    messengerLocation: "desk",
  };
}

function reduceBullpen(state: unknown, event: DioramaEvent): unknown {
  const s = state as BullpenState;
  switch (event.type) {
    case "aegis.intake.ticket.rejected":
    case "aegis.implementation.rejected":
      return { ...s, messengerLocation: "walking" as const };
    case "aegis.herald.message.sent": {
      const p = event.payload as { channel: string };
      const ch = p.channel as keyof BullpenState["channels"];
      if (s.channels[ch]) {
        return {
          ...s,
          messengerLocation: "posting" as const,
          channels: { ...s.channels, [ch]: { active: true, lastActivity: event.timestamp } },
        };
      }
      return { ...s, messengerLocation: "posting" as const };
    }
    default:
      return state;
  }
}

export const bullpenPlugin: RoomPlugin = {
  kind: "room", type: "bullpen", defaultSize: [4, 2],
  reducer: reduceBullpen,
  catalog: { icon: "users", description: "Open floor agent dispatch area" },
};
