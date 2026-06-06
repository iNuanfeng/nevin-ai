/**
 * Chat API Test Specifications
 *
 * 接口：POST /api/chat（SSE 流式）
 * 注意：需要 DEEPSEEK_API_KEY 才能测试完整流，无 API Key 时测试 error 路径
 */
export const tests = [
  {
    name: "POST /api/chat 无 conversationId 返回 400",
    method: "POST",
    url: "/api/chat",
    body: { content: "你好" },
    expect: { status: 400 },
  },
  {
    name: "POST /api/chat 无 content 返回 400",
    method: "POST",
    url: "/api/chat",
    body: { conversationId: 1 },
    expect: { status: 400 },
  },
  {
    name: "POST /api/chat SSE 响应头格式",
    method: "POST",
    url: "/api/chat",
    body: { conversationId: 1, content: "你好" },
    expect: { status: 200, header: (h: Headers) => h.get("content-type")?.includes("text/event-stream") },
  },
  {
    name: "POST /api/chat 无 API Key 时 SSE error 事件格式",
    method: "POST",
    url: "/api/chat",
    body: { conversationId: 1, content: "你好" },
    expect: {
      status: 200,
      body: (raw: string) => raw.includes("event: error") && raw.includes("DEEPSEEK_API_KEY"),
    },
  },
];
