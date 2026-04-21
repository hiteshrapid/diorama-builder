import { NextResponse } from "next/server";
import { mutateConfig } from "@/lib/configStore";

/**
 * Append a single room to the existing config. Body is a RoomConfig object.
 * Validates the merged config via parseConfig (includes the new room).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Body must be a RoomConfig object" },
      { status: 400 },
    );
  }

  const result = mutateConfig((current) => {
    if (!current) {
      throw new Error(
        "No diorama config found. Design and save an office first.",
      );
    }
    const rooms = Array.isArray(current.rooms) ? [...current.rooms] : [];
    rooms.push(body);
    return { ...current, rooms };
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, config: result.config });
}
