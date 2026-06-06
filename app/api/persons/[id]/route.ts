import { NextRequest, NextResponse } from "next/server";
import { getPersonById, updatePerson, deletePerson } from "@/lib/person-service";

export const runtime = "nodejs";

/**
 * PUT /api/persons/:id — 更新联系人
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personId = parseInt(id);
    const existing = getPersonById(personId);
    if (!existing) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    const body = await req.json();
    const updated = updatePerson(personId, body);
    return NextResponse.json({ person: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/persons/:id — 删除联系人
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personId = parseInt(id);
    const existing = getPersonById(personId);
    if (!existing) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    deletePerson(personId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
