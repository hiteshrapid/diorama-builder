import type { RoomPlugin, DioramaEvent } from "@diorama/engine";

interface ChannelState { active: boolean; lastActivity: number | null; }
interface TicketCard { ticketId: string; title: string; column: string; timestamp: number; }

export interface CommsHubState {
  tickets: TicketCard[];
  channels: { linear: ChannelState; slack: ChannelState; jira: ChannelState };
  escalation: { active: boolean; ticketId: string | null; timeoutAt: number | null };
}

export function createCommsHubState(): CommsHubState {
  return {
    tickets: [],
    channels: {
      linear: { active: false, lastActivity: null },
      slack: { active: false, lastActivity: null },
      jira: { active: false, lastActivity: null },
    },
    escalation: { active: false, ticketId: null, timeoutAt: null },
  };
}

function reduceCommsHub(state: unknown, event: DioramaEvent): unknown {
  const s = state as CommsHubState;
  switch (event.type) {
    case "aegis.council.session.started": {
      const p = event.payload as { ticketId?: string; ticketTitle?: string };
      return {
        ...s,
        tickets: [...s.tickets, { ticketId: p.ticketId ?? "", title: p.ticketTitle ?? "", column: "Council Running", timestamp: event.timestamp }],
      };
    }
    case "aegis.verdict.issued": {
      const p = event.payload as { ticketId: string; verdict: string; ticketTitle?: string };
      return {
        ...s,
        tickets: s.tickets.map((t) =>
          t.ticketId === p.ticketId ? { ...t, column: p.verdict, timestamp: event.timestamp } : t
        ),
      };
    }
    case "aegis.herald.message.sent": {
      const p = event.payload as { channel: string };
      const ch = p.channel as keyof CommsHubState["channels"];
      if (s.channels[ch]) {
        return { ...s, channels: { ...s.channels, [ch]: { active: true, lastActivity: event.timestamp } } };
      }
      return state;
    }
    case "aegis.herald.escalation.sent": {
      const p = event.payload as { ticketId: string };
      return { ...s, escalation: { active: true, ticketId: p.ticketId, timeoutAt: null } };
    }
    case "aegis.herald.escalation.resolved":
      return { ...s, escalation: { active: false, ticketId: null, timeoutAt: null } };
    default:
      return state;
  }
}

export const commsHubPlugin: RoomPlugin = {
  kind: "room", type: "comms-hub", defaultSize: [2, 2],
  reducer: reduceCommsHub,
  catalog: { icon: "radio", description: "Communications hub with kanban board and herald broadcasts" },
};
