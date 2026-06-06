# Stage 1 — 后端核心服务 实现记录

> 实现日期：2026-06-07
> 对应：Phase 1 of ROADMAP.md

---

## 实现范围

### 完成的文件清单

```
lib/
├── conversation-service.ts   ← 新增
├── person-service.ts         ← 新增
├── profile-service.ts        ← 新增
├── mentor-service.ts         ← 新增
├── memory-service.ts         ← 新增
├── deepseek.ts               ← 新增
└── chat-service.ts           ← 新增

app/api/
├── chat/route.ts             ← 新增
├── conversations/route.ts    ← 新增
├── conversations/[id]/route.ts ← 新增
├── mentors/route.ts          ← 更新（完整字段）
├── mentors/[id]/route.ts     ← 新增
├── persons/route.ts          ← 新增
├── persons/[id]/route.ts     ← 新增
├── conversation-persons/route.ts ← 新增
├── profile/route.ts          ← 新增
└── memory/route.ts           ← 新增
```

---

## 关键设计决策

### 1. chat-service 的异步后处理

对话流结束后，`handleMessage` 触发 3 个异步任务：
- **记忆提炼**：调用 DeepSeek analyze → 解析 JSON → 写入 memories
- **联系人丰富**：预留接口（MVP 阶段简化处理）
- **标题/摘要生成**：首轮回复后自动设置标题

后处理通过 SSE 的 `memory` 和 `person-update` 事件通知前端。

### 2. 记忆检索混合评分

```
score = importance * 0.6 + BM25 * 0.4
```

重要度权重更高，确保用户标记的高重要度记忆能被优先召回。

### 3. 导师配置仅更新 style_config

`mentor-service.ts` 的 `updateMentorStyleConfig` 只更新 `style_config` 字段，不改动 `system_prompt`。用户的定制风格通过 chat-service 拼接到 system prompt 中。

### 4. 联系人档案增量追加

`appendPersonInsight` 使用 `\n---\n` 分隔追加新洞察，不覆盖已有内容，保持档案的历史累积。

---

## 未完成/待改进

| 事项 | 原因 | 计划 |
|------|------|------|
| 图片上传 `POST /api/upload` | P1 功能 | Phase 3 |
| 联系人档案丰富（enrichProfile） | 需 DeepSeek 专职分析 | Phase 3 |
| 对话标题自动生成 | 已做简化版，标题不够智能 | Phase 3 |
| FTS5 content sync trigger | 当前手动 INSERT，缺少 trigger 自动同步 | Phase 2 前 |
| `conversation_persons` 关联的联级删除 | schema 已有 CASCADE，但少数边界情况未覆盖 | Phase 2 联调时处理 |
| `events` 表的 API | 当前阶段未实现事件时间线接口 | Phase 3 |

---

## 验证记录

| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 导师列表 | GET | /api/mentors | ✅ |
| 导师人设更新 | PUT | /api/mentors/1 | ✅ |
| 对话列表 | GET | /api/conversations | ✅ |
| 新建对话 | POST | /api/conversations | ✅ |
| 对话详情 | GET | /api/conversations/1 | ✅ |
| 删除对话 | DELETE | /api/conversations/1 | ✅ |
| 联系人列表 | GET | /api/persons | ✅ |
| 新建联系人 | POST | /api/persons | ✅ |
| 更新联系人 | PUT | /api/persons/1 | ✅ |
| 删除联系人 | DELETE | /api/persons/1 | ✅ |
| 对话-联系人查询 | GET | /api/conversation-persons | ✅ |
| 记忆检索 | GET | /api/memory | ✅ |
| 用户档案 | GET/PUT | /api/profile | ✅ |
| SSE 聊天 | POST | /api/chat | 🟡 需 DEEPSEEK_API_KEY |

---

## API 测试数据

```bash
# 导师列表
curl http://localhost:3000/api/mentors

# 新建对话
curl -X POST http://localhost:3000/api/conversations \
  -H 'Content-Type: application/json' \
  -d '{"mentorId": 1}'

# 对话列表
curl http://localhost:3000/api/conversations

# 联系人列表
curl http://localhost:3000/api/persons

# 新建联系人
curl -X POST http://localhost:3000/api/persons \
  -H 'Content-Type: application/json' \
  -d '{"name": "测试联系人", "relationship": "朋友"}'

# 获取用户档案
curl http://localhost:3000/api/profile

# 记忆检索
curl 'http://localhost:3000/api/memory?q=工作'
```
