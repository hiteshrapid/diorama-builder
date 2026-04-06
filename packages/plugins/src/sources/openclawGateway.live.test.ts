import { describe, it, expect } from "vitest";
import { OpenClawGatewayClient } from "./openclawGateway";

/**
 * Live integration test against a real OpenClaw gateway.
 * Requires GCP gateway reachable at ws://100.74.232.125:18789 via Tailscale.
 *
 * Run with: npx vitest run packages/plugins/src/sources/openclawGateway.live.test.ts
 */
describe("OpenClawGateway — live GCP integration", () => {
  // Try local gateway first (auto-pairs), fall back to GCP
  const GATEWAY_URL = process.env.DIORAMA_GATEWAY_URL ?? "ws://localhost:18789";
  const TOKEN = process.env.DIORAMA_GATEWAY_TOKEN ?? "localdev";

  it("connects to GCP gateway and completes handshake", async () => {
    const client = new OpenClawGatewayClient({ url: GATEWAY_URL, token: TOKEN });

    const stateLog: string[] = [];
    client.onStateChange((s) => stateLog.push(s));

    await client.connect();

    expect(client.getState()).toBe("connected");
    expect(stateLog).toContain("connecting");
    expect(stateLog).toContain("connected");

    await client.disconnect();
    expect(client.getState()).toBe("disconnected");
  }, 15000);

  it("receives events after connecting", async () => {
    const client = new OpenClawGatewayClient({ url: GATEWAY_URL, token: TOKEN });

    const events: Array<{ event: string; payload: unknown }> = [];
    client.onEvent((event, payload) => {
      events.push({ event, payload });
    });

    await client.connect();

    // Wait a bit for any events (heartbeats, presence, etc.)
    await new Promise((r) => setTimeout(r, 3000));

    // We might not get events if gateway is idle, but connection should stay alive
    expect(client.getState()).toBe("connected");

    await client.disconnect();
  }, 20000);

  it("handles disconnect gracefully", async () => {
    const client = new OpenClawGatewayClient({ url: GATEWAY_URL, token: TOKEN });
    await client.connect();
    expect(client.getState()).toBe("connected");

    await client.disconnect();
    expect(client.getState()).toBe("disconnected");
  }, 15000);
});
