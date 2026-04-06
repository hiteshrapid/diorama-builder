import WebSocket from "ws";
import {
  createConnectRequest,
  generateDeviceIdentity,
  parseFrame,
  serializeFrame,
  isEventFrame,
  isResponseFrame,
  type EventFrame,
  type DeviceIdentity,
} from "./gatewayProtocol";

export type GatewayConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

type EventHandler = (event: string, payload: Record<string, unknown>) => void;
type StateHandler = (state: GatewayConnectionState) => void;

export interface GatewayClientOptions {
  url: string;
  token: string;
  reconnect?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  };
}

export class OpenClawGatewayClient {
  readonly url: string;
  private token: string;
  private ws: WebSocket | null = null;
  private state: GatewayConnectionState = "disconnected";
  private eventHandlers: EventHandler[] = [];
  private stateHandlers: StateHandler[] = [];
  private connectResolve: ((value: void) => void) | null = null;
  private connectReject: ((reason: Error) => void) | null = null;
  private pendingConnectId: string | null = null;
  private device: DeviceIdentity | null = null;

  constructor(opts: GatewayClientOptions) {
    this.url = opts.url;
    this.token = opts.token;
  }

  getState(): GatewayConnectionState {
    return this.state;
  }

  /** Exposed for testing — do not use in production code. */
  _setState(state: GatewayConnectionState): void {
    this.state = state;
    for (const h of this.stateHandlers) h(state);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.push(handler);
    return () => {
      const idx = this.stateHandlers.indexOf(handler);
      if (idx >= 0) this.stateHandlers.splice(idx, 1);
    };
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const idx = this.eventHandlers.indexOf(handler);
      if (idx >= 0) this.eventHandlers.splice(idx, 1);
    };
  }

  async connect(): Promise<void> {
    // Generate device identity for auth
    if (!this.device) {
      this.device = await generateDeviceIdentity();
    }

    return new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
      this._setState("connecting");

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout (8s)"));
        this.cleanup();
      }, 8000);

      // Set origin to gateway host to satisfy controlUi origin check
      const gatewayOrigin = this.url.replace(/^ws/, "http").replace(/\/+$/, "");
      this.ws = new WebSocket(this.url, { headers: { Origin: gatewayOrigin } });

      this.ws.on("open", () => {
        // Wait for connect.challenge event
      });

      this.ws.on("message", async (data: Buffer | string) => {
        const raw = typeof data === "string" ? data : data.toString("utf-8");
        try {
          const frame = parseFrame(raw);

          if (isEventFrame(frame)) {
            const ef = frame as EventFrame;

            if (ef.event === "connect.challenge") {
              // Respond with connect request including device auth
              const nonce = (ef.payload.nonce as string) ?? "";
              const req = await createConnectRequest({
                token: this.token,
                nonce,
                device: this.device!,
              });
              this.pendingConnectId = req.id;
              this.ws!.send(serializeFrame(req));
              return;
            }

            // Normal event — dispatch to handlers
            for (const h of this.eventHandlers) {
              h(ef.event, ef.payload);
            }
          }

          if (isResponseFrame(frame)) {
            if (frame.id === this.pendingConnectId) {
              clearTimeout(timeout);
              if (frame.ok) {
                this._setState("connected");
                this.connectResolve?.();
              } else {
                const err = new Error(
                  `Connect failed: ${frame.error?.code ?? "unknown"} — ${frame.error?.message ?? ""}`
                );
                this._setState("disconnected");
                this.connectReject?.(err);
              }
              this.connectResolve = null;
              this.connectReject = null;
              this.pendingConnectId = null;
            }
          }
        } catch (e) {
          // Ignore unparseable frames
        }
      });

      this.ws.on("error", (err) => {
        clearTimeout(timeout);
        this._setState("disconnected");
        this.connectReject?.(err as Error);
        this.connectResolve = null;
        this.connectReject = null;
      });

      this.ws.on("close", () => {
        if (this.state === "connected") {
          this._setState("disconnected");
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setState("disconnected");
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setState("disconnected");
  }
}
