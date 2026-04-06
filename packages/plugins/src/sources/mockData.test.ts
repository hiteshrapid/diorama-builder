import { describe, it, expect, vi } from "vitest";
import { mockDataPlugin, createMockEventStream } from "./mockData";

describe("mockDataPlugin", () => {
  it("has correct plugin metadata", () => {
    expect(mockDataPlugin.kind).toBe("source");
    expect(mockDataPlugin.type).toBe("mock-data");
  });

  it("has connect and disconnect methods", () => {
    expect(typeof mockDataPlugin.connect).toBe("function");
    expect(typeof mockDataPlugin.disconnect).toBe("function");
  });
});

describe("createMockEventStream", () => {
  it("generates events with valid structure", () => {
    const events = createMockEventStream(5);
    expect(events).toHaveLength(5);
    for (const event of events) {
      expect(event.type).toBeTruthy();
      expect(event.room).toBeTruthy();
      expect(event.agent).toBeTruthy();
      expect(typeof event.timestamp).toBe("number");
    }
  });

  it("generates events in chronological order", () => {
    const events = createMockEventStream(10);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
    }
  });

  it("generates a full pipeline sequence when count is sufficient", () => {
    const events = createMockEventStream(20);
    const types = events.map((e) => e.type);
    // Should include intake, council, sentinel events
    expect(types.some((t) => t.includes("intake"))).toBe(true);
    expect(types.some((t) => t.includes("council"))).toBe(true);
    expect(types.some((t) => t.includes("sentinel"))).toBe(true);
  });
});
