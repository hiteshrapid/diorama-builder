import { describe, it, expect, vi } from "vitest";
import { EventBus, type DioramaEvent } from "./eventBus";

function makeEvent(type: string, agent?: string): DioramaEvent {
  return {
    type,
    room: "test-room",
    agent: agent ?? "agent-1",
    payload: {},
    timestamp: Date.now(),
  };
}

describe("EventBus", () => {
  it("starts with no subscribers", () => {
    const bus = new EventBus();
    // Dispatching with no subscribers should not throw
    bus.dispatch(makeEvent("test.event"));
  });

  it("delivers events to subscribers", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe(handler);
    const event = makeEvent("agent.started");
    bus.dispatch(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("delivers events to multiple subscribers", () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.subscribe(handler1);
    bus.subscribe(handler2);
    bus.dispatch(makeEvent("test.event"));
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes correctly", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.subscribe(handler);
    unsub();
    bus.dispatch(makeEvent("test.event"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("preserves event ordering", () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.subscribe((e) => received.push(e.type));

    bus.dispatch(makeEvent("first"));
    bus.dispatch(makeEvent("second"));
    bus.dispatch(makeEvent("third"));

    expect(received).toEqual(["first", "second", "third"]);
  });

  it("supports filtered subscriptions by event type", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe(handler, { type: "agent.started" });

    bus.dispatch(makeEvent("agent.started"));
    bus.dispatch(makeEvent("agent.stopped"));
    bus.dispatch(makeEvent("agent.started"));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("supports filtered subscriptions by room", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe(handler, { room: "war-room" });

    bus.dispatch({ ...makeEvent("a"), room: "war-room" });
    bus.dispatch({ ...makeEvent("b"), room: "test-lab" });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("keeps event history", () => {
    const bus = new EventBus();
    bus.dispatch(makeEvent("a"));
    bus.dispatch(makeEvent("b"));
    expect(bus.getHistory()).toHaveLength(2);
    expect(bus.getHistory()[0].type).toBe("a");
    expect(bus.getHistory()[1].type).toBe("b");
  });

  it("clears history", () => {
    const bus = new EventBus();
    bus.dispatch(makeEvent("a"));
    bus.clearHistory();
    expect(bus.getHistory()).toHaveLength(0);
  });
});
