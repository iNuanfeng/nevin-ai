import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/search-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || !q.trim()) {
      return NextResponse.json({ conversations: [], persons: [], memories: [] });
    }
    const results = searchAll(q.trim());
    return NextResponse.json(results);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
