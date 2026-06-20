import { NextRequest, NextResponse } from "next/server";
import {
  deleteConversation,
  getConversationById,
  getMessagesPage,
} from "@/lib/conversation-service";
import { MESSAGE_PAGE_SIZE } from "@/lib/chat-constants";

export const runtime = "nodejs";

/**
 * GET /api/conversations/:id
 * 查询参数：?limit=20&before=123（加载 id 更早的消息）
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id, 10);
    const conversation = getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const beforeParam = searchParams.get("before");
    const limit = limitParam ? parseInt(limitParam, 10) : MESSAGE_PAGE_SIZE;
    const beforeId = beforeParam ? parseInt(beforeParam, 10) : undefined;

    const page = getMessagesPage(conversationId, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : MESSAGE_PAGE_SIZE,
      beforeId: Number.isFinite(beforeId) ? beforeId : undefined,
    });

    return NextResponse.json({
      conversation,
      messages: page.items,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations/:id — 软删除对话
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id, 10);
    const conversation = getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    deleteConversation(conversationId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
