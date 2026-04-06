import { describe, it, expect } from "vitest";
import {
  createBuilderState,
  builderReducer,
  type BuilderState,
  type RoomPlacement,
} from "./builderStore";

function room(type: string, x: number, y: number, w = 2, h = 2): RoomPlacement {
  return { id: `${type}-${x}-${y}`, type, position: [x, y], size: [w, h], label: type };
}

describe("createBuilderState", () => {
  it("starts with empty rooms and no selection", () => {
    const state = createBuilderState();
    expect(state.rooms).toEqual([]);
    expect(state.selectedRoomId).toBeNull();
    expect(state.history.past).toEqual([]);
    expect(state.history.future).toEqual([]);
  });

  it("accepts initial rooms", () => {
    const state = createBuilderState([room("bullpen", 0, 0)]);
    expect(state.rooms).toHaveLength(1);
  });
});

describe("builderReducer", () => {
  it("adds a room", () => {
    const state = createBuilderState();
    const next = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("council-chamber", 0, 0, 3, 3),
    });
    expect(next.rooms).toHaveLength(1);
    expect(next.rooms[0].type).toBe("council-chamber");
  });

  it("records history on add (enables undo)", () => {
    const state = createBuilderState();
    const next = builderReducer(state, {
      type: "ADD_ROOM",
      room: room("bullpen", 0, 0),
    });
    expect(next.history.past).toHaveLength(1);
    expect(next.history.future).toEqual([]);
  });

  it("removes a room by id", () => {
    const state = createBuilderState([room("a", 0, 0), room("b", 2, 0)]);
    const next = builderReducer(state, { type: "REMOVE_ROOM", roomId: "a-0-0" });
    expect(next.rooms).toHaveLength(1);
    expect(next.rooms[0].id).toBe("b-2-0");
  });

  it("moves a room to new position", () => {
    const state = createBuilderState([room("a", 0, 0)]);
    const next = builderReducer(state, {
      type: "MOVE_ROOM",
      roomId: "a-0-0",
      position: [5, 3],
    });
    expect(next.rooms[0].position).toEqual([5, 3]);
  });

  it("resizes a room", () => {
    const state = createBuilderState([room("a", 0, 0, 2, 2)]);
    const next = builderReducer(state, {
      type: "RESIZE_ROOM",
      roomId: "a-0-0",
      size: [4, 3],
    });
    expect(next.rooms[0].size).toEqual([4, 3]);
  });

  it("updates room label", () => {
    const state = createBuilderState([room("a", 0, 0)]);
    const next = builderReducer(state, {
      type: "UPDATE_ROOM",
      roomId: "a-0-0",
      updates: { label: "My Custom Room" },
    });
    expect(next.rooms[0].label).toBe("My Custom Room");
  });

  it("selects a room", () => {
    const state = createBuilderState([room("a", 0, 0)]);
    const next = builderReducer(state, { type: "SELECT_ROOM", roomId: "a-0-0" });
    expect(next.selectedRoomId).toBe("a-0-0");
  });

  it("deselects room", () => {
    let state = createBuilderState([room("a", 0, 0)]);
    state = builderReducer(state, { type: "SELECT_ROOM", roomId: "a-0-0" });
    const next = builderReducer(state, { type: "SELECT_ROOM", roomId: null });
    expect(next.selectedRoomId).toBeNull();
  });

  describe("undo/redo", () => {
    it("undoes the last action", () => {
      let state = createBuilderState();
      state = builderReducer(state, { type: "ADD_ROOM", room: room("a", 0, 0) });
      expect(state.rooms).toHaveLength(1);

      state = builderReducer(state, { type: "UNDO" });
      expect(state.rooms).toHaveLength(0);
    });

    it("redoes an undone action", () => {
      let state = createBuilderState();
      state = builderReducer(state, { type: "ADD_ROOM", room: room("a", 0, 0) });
      state = builderReducer(state, { type: "UNDO" });
      expect(state.rooms).toHaveLength(0);

      state = builderReducer(state, { type: "REDO" });
      expect(state.rooms).toHaveLength(1);
    });

    it("clears future on new action after undo", () => {
      let state = createBuilderState();
      state = builderReducer(state, { type: "ADD_ROOM", room: room("a", 0, 0) });
      state = builderReducer(state, { type: "UNDO" });
      expect(state.history.future).toHaveLength(1);

      state = builderReducer(state, { type: "ADD_ROOM", room: room("b", 2, 0) });
      expect(state.history.future).toEqual([]);
    });

    it("does nothing on undo with empty history", () => {
      const state = createBuilderState();
      const next = builderReducer(state, { type: "UNDO" });
      expect(next).toBe(state);
    });

    it("does nothing on redo with empty future", () => {
      const state = createBuilderState();
      const next = builderReducer(state, { type: "REDO" });
      expect(next).toBe(state);
    });

    it("supports multiple undos", () => {
      let state = createBuilderState();
      state = builderReducer(state, { type: "ADD_ROOM", room: room("a", 0, 0) });
      state = builderReducer(state, { type: "ADD_ROOM", room: room("b", 2, 0) });
      state = builderReducer(state, { type: "ADD_ROOM", room: room("c", 4, 0) });
      expect(state.rooms).toHaveLength(3);

      state = builderReducer(state, { type: "UNDO" });
      state = builderReducer(state, { type: "UNDO" });
      expect(state.rooms).toHaveLength(1);
      expect(state.rooms[0].id).toBe("a-0-0");
    });
  });

  describe("overlap detection", () => {
    it("prevents adding a room that overlaps an existing one", () => {
      let state = createBuilderState([room("a", 0, 0, 3, 3)]);
      const next = builderReducer(state, {
        type: "ADD_ROOM",
        room: room("b", 1, 1, 2, 2), // overlaps a
      });
      // Should reject — rooms unchanged
      expect(next.rooms).toHaveLength(1);
    });

    it("allows adding a room that does not overlap", () => {
      let state = createBuilderState([room("a", 0, 0, 2, 2)]);
      const next = builderReducer(state, {
        type: "ADD_ROOM",
        room: room("b", 3, 0, 2, 2), // no overlap
      });
      expect(next.rooms).toHaveLength(2);
    });

    it("prevents moving a room into an overlapping position", () => {
      let state = createBuilderState([room("a", 0, 0, 2, 2), room("b", 4, 0, 2, 2)]);
      const next = builderReducer(state, {
        type: "MOVE_ROOM",
        roomId: "b-4-0",
        position: [1, 0], // would overlap a
      });
      // Should reject — position unchanged
      expect(next.rooms.find((r) => r.id === "b-4-0")!.position).toEqual([4, 0]);
    });
  });
});
