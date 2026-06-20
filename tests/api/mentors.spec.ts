/**
 * Mentor API Test Specifications
 *
 * 接口：GET /api/mentors, PUT /api/mentors/:id
 * 运行：npm test 或手动 curl 验证
 */

export const tests = [
  {
    name: "GET /api/mentors 返回 6 位导师",
    method: "GET",
    url: "/api/mentors",
    expect: {
      status: 200,
      body: (data: any) =>
        data.mentors.length === 6 &&
        data.mentors[0].name === "总管家" &&
        data.mentors[0].system_prompt !== undefined &&
        data.mentors[5].name === "成长教练",
    },
  },
  {
    name: "PUT /api/mentors/1 更新 system_prompt",
    method: "PUT",
    url: "/api/mentors/1",
    body: { system_prompt: "测试完整人设" },
    expect: {
      status: 200,
      body: (data: any) =>
        data.mentor.system_prompt === "测试完整人设" &&
        data.mentor.id === 1,
    },
  },
  {
    name: "GET /api/mentors 确认 system_prompt 持久化",
    method: "GET",
    url: "/api/mentors",
    expect: {
      status: 200,
      body: (data: any) =>
        data.mentors[0].system_prompt === "测试完整人设",
    },
  },
  {
    name: "PUT /api/mentors/1 更新 style_config",
    method: "PUT",
    url: "/api/mentors/1",
    body: { style_config: { model: "deepseek-reasoner" } },
    expect: {
      status: 200,
      body: (data: any) =>
        data.mentor.style_config !== null &&
        JSON.parse(data.mentor.style_config).model === "deepseek-reasoner",
    },
  },
  {
    name: "PUT /api/mentors/999 不存在的 ID 返回 404",
    method: "PUT",
    url: "/api/mentors/999",
    body: { style_config: { style: "x" } },
    expect: { status: 404 },
  },
  {
    name: "PUT /api/mentors/1 缺少更新字段返回 400",
    method: "PUT",
    url: "/api/mentors/1",
    body: {},
    expect: { status: 400 },
  },
  {
    name: "PUT /api/mentors/1 空 system_prompt 返回 400",
    method: "PUT",
    url: "/api/mentors/1",
    body: { system_prompt: "   " },
    expect: { status: 400 },
  },
];
