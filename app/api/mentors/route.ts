import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/mentors — 导师列表（完整字段，供前端人设管理页使用）
 */
export async function GET() {
  const db = getDb();
  const mentors = db.prepare("SELECT * FROM mentors ORDER BY sort_order").all();
  return NextResponse.json({ mentors });
}
