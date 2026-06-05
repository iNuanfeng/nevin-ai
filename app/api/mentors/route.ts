import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const mentors = db.prepare(
    "SELECT id, name, title, description, category, sort_order FROM mentors ORDER BY sort_order"
  ).all();
  return NextResponse.json({ mentors });
}
