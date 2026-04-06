import type { RoomPlugin, DioramaEvent } from "@diorama/engine";

export interface CouncilState {
  sessionActive: boolean;
  activeAdvisors: Set<string>;
  completedAdvisors: Set<string>;
  executorActive: boolean;
  peerReviewActive: boolean;
  outputCards: Map<string, { label: string; ready: boolean }>;
  scenarioDocReady: boolean;
}

export function createCouncilState(): CouncilState {
  return {
    sessionActive: false,
    activeAdvisors: new Set(),
    completedAdvisors: new Set(),
    executorActive: false,
    peerReviewActive: false,
    outputCards: new Map(),
    scenarioDocReady: false,
  };
}

const LABELS = ["A", "B", "C", "D", "E", "F"];

function reduceCouncil(state: unknown, event: DioramaEvent): unknown {
  const s = state as CouncilState;

  switch (event.type) {
    case "aegis.council.session.started":
      return {
        ...s,
        sessionActive: true,
        activeAdvisors: new Set<string>(),
        completedAdvisors: new Set<string>(),
        executorActive: false,
        peerReviewActive: false,
        outputCards: new Map(),
        scenarioDocReady: false,
      };

    case "aegis.advisor.spawned": {
      const id = (event.payload as { advisorId: string }).advisorId;
      const next = new Set(s.activeAdvisors);
      next.add(id);
      return { ...s, activeAdvisors: next };
    }

    case "aegis.advisor.output.ready": {
      const id = (event.payload as { advisorId: string }).advisorId;
      const active = new Set(s.activeAdvisors);
      active.delete(id);
      const completed = new Set(s.completedAdvisors);
      completed.add(id);
      const cards = new Map(s.outputCards);
      cards.set(id, { label: LABELS[cards.size] ?? "?", ready: true });
      return { ...s, activeAdvisors: active, completedAdvisors: completed, outputCards: cards };
    }

    case "aegis.executor.synthesis.started":
      return { ...s, executorActive: true };

    case "aegis.peer.review.running":
      return { ...s, executorActive: false, peerReviewActive: true };

    case "aegis.scenario.document.generated":
      return { ...s, sessionActive: false, peerReviewActive: false, scenarioDocReady: true };

    default:
      return state;
  }
}

export const councilChamberPlugin: RoomPlugin = {
  kind: "room",
  type: "council-chamber",
  defaultSize: [3, 3],
  reducer: reduceCouncil,
  catalog: { icon: "shield", description: "Council chamber for quorum sessions" },
};
