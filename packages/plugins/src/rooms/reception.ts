import type { RoomPlugin, DioramaEvent } from "@diorama/engine";

type PipelineStage = "Intake" | "Context" | "Council" | "Scenarios" | "TDD" | "Review" | "Verdict";

export interface ReceptionState {
  activeStage: PipelineStage | null;
  completedStages: Set<PipelineStage>;
  lastVerdicts: Array<{ verdict: string; timestamp: number }>;
}

export function createReceptionState(): ReceptionState {
  return { activeStage: null, completedStages: new Set(), lastVerdicts: [] };
}

function reduceReception(state: unknown, event: DioramaEvent): unknown {
  const s = state as ReceptionState;
  switch (event.type) {
    case "aegis.intake.review.started":
      return { ...s, activeStage: "Intake" as PipelineStage, completedStages: new Set<PipelineStage>() };
    case "aegis.intake.ticket.approved": {
      const completed = new Set(s.completedStages);
      if (s.activeStage) completed.add(s.activeStage);
      return { ...s, activeStage: "Context" as PipelineStage, completedStages: completed };
    }
    case "aegis.council.session.started": {
      const completed = new Set(s.completedStages);
      if (s.activeStage) completed.add(s.activeStage);
      return { ...s, activeStage: "Council" as PipelineStage, completedStages: completed };
    }
    case "aegis.verdict.issued": {
      const p = event.payload as { verdict: string };
      return { ...s, lastVerdicts: [...s.lastVerdicts, { verdict: p.verdict, timestamp: event.timestamp }] };
    }
    default:
      return state;
  }
}

export const receptionPlugin: RoomPlugin = {
  kind: "room", type: "reception", defaultSize: [2, 3],
  reducer: reduceReception,
  catalog: { icon: "door-open", description: "Reception and intake pipeline tracker" },
};
