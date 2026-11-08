import { NextResponse } from "next/server";
import { liveSchedule } from "@/commerce/schedule";
export const runtime = "nodejs";
export async function GET() {
  try {
    return NextResponse.json(await liveSchedule(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { dates: [], availability: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
