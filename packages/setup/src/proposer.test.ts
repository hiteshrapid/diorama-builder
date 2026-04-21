import { describe, it, expect } from "vitest";
import { proposeEvents } from "./proposer";
import type { ScanResult } from "./scanner";

const baseScan: ScanResult = {
  openClawConfigPath: "/tmp/openclaw.json",
  agents: [],
  mcpServers: [],
  workspaceFiles: [],
  openClawConfig: null,
};

describe("proposeEvents", () => {
  it("returns an empty list when there are no agents", () => {
    expect(proposeEvents(baseScan, "whatever")).toEqual([]);
  });

  it("creates one proposal per agent", () => {
    const proposals = proposeEvents(
      { ...baseScan, agents: ["reviewer", "advisor"] },
      "our agents submit opinions",
    );
    expect(proposals).toHaveLength(2);
    expect(proposals.map((p) => p.agentId).sort()).toEqual([
      "advisor",
      "reviewer",
    ]);
  });

  it("defaults visual to 'working' when transcript has no known verb", () => {
    const [p] = proposeEvents(
      { ...baseScan, agents: ["x"] },
      "just some generic text",
    );
    expect(p.defaultVisual).toBe("working");
  });

  it("maps 'submit' verb to 'sending' visual", () => {
    const [p] = proposeEvents(
      { ...baseScan, agents: ["x"] },
      "the agent submits opinions",
    );
    expect(p.defaultVisual).toBe("sending");
  });

  it("maps 'review' verb to 'reviewing' visual", () => {
    const [p] = proposeEvents(
      { ...baseScan, agents: ["x"] },
      "the team reviews each ticket carefully",
    );
    expect(p.defaultVisual).toBe("reviewing");
  });

  it("guesses a room by agent-name substring match", () => {
    const [p] = proposeEvents(
      { ...baseScan, agents: ["reviewer"] },
      "submits",
      { rooms: ["Lounge", "Reviewer Den", "Lab"] },
    );
    expect(p.roomGuess).toBe("Reviewer Den");
  });

  it("falls back to first room when no name match", () => {
    const [p] = proposeEvents(
      { ...baseScan, agents: ["broadcaster"] },
      "submits",
      { rooms: ["Meeting", "Workspace"] },
    );
    expect(p.roomGuess).toBe("Meeting");
  });

  it("verbHints override transcript-derived visual", () => {
    const [p] = proposeEvents(
      { ...baseScan, agents: ["x"] },
      "submits lots of opinions",
      { verbHints: { x: "present" } },
    );
    expect(p.defaultVisual).toBe("presenting");
  });

  it("event type follows <agent>.action.submitted by default", () => {
    const [p] = proposeEvents({ ...baseScan, agents: ["advisor"] }, "");
    expect(p.type).toBe("advisor.action.submitted");
  });
});
