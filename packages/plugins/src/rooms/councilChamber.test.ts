import { describe, it, expect } from "vitest";
import {
  councilChamberPlugin,
  createCouncilState,
  type CouncilState,
} from "./councilChamber";

describe("councilChamberPlugin", () => {
  it("has correct plugin metadata", () => {
    expect(councilChamberPlugin.kind).toBe("room");
    expect(councilChamberPlugin.type).toBe("council-chamber");
    expect(councilChamberPlugin.defaultSize).toEqual([3, 3]);
  });
});

describe("createCouncilState", () => {
  it("creates initial inactive state", () => {
    const state = createCouncilState();
    expect(state.sessionActive).toBe(false);
    expect(state.activeAdvisors.size).toBe(0);
    expect(state.completedAdvisors.size).toBe(0);
    expect(state.executorActive).toBe(false);
    expect(state.peerReviewActive).toBe(false);
    expect(state.scenarioDocReady).toBe(false);
  });
});

describe("councilChamber reducer", () => {
  const reduce = councilChamberPlugin.reducer;

  it("activates session on council.session.started", () => {
    const state = createCouncilState();
    const next = reduce(state, {
      type: "aegis.council.session.started",
      room: "council-chamber",
      agent: "",
      payload: { ticketId: "T-1", sessionId: "S-1" },
      timestamp: 1000,
    }) as CouncilState;
    expect(next.sessionActive).toBe(true);
    expect(next.activeAdvisors.size).toBe(0);
  });

  it("adds advisor on advisor.spawned", () => {
    let state = createCouncilState();
    state = reduce(state, {
      type: "aegis.council.session.started",
      room: "council-chamber",
      agent: "",
      payload: {},
      timestamp: 1000,
    }) as CouncilState;
    const next = reduce(state, {
      type: "aegis.advisor.spawned",
      room: "council-chamber",
      agent: "contrarian",
      payload: { advisorId: "contrarian" },
      timestamp: 1001,
    }) as CouncilState;
    expect(next.activeAdvisors.has("contrarian")).toBe(true);
  });

  it("moves advisor to completed on output.ready", () => {
    let state = createCouncilState();
    state.sessionActive = true;
    state.activeAdvisors = new Set(["contrarian"]);

    const next = reduce(state, {
      type: "aegis.advisor.output.ready",
      room: "council-chamber",
      agent: "contrarian",
      payload: { advisorId: "contrarian" },
      timestamp: 1002,
    }) as CouncilState;
    expect(next.activeAdvisors.has("contrarian")).toBe(false);
    expect(next.completedAdvisors.has("contrarian")).toBe(true);
  });

  it("activates executor on synthesis.started", () => {
    let state = createCouncilState();
    state.sessionActive = true;
    const next = reduce(state, {
      type: "aegis.executor.synthesis.started",
      room: "council-chamber",
      agent: "executor",
      payload: {},
      timestamp: 1003,
    }) as CouncilState;
    expect(next.executorActive).toBe(true);
  });

  it("activates peer review on peer.review.running", () => {
    let state = createCouncilState();
    state.sessionActive = true;
    state.executorActive = true;
    const next = reduce(state, {
      type: "aegis.peer.review.running",
      room: "council-chamber",
      agent: "",
      payload: {},
      timestamp: 1004,
    }) as CouncilState;
    expect(next.peerReviewActive).toBe(true);
    expect(next.executorActive).toBe(false);
  });

  it("completes session on scenario.document.generated", () => {
    let state = createCouncilState();
    state.sessionActive = true;
    state.peerReviewActive = true;
    const next = reduce(state, {
      type: "aegis.scenario.document.generated",
      room: "council-chamber",
      agent: "",
      payload: {},
      timestamp: 1005,
    }) as CouncilState;
    expect(next.sessionActive).toBe(false);
    expect(next.peerReviewActive).toBe(false);
    expect(next.scenarioDocReady).toBe(true);
  });

  it("returns state unchanged for unrelated events", () => {
    const state = createCouncilState();
    const next = reduce(state, {
      type: "some.unrelated.event",
      room: "council-chamber",
      agent: "",
      payload: {},
      timestamp: 2000,
    });
    expect(next).toBe(state);
  });
});
