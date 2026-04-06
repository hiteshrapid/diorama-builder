import { describe, it, expect } from "vitest";
import { receptionPlugin, createReceptionState, type ReceptionState } from "./reception";

describe("receptionPlugin", () => {
  it("has correct metadata", () => {
    expect(receptionPlugin.kind).toBe("room");
    expect(receptionPlugin.type).toBe("reception");
    expect(receptionPlugin.defaultSize).toEqual([2, 3]);
  });
});

describe("createReceptionState", () => {
  it("starts with no active stage", () => {
    const state = createReceptionState();
    expect(state.activeStage).toBeNull();
    expect(state.completedStages.size).toBe(0);
    expect(state.lastVerdicts).toEqual([]);
  });
});

describe("reception reducer", () => {
  const reduce = receptionPlugin.reducer;

  it("sets active stage on intake.review.started", () => {
    const state = createReceptionState();
    const next = reduce(state, {
      type: "aegis.intake.review.started",
      room: "reception",
      agent: "aegis-prime",
      payload: { ticketId: "T-1" },
      timestamp: 1000,
    }) as ReceptionState;
    expect(next.activeStage).toBe("Intake");
    expect(next.completedStages.size).toBe(0);
  });

  it("advances to Context on ticket.approved", () => {
    let state = createReceptionState();
    state.activeStage = "Intake";
    const next = reduce(state, {
      type: "aegis.intake.ticket.approved",
      room: "reception",
      agent: "aegis-prime",
      payload: { ticketId: "T-1" },
      timestamp: 1001,
    }) as ReceptionState;
    expect(next.activeStage).toBe("Context");
    expect(next.completedStages.has("Intake")).toBe(true);
  });

  it("advances to Council stage on council.session.started", () => {
    let state = createReceptionState();
    state.activeStage = "Context";
    state.completedStages = new Set(["Intake"]);
    const next = reduce(state, {
      type: "aegis.council.session.started",
      room: "reception",
      agent: "",
      payload: {},
      timestamp: 1002,
    }) as ReceptionState;
    expect(next.activeStage).toBe("Council");
    expect(next.completedStages.has("Context")).toBe(true);
  });

  it("records verdict in lastVerdicts", () => {
    const state = createReceptionState();
    const next = reduce(state, {
      type: "aegis.verdict.issued",
      room: "reception",
      agent: "",
      payload: { verdict: "APPROVED" },
      timestamp: 2000,
    }) as ReceptionState;
    expect(next.lastVerdicts).toHaveLength(1);
    expect(next.lastVerdicts[0].verdict).toBe("APPROVED");
  });

  it("returns state unchanged for unrelated events", () => {
    const state = createReceptionState();
    const next = reduce(state, {
      type: "some.other.event",
      room: "reception",
      agent: "",
      payload: {},
      timestamp: 3000,
    });
    expect(next).toBe(state);
  });
});
