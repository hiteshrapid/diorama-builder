import { describe, it, expect } from "vitest";
import {
  testLabPlugin,
  createTestLabState,
  type TestLabState,
} from "./testLab";

describe("testLabPlugin", () => {
  it("has correct plugin metadata", () => {
    expect(testLabPlugin.kind).toBe("room");
    expect(testLabPlugin.type).toBe("test-lab");
    expect(testLabPlugin.defaultSize).toEqual([2, 3]);
  });
});

describe("createTestLabState", () => {
  it("starts with empty pyramid and idle browser", () => {
    const state = createTestLabState();
    expect(state.executionActive).toBe(false);
    expect(state.browserStatus).toBe("idle");
    expect(state.pyramid.unit).toEqual({ passed: 0, failed: 0, total: 0 });
    expect(state.pyramid.integration).toEqual({ passed: 0, failed: 0, total: 0 });
    expect(state.pyramid.e2e).toEqual({ passed: 0, failed: 0, total: 0 });
    expect(state.screenshots).toEqual([]);
  });
});

describe("testLab reducer", () => {
  const reduce = testLabPlugin.reducer;

  it("starts execution on sentinel.execution.started", () => {
    const state = createTestLabState();
    const next = reduce(state, {
      type: "aegis.sentinel.execution.started",
      room: "test-lab",
      agent: "sentinel",
      payload: {},
      timestamp: 1000,
    }) as TestLabState;
    expect(next.executionActive).toBe(true);
    expect(next.browserStatus).toBe("running");
    expect(next.pyramid.unit).toEqual({ passed: 0, failed: 0, total: 0 });
  });

  it("increments passed count on test.passed", () => {
    let state = createTestLabState();
    state.executionActive = true;
    const next = reduce(state, {
      type: "aegis.sentinel.test.passed",
      room: "test-lab",
      agent: "sentinel",
      payload: { testType: "unit" },
      timestamp: 1001,
    }) as TestLabState;
    expect(next.pyramid.unit.passed).toBe(1);
    expect(next.pyramid.unit.total).toBe(1);
  });

  it("increments failed count on test.failed", () => {
    let state = createTestLabState();
    state.executionActive = true;
    const next = reduce(state, {
      type: "aegis.sentinel.test.failed",
      room: "test-lab",
      agent: "sentinel",
      payload: { testType: "e2e" },
      timestamp: 1002,
    }) as TestLabState;
    expect(next.pyramid.e2e.failed).toBe(1);
    expect(next.pyramid.e2e.total).toBe(1);
  });

  it("completes execution with passed status when no failures", () => {
    let state = createTestLabState();
    state.executionActive = true;
    state.pyramid.unit = { passed: 5, failed: 0, total: 5 };
    const next = reduce(state, {
      type: "aegis.sentinel.execution.complete",
      room: "test-lab",
      agent: "sentinel",
      payload: {},
      timestamp: 1003,
    }) as TestLabState;
    expect(next.executionActive).toBe(false);
    expect(next.browserStatus).toBe("passed");
  });

  it("completes execution with failed status when failures exist", () => {
    let state = createTestLabState();
    state.executionActive = true;
    state.pyramid.unit = { passed: 3, failed: 2, total: 5 };
    const next = reduce(state, {
      type: "aegis.sentinel.execution.complete",
      room: "test-lab",
      agent: "sentinel",
      payload: {},
      timestamp: 1003,
    }) as TestLabState;
    expect(next.browserStatus).toBe("failed");
  });

  it("captures screenshots", () => {
    let state = createTestLabState();
    state.executionActive = true;
    const next = reduce(state, {
      type: "aegis.playwright.screenshot.captured",
      room: "test-lab",
      agent: "sentinel",
      payload: { url: "http://test.png", testName: "login" },
      timestamp: 1004,
    }) as TestLabState;
    expect(next.screenshots).toHaveLength(1);
    expect(next.screenshots[0].testName).toBe("login");
  });
});
