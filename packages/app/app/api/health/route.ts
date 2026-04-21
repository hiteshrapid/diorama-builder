import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "diorama",
    version: "0.1.0",
    port: Number(process.env.PORT ?? 3000),
  });
}
