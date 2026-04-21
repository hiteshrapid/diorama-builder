/**
 * EventBroadcaster — lightweight pub/sub for fanning out events to multiple
 * subscribers. Transport-agnostic: subscribers provide a send callback; the
 * broadcaster serializes once and delivers the same JSON frame to each.
 *
 * Used to bridge HTTP POST → WebSocket: the /api/events/emit handler calls
 * `broadcast()`, and each connected browser socket is a subscriber.
 */

export type BroadcastSender = (frame: string) => void;

export class EventBroadcaster {
  private subscribers = new Set<BroadcastSender>();

  subscribe(send: BroadcastSender): () => void {
    this.subscribers.add(send);
    return () => {
      this.subscribers.delete(send);
    };
  }

  broadcast(data: unknown): number {
    const frame = JSON.stringify(data);
    let delivered = 0;
    for (const send of this.subscribers) {
      try {
        send(frame);
        delivered += 1;
      } catch {
        // Ignore per-subscriber failures so one bad socket doesn't block the rest.
      }
    }
    return delivered;
  }

  get subscriberCount(): number {
    return this.subscribers.size;
  }

  clear(): void {
    this.subscribers.clear();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __dioramaBroadcaster: EventBroadcaster | undefined;
}

/**
 * Shared singleton. Survives Next.js HMR by attaching to `globalThis`,
 * so the /api/events/emit route and the WS upgrade handler in the custom
 * CLI server see the same instance.
 */
export function getGlobalBroadcaster(): EventBroadcaster {
  if (!globalThis.__dioramaBroadcaster) {
    globalThis.__dioramaBroadcaster = new EventBroadcaster();
  }
  return globalThis.__dioramaBroadcaster;
}
