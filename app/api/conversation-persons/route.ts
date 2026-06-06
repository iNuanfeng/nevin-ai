import { NextRequest, NextResponse } from "next/server";
import { getPersonsByConversation, addPersonToConversation, removePersonFromConversation } from "@/lib/person-service";
import { getConversationById } from "@/lib/conversation-service";

export const runtime = "nodejs";

/**
 * GET /api/conversation-persons?conversationId=1
 * 获取某对话关联的联系人列表
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }
    const persons = getPersonsByConversation(parseInt(conversationId));
    return NextResponse.json({ persons });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/conversation-persons — 在对话中添加联系人
 * 请求体：{ conversationId, personId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, personId } = body;

    if (!conversationId || !personId) {
      return NextResponse.json({ error: "conversationId and personId are required" }, { status: 400 });
    }

    const conversation = getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    addPersonToConversation(conversationId, personId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/conversation-persons — 从对话中移除联系人
 * 请求体：{ conversationId, personId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, personId } = body;

    if (!conversationId || !personId) {
      return NextResponse.json({ error: "conversationId and personId are required" }, { status: 400 });
    }

    removePersonFromConversation(conversationId, personId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
