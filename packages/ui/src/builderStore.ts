export interface RoomPlacement {
  id: string;
  preset: string;
  position: [number, number];
  size: [number, number];
  label: string;
}

interface HistoryEntry {
  rooms: RoomPlacement[];
}

export interface BuilderState {
  rooms: RoomPlacement[];
  selectedRoomId: string | null;
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
  };
}

export type BuilderAction =
  | { type: "ADD_ROOM"; room: RoomPlacement }
  | { type: "REMOVE_ROOM"; roomId: string }
  | { type: "MOVE_ROOM"; roomId: string; position: [number, number] }
  | { type: "RESIZE_ROOM"; roomId: string; size: [number, number] }
  | { type: "UPDATE_ROOM"; roomId: string; updates: Partial<Pick<RoomPlacement, "label">> }
  | { type: "SELECT_ROOM"; roomId: string | null }
  | { type: "UNDO" }
  | { type: "REDO" };

export function createBuilderState(initialRooms: RoomPlacement[] = []): BuilderState {
  return {
    rooms: initialRooms,
    selectedRoomId: null,
    history: { past: [], future: [] },
  };
}

function overlaps(a: RoomPlacement, b: RoomPlacement): boolean {
  const [ax, ay] = a.position;
  const [aw, ah] = a.size;
  const [bx, by] = b.position;
  const [bw, bh] = b.size;
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function hasOverlap(room: RoomPlacement, others: RoomPlacement[]): boolean {
  return others.some((o) => o.id !== room.id && overlaps(room, o));
}

function pushHistory(state: BuilderState): BuilderState {
  return {
    ...state,
    history: {
      past: [...state.history.past, { rooms: state.rooms }],
      future: [],
    },
  };
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "ADD_ROOM": {
      if (hasOverlap(action.room, state.rooms)) return state;
      const withHistory = pushHistory(state);
      return { ...withHistory, rooms: [...state.rooms, action.room] };
    }

    case "REMOVE_ROOM": {
      const withHistory = pushHistory(state);
      return {
        ...withHistory,
        rooms: state.rooms.filter((r) => r.id !== action.roomId),
        selectedRoomId: state.selectedRoomId === action.roomId ? null : state.selectedRoomId,
      };
    }

    case "MOVE_ROOM": {
      const room = state.rooms.find((r) => r.id === action.roomId);
      if (!room) return state;
      const moved = { ...room, position: action.position };
      if (hasOverlap(moved, state.rooms)) return state;
      const withHistory = pushHistory(state);
      return {
        ...withHistory,
        rooms: state.rooms.map((r) => (r.id === action.roomId ? moved : r)),
      };
    }

    case "RESIZE_ROOM": {
      const withHistory = pushHistory(state);
      return {
        ...withHistory,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId ? { ...r, size: action.size } : r
        ),
      };
    }

    case "UPDATE_ROOM": {
      const withHistory = pushHistory(state);
      return {
        ...withHistory,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId ? { ...r, ...action.updates } : r
        ),
      };
    }

    case "SELECT_ROOM":
      return { ...state, selectedRoomId: action.roomId };

    case "UNDO": {
      if (state.history.past.length === 0) return state;
      const prev = state.history.past[state.history.past.length - 1];
      return {
        ...state,
        rooms: prev.rooms,
        history: {
          past: state.history.past.slice(0, -1),
          future: [{ rooms: state.rooms }, ...state.history.future],
        },
      };
    }

    case "REDO": {
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0];
      return {
        ...state,
        rooms: next.rooms,
        history: {
          past: [...state.history.past, { rooms: state.rooms }],
          future: state.history.future.slice(1),
        },
      };
    }

    default:
      return state;
  }
}
