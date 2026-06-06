/**
 * Conversation API Test Specifications
 *
 * 接口：GET/POST /api/conversations, GET/DELETE /api/conversations/:id
 */

export const tests = [
  {
    name: "POST /api/conversations 新建对话（无联系人）",
    method: "POST",
    url: "/api/conversations",
    body: { mentorId: 1, title: "测试对话1" },
    expect: { status: 201, body: (d: any) => d.conversation.mentor_id === 1 },
  },
  {
    name: "POST /api/conversations 新建对话（含联系人）",
    method: "POST",
    url: "/api/conversations",
    body: { mentorId: 2, title: "职场对话", personIds: [2] },
    expect: { status: 201, body: (d: any) => d.conversation.mentor_id === 2 },
  },
  {
    name: "POST /api/conversations 新建第三个对话",
    method: "POST",
    url: "/api/conversations",
    body: { mentorId: 1, title: "测试对话2" },
    expect: { status: 201 },
  },
  {
    name: "GET /api/conversations 列表",
    method: "GET",
    url: "/api/conversations",
    expect: { status: 200, body: (d: any) => d.conversations.length >= 3 },
  },
  {
    name: "GET /api/conversations?mentorId=1 按导师筛选",
    method: "GET",
    url: "/api/conversations?mentorId=1",
    expect: { status: 200, body: (d: any) => d.conversations.every((c: any) => c.mentor_id === 1) },
  },
  {
    name: "GET /api/conversations/:id 详情含消息",
    method: "GET",
    url: "/api/conversations/1",
    expect: { status: 200, body: (d: any) => d.conversation.id === 1 && Array.isArray(d.messages) },
  },
  {
    name: "DELETE /api/conversations/1 软删除",
    method: "DELETE",
    url: "/api/conversations/1",
    expect: { status: 200, body: (d: any) => d.success === true },
  },
  {
    name: "GET /api/conversations 确认已软删除",
    method: "GET",
    url: "/api/conversations",
    expect: { status: 200, body: (d: any) => !d.conversations.some((c: any) => c.id === 1) },
  },
  {
    name: "POST /api/conversations 无 mentorId 返回 400",
    method: "POST",
    url: "/api/conversations",
    body: { title: "test" },
    expect: { status: 400 },
  },
  {
    name: "GET /api/conversations/999 不存在返回 404",
    method: "GET",
    url: "/api/conversations/999",
    expect: { status: 404 },
  },
  {
    name: "DELETE /api/conversations/999 不存在返回 404",
    method: "DELETE",
    url: "/api/conversations/999",
    expect: { status: 404 },
  },
];
