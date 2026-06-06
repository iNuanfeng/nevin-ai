/**
 * Profile API Test Specifications
 */
export const tests = [
  {
    name: "GET /api/profile 自动创建用户档案",
    method: "GET",
    url: "/api/profile",
    expect: { status: 200, body: (d: any) => d.profile.id === 1 },
  },
  {
    name: "PUT /api/profile 更新字段",
    method: "PUT",
    url: "/api/profile",
    body: { name: "Nevin", background: "产品经理", values: "真诚" },
    expect: { status: 200, body: (d: any) => d.profile.name === "Nevin" && d.profile.background === "产品经理" },
  },
  {
    name: "PUT /api/profile 部分更新不覆盖旧值",
    method: "PUT",
    url: "/api/profile",
    body: { personality: "INTJ" },
    expect: { status: 200, body: (d: any) => d.profile.name === "Nevin" && d.profile.personality === "INTJ" },
  },
  {
    name: "GET /api/profile 确认持久化",
    method: "GET",
    url: "/api/profile",
    expect: { status: 200, body: (d: any) => d.profile.name === "Nevin" && d.profile.values === "真诚" },
  },
];
