export interface DioramaEvent {
  type: string;
  room: string;
  agent: string;
  payload: unknown;
  timestamp: number;
}

export interface EventFilter {
  type?: string;
  room?: string;
}

type EventHandler = (event: DioramaEvent) => void;

interface Subscription {
  handler: EventHandler;
  filter?: EventFilter;
}

export class EventBus {
  private subscriptions: Subscription[] = [];
  private history: DioramaEvent[] = [];

  subscribe(handler: EventHandler, filter?: EventFilter): () => void {
    const sub: Subscription = { handler, filter };
    this.subscriptions.push(sub);
    return () => {
      const idx = this.subscriptions.indexOf(sub);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }

  dispatch(event: DioramaEvent): void {
    this.history.push(event);
    for (const sub of this.subscriptions) {
      if (sub.filter?.type && sub.filter.type !== event.type) continue;
      if (sub.filter?.room && sub.filter.room !== event.room) continue;
      sub.handler(event);
    }
  }

  getHistory(): DioramaEvent[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
