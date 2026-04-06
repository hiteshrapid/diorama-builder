import { describe, it, expect } from "vitest";
import { breakroomPlugin, createBreakroomState, type BreakroomState } from "./breakroom";

describe("breakroomPlugin", () => {
  it("has correct metadata", () => {
    expect(breakroomPlugin.kind).toBe("room");
    expect(breakroomPlugin.type).toBe("breakroom");
    expect(breakroomPlugin.defaultSize).toEqual([2, 2]);
  });
});

describe("createBreakroomState", () => {
  it("starts with idle occupants", () => {
    const state = createBreakroomState();
    expect(state.occupants).toEqual([]);
    expect(state.coffeeMachineActive).toBe(false);
  });
});

describe("breakroom reducer", () => {
  const reduce = breakroomPlugin.reducer;

  it("adds occupant on agent entering", () => {
    const state = createBreakroomState();
    const next = reduce(state, {
      type: "agent.entered.breakroom",
      room: "breakroom",
      agent: "herald",
      payload: {},
      timestamp: 1000,
    }) as BreakroomState;
    expect(next.occupants).toContain("herald");
  });

  it("removes occupant on agent leaving", () => {
    let state = createBreakroomState();
    state.occupants = ["herald", "scribe"];
    const next = reduce(state, {
      type: "agent.left.breakroom",
      room: "breakroom",
      agent: "herald",
      payload: {},
      timestamp: 1001,
    }) as BreakroomState;
    expect(next.occupants).toEqual(["scribe"]);
  });

  it("returns state unchanged for unrelated events", () => {
    const state = createBreakroomState();
    const next = reduce(state, {
      type: "some.other.event",
      room: "breakroom",
      agent: "",
      payload: {},
      timestamp: 3000,
    });
    expect(next).toBe(state);
  });
});
