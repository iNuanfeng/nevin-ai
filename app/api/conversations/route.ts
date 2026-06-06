import { NextRequest, NextResponse } from "next/server";
import { getConversations, createConversation } from "@/lib/conversation-service";

export const runtime = "nodejs";

/**
 * GET /api/conversations
 * 查询参数：?mentorId=1
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mentorId = searchParams.get("mentorId");
    const list = getConversations(mentorId ? parseInt(mentorId) : undefined);
    return NextResponse.json({ conversations: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 * 请求体：{ mentorId: number, title?: string, personIds?: number[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mentorId, title, personIds } = body;

    if (!mentorId) {
      return NextResponse.json({ error: "mentorId is required" }, { status: 400 });
    }

    const conversation = createConversation(mentorId, title, personIds);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
