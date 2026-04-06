import { describe, it, expect } from "vitest";
import {
  assignAgentToDesk,
  unassignAgent,
  getAssignments,
  type AgentDeskMap,
} from "./agentAssignment";

describe("agentAssignment", () => {
  it("assigns an agent to a desk", () => {
    const map: AgentDeskMap = {};
    const next = assignAgentToDesk(map, "aegis-prime", "desk-1", "#6366f1");
    expect(next["aegis-prime"]).toEqual({ desk: "desk-1", color: "#6366f1" });
  });

  it("reassigns agent to different desk", () => {
    let map: AgentDeskMap = {};
    map = assignAgentToDesk(map, "aegis-prime", "desk-1", "#6366f1");
    map = assignAgentToDesk(map, "aegis-prime", "desk-2", "#6366f1");
    expect(map["aegis-prime"].desk).toBe("desk-2");
  });

  it("unassigns an agent", () => {
    let map: AgentDeskMap = {};
    map = assignAgentToDesk(map, "aegis-prime", "desk-1", "#6366f1");
    map = assignAgentToDesk(map, "herald", "desk-2", "#3b82f6");
    map = unassignAgent(map, "aegis-prime");
    expect(map["aegis-prime"]).toBeUndefined();
    expect(map["herald"]).toBeDefined();
  });

  it("returns all assignments as array", () => {
    let map: AgentDeskMap = {};
    map = assignAgentToDesk(map, "aegis-prime", "desk-1", "#6366f1");
    map = assignAgentToDesk(map, "herald", "desk-2", "#3b82f6");
    const list = getAssignments(map);
    expect(list).toHaveLength(2);
    expect(list[0].agentId).toBe("aegis-prime");
    expect(list[1].agentId).toBe("herald");
  });

  it("handles empty map", () => {
    expect(getAssignments({})).toEqual([]);
  });

  it("color is optional", () => {
    const map = assignAgentToDesk({}, "sentinel", "desk-3");
    expect(map["sentinel"].desk).toBe("desk-3");
    expect(map["sentinel"].color).toBeUndefined();
  });
});
