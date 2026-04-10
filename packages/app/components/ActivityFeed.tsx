"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentActivity } from "@diorama/engine";

export interface FeedEntry {
  id: string;
  label: string;
  agentColor: string;
  timestamp: number;
  activity: AgentActivity;
}

interface ActivityFeedProps {
  entries: FeedEntry[];
}

function relativeTime(ts: number, now: number): string {
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 1) return "now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(Date.now());

  // Update relative timestamps every second
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 10,
        width: 340,
        maxHeight: 280,
        background: "rgba(13,21,32,0.85)",
        borderRadius: 8,
        border: "1px solid rgba(128,144,192,0.15)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          fontSize: 11,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color: "#8090c0",
          borderBottom: "1px solid rgba(128,144,192,0.1)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Activity
      </div>

      {/* Scrollable entries */}
      <div
        ref={scrollRef}
        style={{
          overflowY: "auto",
          padding: "6px 0",
          flex: 1,
          minHeight: 0,
        }}
      >
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: "4px 12px",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 11,
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              lineHeight: 1.4,
            }}
          >
            {/* Agent color dot */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: entry.agentColor,
                marginTop: 4,
                flexShrink: 0,
                boxShadow: `0 0 4px ${entry.agentColor}40`,
              }}
            />
            {/* Label */}
            <span style={{ color: "#c0c8e0", flex: 1 }}>
              {entry.label}
            </span>
            {/* Timestamp */}
            <span
              style={{
                color: "rgba(128,144,192,0.4)",
                fontSize: 10,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {relativeTime(entry.timestamp, tick)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
