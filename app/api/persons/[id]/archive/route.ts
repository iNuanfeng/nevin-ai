import { NextRequest, NextResponse } from "next/server";
import { getPersonById, archivePerson } from "@/lib/person-service";

export const runtime = "nodejs";

/**
 * PUT /api/persons/:id/archive — 归档联系人
 */
export async function PUT(
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
    const updated = archivePerson(personId);
    return NextResponse.json({ person: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
