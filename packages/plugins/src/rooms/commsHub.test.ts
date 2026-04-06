import { describe, it, expect } from "vitest";
import { commsHubPlugin, createCommsHubState, type CommsHubState } from "./commsHub";

describe("commsHubPlugin", () => {
  it("has correct metadata", () => {
    expect(commsHubPlugin.kind).toBe("room");
    expect(commsHubPlugin.type).toBe("comms-hub");
    expect(commsHubPlugin.defaultSize).toEqual([2, 2]);
  });
});

describe("createCommsHubState", () => {
  it("starts with empty kanban and no escalations", () => {
    const state = createCommsHubState();
    expect(state.tickets).toEqual([]);
    expect(state.escalation.active).toBe(false);
    expect(state.channels.slack.active).toBe(false);
  });
});

describe("commsHub reducer", () => {
  const reduce = commsHubPlugin.reducer;

  it("adds ticket on council.session.started", () => {
    const state = createCommsHubState();
    const next = reduce(state, {
      type: "aegis.council.session.started",
      room: "comms-hub",
      agent: "",
      payload: { ticketId: "T-1", ticketTitle: "Fix login" },
      timestamp: 1000,
    }) as CommsHubState;
    expect(next.tickets).toHaveLength(1);
    expect(next.tickets[0].column).toBe("Council Running");
  });

  it("moves ticket to verdict column on verdict.issued", () => {
    let state = createCommsHubState();
    state.tickets = [{ ticketId: "T-1", title: "Fix login", column: "Under Review", timestamp: 1000 }];
    const next = reduce(state, {
      type: "aegis.verdict.issued",
      room: "comms-hub",
      agent: "",
      payload: { ticketId: "T-1", verdict: "APPROVED", ticketTitle: "Fix login" },
      timestamp: 2000,
    }) as CommsHubState;
    expect(next.tickets[0].column).toBe("APPROVED");
  });

  it("activates channel on herald.message.sent", () => {
    const state = createCommsHubState();
    const next = reduce(state, {
      type: "aegis.herald.message.sent",
      room: "comms-hub",
      agent: "herald",
      payload: { channel: "slack" },
      timestamp: 1000,
    }) as CommsHubState;
    expect(next.channels.slack.active).toBe(true);
    expect(next.channels.slack.lastActivity).toBe(1000);
  });

  it("activates escalation on escalation.sent", () => {
    const state = createCommsHubState();
    const next = reduce(state, {
      type: "aegis.herald.escalation.sent",
      room: "comms-hub",
      agent: "herald",
      payload: { ticketId: "T-1" },
      timestamp: 1000,
    }) as CommsHubState;
    expect(next.escalation.active).toBe(true);
    expect(next.escalation.ticketId).toBe("T-1");
  });

  it("resolves escalation on escalation.resolved", () => {
    let state = createCommsHubState();
    state.escalation = { active: true, ticketId: "T-1", timeoutAt: null };
    const next = reduce(state, {
      type: "aegis.herald.escalation.resolved",
      room: "comms-hub",
      agent: "herald",
      payload: {},
      timestamp: 2000,
    }) as CommsHubState;
    expect(next.escalation.active).toBe(false);
  });
});
