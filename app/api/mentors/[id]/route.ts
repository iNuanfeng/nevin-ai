import { NextRequest, NextResponse } from "next/server";
import { getMentorById, updateMentorStyleConfig } from "@/lib/mentor-service";

export const runtime = "nodejs";

/**
 * PUT /api/mentors/:id — 更新导师人设（style_config）
 * 请求体：{ style_config: { style?, rules?, tone? } }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mentorId = parseInt(id);
    const mentor = getMentorById(mentorId);
    if (!mentor) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const body = await req.json();
    const { style_config } = body;

    if (!style_config) {
      return NextResponse.json({ error: "style_config is required" }, { status: 400 });
    }

    const updated = updateMentorStyleConfig(mentorId, style_config);
    return NextResponse.json({ mentor: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
