import { describe, it, expect } from "vitest";
import { archivePlugin, createArchiveState, type ArchiveState } from "./archive";

describe("archivePlugin", () => {
  it("has correct metadata", () => {
    expect(archivePlugin.kind).toBe("room");
    expect(archivePlugin.type).toBe("archive");
    expect(archivePlugin.defaultSize).toEqual([4, 2]);
  });
});

describe("createArchiveState", () => {
  it("starts with empty knowledge graph", () => {
    const state = createArchiveState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.scribeActive).toBe(false);
    expect(state.extractionStep).toBe(0);
  });
});

describe("archive reducer", () => {
  const reduce = archivePlugin.reducer;

  it("activates scribe on compound.started", () => {
    const state = createArchiveState();
    const next = reduce(state, {
      type: "aegis.compound.started",
      room: "archive",
      agent: "scribe",
      payload: {},
      timestamp: 1000,
    }) as ArchiveState;
    expect(next.scribeActive).toBe(true);
    expect(next.extractionStep).toBe(1);
  });

  it("adds pattern node on pattern.promoted", () => {
    const state = createArchiveState();
    const next = reduce(state, {
      type: "aegis.scribe.pattern.promoted",
      room: "archive",
      agent: "scribe",
      payload: { patternName: "retry-logic", repoId: "main-repo" },
      timestamp: 1001,
    }) as ArchiveState;
    expect(next.nodes.length).toBeGreaterThanOrEqual(1);
    expect(next.nodes.some((n) => n.label === "retry-logic")).toBe(true);
  });

  it("adds session node on session.created", () => {
    const state = createArchiveState();
    const next = reduce(state, {
      type: "aegis.scribe.session.created",
      room: "archive",
      agent: "scribe",
      payload: { sessionId: "S-1", repoId: "main-repo" },
      timestamp: 1002,
    }) as ArchiveState;
    expect(next.nodes.some((n) => n.type === "session")).toBe(true);
  });

  it("creates edges linking nodes to repos", () => {
    let state = createArchiveState();
    state = reduce(state, {
      type: "aegis.scribe.pattern.promoted",
      room: "archive",
      agent: "scribe",
      payload: { patternName: "retry", repoId: "repo-a" },
      timestamp: 1000,
    }) as ArchiveState;
    expect(state.edges.length).toBeGreaterThanOrEqual(1);
  });
});
