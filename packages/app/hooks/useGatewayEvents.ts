"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { EventBus, type DioramaEvent } from "@diorama/engine";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function useGatewayEvents() {
  const busRef = useRef(new EventBus());
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/gateway/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (e) => {
      try {
        const frame = JSON.parse(e.data);
        if (frame.type === "event" && frame.event && frame.event !== "proxy.connected") {
          const dioramaEvent: DioramaEvent = {
            type: frame.event,
            room: frame.payload?.room ?? "",
            agent: frame.payload?.agent ?? "",
            payload: frame.payload ?? {},
            timestamp: Date.now(),
          };
          busRef.current.dispatch(dioramaEvent);
        }
      } catch {
        // Ignore unparseable frames
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
    };

    ws.onerror = () => {
      setStatus("disconnected");
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { eventBus: busRef.current, status, connect, disconnect };
}
