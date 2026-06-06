/**
 * Person API Test Specifications
 *
 * 接口：GET/POST /api/persons, PUT/DELETE /api/persons/:id
 */

export const tests = [
  {
    name: "POST /api/persons 创建联系人",
    method: "POST",
    url: "/api/persons",
    body: { name: "小红", relationship: "恋人", category: "romance" },
    expect: { status: 201, body: (d: any) => d.person.name === "小红" && d.person.id > 0 },
  },
  {
    name: "POST /api/persons 创建第二个联系人",
    method: "POST",
    url: "/api/persons",
    body: { name: "张总", relationship: "领导", category: "workplace" },
    expect: { status: 201, body: (d: any) => d.person.name === "张总" },
  },
  {
    name: "GET /api/persons 列表",
    method: "GET",
    url: "/api/persons",
    expect: { status: 200, body: (d: any) => d.persons.length >= 2 },
  },
  {
    name: "PUT /api/persons/1 部分更新",
    method: "PUT",
    url: "/api/persons/1",
    body: { background: "市场部新人，性格开朗" },
    expect: { status: 200, body: (d: any) => d.person.background === "市场部新人，性格开朗" && d.person.name === "小红" },
  },
  {
    name: "DELETE /api/persons/1 删除联系人",
    method: "DELETE",
    url: "/api/persons/1",
    expect: { status: 200, body: (d: any) => d.success === true },
  },
  {
    name: "GET /api/persons 确认已删除",
    method: "GET",
    url: "/api/persons",
    expect: { status: 200, body: (d: any) => d.persons.length === 1 },
  },
  {
    name: "POST /api/persons 无 name 返回 400",
    method: "POST",
    url: "/api/persons",
    body: { relationship: "朋友" },
    expect: { status: 400 },
  },
  {
    name: "PUT /api/persons/999 不存在返回 404",
    method: "PUT",
    url: "/api/persons/999",
    body: { name: "test" },
    expect: { status: 404 },
  },
  {
    name: "DELETE /api/persons/999 不存在返回 404",
    method: "DELETE",
    url: "/api/persons/999",
    expect: { status: 404 },
  },
];
