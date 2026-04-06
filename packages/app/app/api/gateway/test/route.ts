import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url, token } = await request.json();
    if (!url) {
      return NextResponse.json({ ok: false, error: "Gateway URL is required" }, { status: 400 });
    }

    // Dynamic import to avoid bundling ws for the client
    const { OpenClawGatewayClient } = await import("@diorama/plugins");

    const client = new OpenClawGatewayClient({ url, token: token ?? "" });

    try {
      await client.connect();
      await client.disconnect();
      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }
}
