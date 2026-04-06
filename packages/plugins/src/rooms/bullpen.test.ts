import { describe, it, expect } from "vitest";
import { bullpenPlugin, createBullpenState, type BullpenState } from "./bullpen";

describe("bullpenPlugin", () => {
  it("has correct metadata", () => {
    expect(bullpenPlugin.kind).toBe("room");
    expect(bullpenPlugin.type).toBe("bullpen");
    expect(bullpenPlugin.defaultSize).toEqual([4, 2]);
  });
});

describe("createBullpenState", () => {
  it("starts with inactive channels and messenger at desk", () => {
    const state = createBullpenState();
    expect(state.channels.linear.active).toBe(false);
    expect(state.channels.slack.active).toBe(false);
    expect(state.channels.jira.active).toBe(false);
    expect(state.messengerLocation).toBe("desk");
  });
});

describe("bullpen reducer", () => {
  const reduce = bullpenPlugin.reducer;

  it("activates messenger on intake.ticket.rejected", () => {
    const state = createBullpenState();
    const next = reduce(state, {
      type: "aegis.intake.ticket.rejected",
      room: "bullpen",
      agent: "",
      payload: {},
      timestamp: 1000,
    }) as BullpenState;
    expect(next.messengerLocation).toBe("walking");
  });

  it("sets messenger to posting on herald.message.sent", () => {
    const state = createBullpenState();
    const next = reduce(state, {
      type: "aegis.herald.message.sent",
      room: "bullpen",
      agent: "herald",
      payload: { channel: "slack" },
      timestamp: 1000,
    }) as BullpenState;
    expect(next.messengerLocation).toBe("posting");
    expect(next.channels.slack.active).toBe(true);
  });

  it("returns state unchanged for unrelated events", () => {
    const state = createBullpenState();
    const next = reduce(state, {
      type: "some.other.event",
      room: "bullpen",
      agent: "",
      payload: {},
      timestamp: 3000,
    });
    expect(next).toBe(state);
  });
});
