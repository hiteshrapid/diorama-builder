import { NextResponse } from "next/server";
import { readSetupState, writeSetupState } from "@/lib/configStore";

/**
 * Save-done signal from the builder. The MCP's diorama_get_config({waitForSave})
 * polls this timestamp to know when the user clicked "Save & Continue" in the
 * builder. Persisted to ~/.diorama/setup-state.json so the signal survives
 * across the Next.js process lifetime.
 */
export async function POST() {
  const savedAt = Date.now();
  try {
    writeSetupState({ savedAt });
    return NextResponse.json({ ok: true, savedAt });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(readSetupState());
}
