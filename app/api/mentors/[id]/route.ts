import { NextRequest, NextResponse } from "next/server";
import { getMentorById, updateMentor, type MentorStyleConfig } from "@/lib/mentor-service";

export const runtime = "nodejs";

/**
 * PUT /api/mentors/:id — 更新导师人设
 * 请求体：{ system_prompt?: string, style_config?: { model? } }
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
    const { style_config, system_prompt } = body as {
      style_config?: MentorStyleConfig;
      system_prompt?: string;
    };

    if (system_prompt === undefined && style_config === undefined) {
      return NextResponse.json(
        { error: "system_prompt or style_config is required" },
        { status: 400 }
      );
    }
    if (system_prompt !== undefined && !system_prompt.trim()) {
      return NextResponse.json({ error: "system_prompt cannot be empty" }, { status: 400 });
    }

    const updated = updateMentor(mentorId, { system_prompt, style_config });
    return NextResponse.json({ mentor: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
