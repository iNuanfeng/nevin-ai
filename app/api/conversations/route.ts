import { NextRequest, NextResponse } from "next/server";
import {
  CONVERSATION_LIST_PAGE_SIZE,
  countConversations,
  createConversation,
  getConversationsPage,
} from "@/lib/conversation-service";

export const runtime = "nodejs";

/**
 * GET /api/conversations
 * 查询参数：?mentorId=1&category=workplace&limit=5&cursor=...&countOnly=1
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mentorIdParam = searchParams.get("mentorId");
    const category = searchParams.get("category") || undefined;
    const mentorId = mentorIdParam ? parseInt(mentorIdParam, 10) : undefined;

    if (searchParams.get("countOnly") === "1") {
      return NextResponse.json({
        count: countConversations({
          mentorId: Number.isFinite(mentorId) ? mentorId : undefined,
          category,
        }),
      });
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : CONVERSATION_LIST_PAGE_SIZE;
    const cursor = searchParams.get("cursor") || undefined;

    const page = getConversationsPage({
      mentorId: Number.isFinite(mentorId) ? mentorId : undefined,
      category,
      limit: Number.isFinite(limit) && limit > 0 ? limit : CONVERSATION_LIST_PAGE_SIZE,
      cursor,
    });

    return NextResponse.json({
      conversations: page.items,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    });
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
