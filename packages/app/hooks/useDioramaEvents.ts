"use client";

import { useEffect, useRef } from "react";
import { type EventBus, type DioramaEvent } from "@diorama/engine";

/**
 * Subscribes to /api/events/stream and pushes every broadcast event into the
 * provided EventBus. Used to receive DioramaEvents emitted via
 * /api/events/emit (from the MCP server or from user agent code).
 *
 * Sharing an EventBus with useGatewayEvents means the same rendering pipeline
 * (activity indicators, feed entries, room glow) handles both MCP-emitted and
 * real gateway events with no duplicate wiring.
 */
export function useDioramaEvents(eventBus: EventBus | null) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!eventBus || typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/events/stream`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const frame = JSON.parse(e.data);
        if (frame.type !== "diorama-event" || !frame.event) return;
        const raw = frame.event;
        const evt: DioramaEvent = {
          type: String(raw.type ?? ""),
          room: String(raw.room ?? ""),
          agent: String(raw.agent ?? ""),
          payload: raw.payload ?? {},
          timestamp: typeof raw.timestamp === "number" ? raw.timestamp : Date.now(),
        };
        if (!evt.type) return;
        eventBus.dispatch(evt);
      } catch {
        // ignore unparseable frames (e.g. the initial "subscribed" frame)
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [eventBus]);
}
