import type { RoomPlugin, DioramaEvent } from "@diorama/engine";

interface KnowledgeNode { id: string; type: "pattern" | "session" | "repo"; label: string; }
interface KnowledgeEdge { from: string; to: string; }

export interface ArchiveState {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  scribeActive: boolean;
  extractionStep: number;
}

export function createArchiveState(): ArchiveState {
  return { nodes: [], edges: [], scribeActive: false, extractionStep: 0 };
}

let nodeCounter = 0;
function nodeId() { return `node_${++nodeCounter}`; }

function ensureRepoNode(state: ArchiveState, repoId: string): ArchiveState {
  if (state.nodes.some((n) => n.type === "repo" && n.label === repoId)) return state;
  return { ...state, nodes: [...state.nodes, { id: nodeId(), type: "repo", label: repoId }] };
}

function reduceArchive(state: unknown, event: DioramaEvent): unknown {
  const s = state as ArchiveState;
  switch (event.type) {
    case "aegis.compound.started":
      return { ...s, scribeActive: true, extractionStep: 1 };
    case "aegis.scribe.pattern.promoted": {
      const p = event.payload as { patternName: string; repoId: string };
      let next = ensureRepoNode(s, p.repoId);
      const patternId = nodeId();
      next = { ...next, nodes: [...next.nodes, { id: patternId, type: "pattern", label: p.patternName }] };
      const repoNode = next.nodes.find((n) => n.type === "repo" && n.label === p.repoId);
      if (repoNode) {
        next = { ...next, edges: [...next.edges, { from: patternId, to: repoNode.id }] };
      }
      return next;
    }
    case "aegis.scribe.session.created": {
      const p = event.payload as { sessionId: string; repoId: string };
      let next = ensureRepoNode(s, p.repoId);
      const sessionNodeId = nodeId();
      next = { ...next, nodes: [...next.nodes, { id: sessionNodeId, type: "session", label: p.sessionId }] };
      const repoNode = next.nodes.find((n) => n.type === "repo" && n.label === p.repoId);
      if (repoNode) {
        next = { ...next, edges: [...next.edges, { from: sessionNodeId, to: repoNode.id }] };
      }
      return next;
    }
    default:
      return state;
  }
}

export const archivePlugin: RoomPlugin = {
  kind: "room", type: "archive", defaultSize: [4, 2],
  reducer: reduceArchive,
  catalog: { icon: "book", description: "Knowledge garden — patterns, sessions, repos" },
};
