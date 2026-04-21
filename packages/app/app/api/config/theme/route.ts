import { NextResponse } from "next/server";
import { mutateConfig } from "@/lib/configStore";

interface ThemeBody {
  theme?: unknown;
}

/**
 * Update the top-level `theme` field. Body: { theme: string }.
 */
export async function POST(request: Request) {
  let body: ThemeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (typeof body.theme !== "string" || body.theme.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'theme' (non-empty string required)" },
      { status: 400 },
    );
  }

  const theme = body.theme;
  const result = mutateConfig((current) => {
    if (!current) {
      throw new Error(
        "No diorama config found. Design and save an office first.",
      );
    }
    return { ...current, theme };
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, config: result.config });
}
