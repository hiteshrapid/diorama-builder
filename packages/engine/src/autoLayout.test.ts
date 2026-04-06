import { describe, it, expect } from "vitest";
import { generateAutoLayout, findNextPosition } from "./autoLayout";
import { ROOM_PRESETS } from "./roomPresets";

describe("generateAutoLayout", () => {
  it("places one room per preset by default", () => {
    const result = generateAutoLayout(["agent-1", "agent-2"]);
    expect(result.rooms).toHaveLength(ROOM_PRESETS.length);
    const presetIds = result.rooms.map((r) => r.preset);
    for (const preset of ROOM_PRESETS) {
      expect(presetIds).toContain(preset.id);
    }
  });

  it("produces no overlapping rooms", () => {
    const result = generateAutoLayout(["a", "b", "c", "d", "e", "f", "g"]);
    for (let i = 0; i < result.rooms.length; i++) {
      for (let j = i + 1; j < result.rooms.length; j++) {
        const a = result.rooms[i];
        const b = result.rooms[j];
        const overlaps =
          a.position[0] < b.position[0] + b.size[0] &&
          a.position[0] + a.size[0] > b.position[0] &&
          a.position[1] < b.position[1] + b.size[1] &&
          a.position[1] + a.size[1] > b.position[1];
        expect(overlaps, `rooms ${a.preset} and ${b.preset} overlap`).toBe(false);
      }
    }
  });

  it("assigns all agents to desks round-robin", () => {
    const agents = ["agent-1", "agent-2", "agent-3", "agent-4", "agent-5"];
    const result = generateAutoLayout(agents);
    for (const agent of agents) {
      expect(result.agents[agent]).toBeDefined();
      expect(result.agents[agent].desk).toBeTruthy();
    }
  });

  it("creates a general workspace when no presets given and list is empty", () => {
    const result = generateAutoLayout([], []);
    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].preset).toBe("workspace");
    expect(result.rooms[0].label).toBe("General");
  });

  it("uses custom presets when provided", () => {
    const custom = [ROOM_PRESETS[0], ROOM_PRESETS[2]]; // meeting + private
    const result = generateAutoLayout(["a"], custom);
    expect(result.rooms).toHaveLength(2);
    expect(result.rooms.map((r) => r.preset)).toEqual(["meeting", "private"]);
  });

  it("handles many agents without errors", () => {
    const agents = Array.from({ length: 20 }, (_, i) => `agent-${i}`);
    const result = generateAutoLayout(agents);
    expect(Object.keys(result.agents)).toHaveLength(20);
  });
});

describe("findNextPosition", () => {
  it("places first room at origin", () => {
    expect(findNextPosition([2, 2], [])).toEqual([0, 0]);
  });

  it("places next room adjacent to first", () => {
    const existing = [{ position: [0, 0] as [number, number], size: [3, 3] as [number, number] }];
    const pos = findNextPosition([2, 2], existing);
    // Should be to the right or below, not overlapping
    expect(pos[0] >= 3 || pos[1] >= 3).toBe(true);
  });

  it("wraps to next row when exceeding max width", () => {
    const existing = [
      { position: [0, 0] as [number, number], size: [10, 2] as [number, number] },
    ];
    const pos = findNextPosition([4, 3], existing, 12);
    expect(pos[1]).toBeGreaterThanOrEqual(2);
  });
});
