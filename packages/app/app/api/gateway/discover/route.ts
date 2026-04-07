import { NextResponse } from "next/server";

// Default demo agents when real gateway isn't available
const DEMO_AGENTS = [
  { id: "aegis-prime", role: "prime" },
  { id: "herald", role: "herald" },
  { id: "sentinel", role: "sentinel" },
  { id: "scribe", role: "scribe" },
  { id: "contrarian", role: "contrarian" },
];

export async function POST(request: Request) {
  try {
    const { url, token, useDemoData } = await request.json();

    if (useDemoData) {
      return NextResponse.json({ ok: true, agents: DEMO_AGENTS });
    }

    if (!url) {
      return NextResponse.json({ ok: false, error: "Gateway URL is required" }, { status: 400 });
    }

    // Try to discover agents from the gateway
    const { OpenClawGatewayClient } = await import("@diorama/plugins");
    const client = new OpenClawGatewayClient({ url, token: token ?? "" });

    const agents: Array<{ id: string; role?: string }> = [];

    try {
      client.onEvent((event, payload) => {
        if (event === "agents.list" || event === "presence.sync") {
          const list = (payload as { agents?: Array<{ id: string; role?: string }> }).agents;
          if (Array.isArray(list)) {
            agents.push(...list);
          }
        }
        // OpenClaw gateway sends agent data in health events
        if (event === "health") {
          const healthAgents = (payload as { agents?: Array<{ agentId: string; name?: string; isDefault?: boolean }> }).agents;
          if (Array.isArray(healthAgents)) {
            for (const a of healthAgents) {
              if (!agents.some((x) => x.id === a.agentId)) {
                agents.push({ id: a.agentId, role: a.name });
              }
            }
          }
        }
      });

      await client.connect();

      // Wait briefly for agent discovery events
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await client.disconnect();

      if (agents.length === 0) {
        // Fallback to demo data if no agents discovered
        return NextResponse.json({ ok: true, agents: DEMO_AGENTS, source: "demo" });
      }

      return NextResponse.json({ ok: true, agents, source: "gateway" });
    } catch {
      // Gateway connection failed, fallback to demo
      return NextResponse.json({ ok: true, agents: DEMO_AGENTS, source: "demo" });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }
}
