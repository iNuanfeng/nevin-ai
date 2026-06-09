import { NextRequest, NextResponse } from "next/server";
import { handleMessage } from "@/lib/chat-service";

export const runtime = "nodejs";

/**
 * POST /api/chat
 *
 * SSE 流式对话接口。
 * 请求体：{ conversationId: number, content: string, images?: string[] }
 * 响应：text/event-stream
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, content, images, model } = body;

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: "conversationId and content are required" },
        { status: 400 }
      );
    }

    // 创建 SSE 流
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let closed = false;

        handleMessage(
          { conversationId, content, images, model },
          {
            onChunk: (text) => {
              if (!closed) {
                const data = encoder.encode(`event: chunk\ndata: ${JSON.stringify({ content: text })}\n\n`);
                controller.enqueue(data);
              }
            },
            onReasoningChunk: (text) => {
              if (!closed) {
                const data = encoder.encode(`event: reasoning\ndata: ${JSON.stringify({ content: text })}\n\n`);
                controller.enqueue(data);
              }
            },
            onDone: (message) => {
              if (!closed) {
                const data = encoder.encode(`event: done\ndata: ${JSON.stringify({ conversationId: message.conversation_id, messageId: message.id })}\n\n`);
                controller.enqueue(data);
                controller.close();
                closed = true;
              }
            },
            onMemoryStored: (count) => {
              if (!closed) {
                const data = encoder.encode(`event: memory\ndata: ${JSON.stringify({ action: "stored", count })}\n\n`);
                controller.enqueue(data);
              }
            },
            onPersonUpdated: (personId, field, hasNew) => {
              if (!closed) {
                const data = encoder.encode(`event: person-update\ndata: ${JSON.stringify({ personId, field, hasNew })}\n\n`);
                controller.enqueue(data);
              }
            },
            onError: (error) => {
              if (!closed) {
                const data = encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
                controller.enqueue(data);
                controller.close();
                closed = true;
              }
            },
          }
        );
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
