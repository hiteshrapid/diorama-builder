import { NextResponse } from "next/server";
import { getGlobalBroadcaster } from "@diorama/engine";

interface EmitBody {
  type?: unknown;
  room?: unknown;
  agent?: unknown;
  payload?: unknown;
  timestamp?: unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export async function POST(request: Request) {
  let body: EmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!isNonEmptyString(body.type)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'type' (non-empty string required)" },
      { status: 400 },
    );
  }
  if (!isNonEmptyString(body.room)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'room' (non-empty string required)" },
      { status: 400 },
    );
  }
  if (!isNonEmptyString(body.agent)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'agent' (non-empty string required)" },
      { status: 400 },
    );
  }

  const event = {
    type: body.type,
    room: body.room,
    agent: body.agent,
    payload: body.payload && typeof body.payload === "object" ? body.payload : {},
    timestamp: typeof body.timestamp === "number" ? body.timestamp : Date.now(),
  };

  const delivered = getGlobalBroadcaster().broadcast({ type: "diorama-event", event });

  return NextResponse.json({ ok: true, delivered });
}
