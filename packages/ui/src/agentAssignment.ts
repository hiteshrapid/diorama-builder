export interface DeskAssignment {
  desk: string;
  color?: string;
}

export type AgentDeskMap = Record<string, DeskAssignment>;

export function assignAgentToDesk(
  map: AgentDeskMap,
  agentId: string,
  desk: string,
  color?: string
): AgentDeskMap {
  return { ...map, [agentId]: { desk, color } };
}

export function unassignAgent(map: AgentDeskMap, agentId: string): AgentDeskMap {
  const next = { ...map };
  delete next[agentId];
  return next;
}

export function getAssignments(map: AgentDeskMap): Array<{ agentId: string; desk: string; color?: string }> {
  return Object.entries(map).map(([agentId, a]) => ({ agentId, desk: a.desk, color: a.color }));
}
