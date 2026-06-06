/**
 * Memory API Test Specifications
 */
export const tests = [
  {
    name: "POST /api/memory 创建记忆",
    method: "POST",
    url: "/api/memory",
    body: { content: "用户反馈与上司关系紧张，核心矛盾是工作价值观冲突", category: "insight", importance: 8 },
    expect: { status: 201, body: (d: any) => d.memory.content.includes("上司关系") && d.memory.importance === 8 },
  },
  {
    name: "POST /api/memory 创建第二条记忆",
    method: "POST",
    url: "/api/memory",
    body: { content: "用户决定提升技术能力，计划学习 Go 语言", category: "goal", importance: 7, mentorId: 1 },
    expect: { status: 201 },
  },
  {
    name: "GET /api/memory?q=上司 FTS5 检索",
    method: "GET",
    url: "/api/memory?q=上司",
    expect: { status: 200, body: (d: any) => d.memories.length > 0 && d.memories[0].content.includes("上司") },
  },
  {
    name: "GET /api/memory 空搜索按重要度排列",
    method: "GET",
    url: "/api/memory",
    expect: { status: 200, body: (d: any) => d.memories.length > 0 && d.memories[0].importance >= d.memories[1].importance },
  },
  {
    name: "GET /api/memory?mentorId=1 按导师筛选",
    method: "GET",
    url: "/api/memory?mentorId=1",
    expect: { status: 200, body: (d: any) => d.memories.every((m: any) => m.mentor_id === 1) },
  },
  {
    name: "GET /api/memory?limit=1 限制条数",
    method: "GET",
    url: "/api/memory?limit=1",
    expect: { status: 200, body: (d: any) => d.memories.length === 1 },
  },
  {
    name: "POST /api/memory 无 content 返回 400",
    method: "POST",
    url: "/api/memory",
    body: { importance: 5 },
    expect: { status: 400 },
  },
];
