import type { RoomPlugin, DioramaEvent } from "@diorama/engine";

export interface BreakroomState {
  occupants: string[];
  coffeeMachineActive: boolean;
}

export function createBreakroomState(): BreakroomState {
  return { occupants: [], coffeeMachineActive: false };
}

function reduceBreakroom(state: unknown, event: DioramaEvent): unknown {
  const s = state as BreakroomState;
  switch (event.type) {
    case "agent.entered.breakroom":
      return { ...s, occupants: [...s.occupants, event.agent] };
    case "agent.left.breakroom":
      return { ...s, occupants: s.occupants.filter((a) => a !== event.agent) };
    default:
      return state;
  }
}

export const breakroomPlugin: RoomPlugin = {
  kind: "room", type: "breakroom", defaultSize: [2, 2],
  reducer: reduceBreakroom,
  catalog: { icon: "coffee", description: "Social breakroom space" },
};
