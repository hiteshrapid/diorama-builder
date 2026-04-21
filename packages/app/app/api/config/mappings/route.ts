import { NextResponse } from "next/server";
import { mutateConfig } from "@/lib/configStore";

interface MappingsBody {
  mappings?: unknown;
}

/**
 * Set events.mappings on the config. Body: { mappings: EventMapping[] }.
 */
export async function POST(request: Request) {
  let body: MappingsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.mappings)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'mappings' (array required)" },
      { status: 400 },
    );
  }

  const mappings = body.mappings;
  const result = mutateConfig((current) => {
    if (!current) {
      throw new Error(
        "No diorama config found. Design and save an office first.",
      );
    }
    return { ...current, events: { mappings } };
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, config: result.config });
}
