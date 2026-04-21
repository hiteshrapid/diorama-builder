import { describe, it, expect, beforeEach } from "vitest";
import { EventBroadcaster, getGlobalBroadcaster } from "./broadcaster";

describe("EventBroadcaster", () => {
  let bus: EventBroadcaster;

  beforeEach(() => {
    bus = new EventBroadcaster();
  });

  it("starts with zero subscribers", () => {
    expect(bus.subscriberCount).toBe(0);
  });

  it("delivers broadcast to a single subscriber", () => {
    const received: string[] = [];
    bus.subscribe((frame) => received.push(frame));
    const count = bus.broadcast({ hello: "world" });
    expect(count).toBe(1);
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0])).toEqual({ hello: "world" });
  });

  it("delivers to multiple subscribers", () => {
    const a: string[] = [];
    const b: string[] = [];
    bus.subscribe((f) => a.push(f));
    bus.subscribe((f) => b.push(f));
    const count = bus.broadcast({ n: 1 });
    expect(count).toBe(2);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("unsubscribes via returned disposer", () => {
    const received: string[] = [];
    const dispose = bus.subscribe((f) => received.push(f));
    bus.broadcast({ n: 1 });
    dispose();
    bus.broadcast({ n: 2 });
    expect(received).toHaveLength(1);
    expect(bus.subscriberCount).toBe(0);
  });

  it("reports subscriberCount accurately", () => {
    const d1 = bus.subscribe(() => {});
    const d2 = bus.subscribe(() => {});
    expect(bus.subscriberCount).toBe(2);
    d1();
    expect(bus.subscriberCount).toBe(1);
    d2();
    expect(bus.subscriberCount).toBe(0);
  });

  it("keeps delivering when one subscriber throws", () => {
    const good: string[] = [];
    bus.subscribe(() => {
      throw new Error("boom");
    });
    bus.subscribe((f) => good.push(f));
    const count = bus.broadcast({ n: 1 });
    // Throwing subscriber still counts as failed delivery (delivered counter
    // only increments on success).
    expect(count).toBe(1);
    expect(good).toHaveLength(1);
  });

  it("clear() removes all subscribers", () => {
    bus.subscribe(() => {});
    bus.subscribe(() => {});
    bus.clear();
    expect(bus.subscriberCount).toBe(0);
  });

  it("serializes payload as JSON string", () => {
    let captured: string | undefined;
    bus.subscribe((f) => {
      captured = f;
    });
    bus.broadcast({ nested: { a: [1, 2, 3] } });
    expect(captured).toBe('{"nested":{"a":[1,2,3]}}');
  });
});

describe("getGlobalBroadcaster", () => {
  beforeEach(() => {
    // Reset the global singleton for isolated tests
    (globalThis as { __dioramaBroadcaster?: unknown }).__dioramaBroadcaster =
      undefined;
  });

  it("returns the same instance across calls", () => {
    const a = getGlobalBroadcaster();
    const b = getGlobalBroadcaster();
    expect(a).toBe(b);
  });

  it("persists subscriptions across retrievals", () => {
    const received: string[] = [];
    getGlobalBroadcaster().subscribe((f) => received.push(f));
    getGlobalBroadcaster().broadcast({ n: 1 });
    expect(received).toHaveLength(1);
  });
});
