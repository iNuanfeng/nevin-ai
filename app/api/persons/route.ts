import { NextRequest, NextResponse } from "next/server";
import { getAllPersons, createPerson } from "@/lib/person-service";

export const runtime = "nodejs";

/**
 * GET /api/persons — 联系人列表
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const archived = searchParams.get("archived");
    const filter = archived !== null ? parseInt(archived) : -1;
    const persons = getAllPersons(filter);
    return NextResponse.json({ persons });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/persons — 新建联系人
 * 请求体：{ name, relationship?, category?, background?, personality_notes?, relationship_dynamics?, recent_status?, strategy_notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const person = createPerson(body);
    return NextResponse.json({ person }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
