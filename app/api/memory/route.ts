import { NextRequest, NextResponse } from "next/server";
import { retrieveRelevant, storeMemory } from "@/lib/memory-service";

export const runtime = "nodejs";

/**
 * GET /api/memory — 检索记忆
 * 查询参数：q=关键词&mentorId=1&personId=2&limit=10
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") ?? "";
    const mentorId = searchParams.get("mentorId");
    const personId = searchParams.get("personId");
    const limit = searchParams.get("limit");

    const memories = retrieveRelevant(query, {
      mentorId: mentorId ? parseInt(mentorId) : undefined,
      personId: personId ? parseInt(personId) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ memories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/memory — 手动添加记忆
 * 请求体：{ content, category?, entities?, importance?, mentor_id?, source_conversation_id? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const memory = storeMemory({
      content: body.content,
      category: body.category,
      entities: body.entities,
      importance: body.importance,
      mentor_id: body.mentor_id ?? body.mentorId,
      source_conversation_id: body.source_conversation_id ?? body.sourceConversationId,
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
