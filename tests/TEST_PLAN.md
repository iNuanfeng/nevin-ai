# Nevin AI — 测试计划

> 版本：v0.1
> 更新：2026-06-07
> 覆盖：Phase 0（脚手架）+ Phase 1（后端核心服务）

---

## Phase 0 测试范围（已通过）

参见 tests/TEST_PLAN.md Phase 0 部分。

---

## Phase 1 测试范围

### 1. 项目环境

| 测试项 | 预期结果 |
|--------|----------|
| `npm run dev` 启动 | 0 错误，端口监听正常 |
| DEEPSEEK_API_KEY 配置 | 未设置时 Chat API 返回 500 error 而非崩溃 |

### 2. 数据库 CRUD

| 测试项 | 预期结果 |
|--------|----------|
| profile 自动创建 | 首次读取时自动生成一行空白档案 |
| 外键约束 | 插入无效 mentor_id 时拒绝写入 |
| FTS5 同步 | 写入记忆后，FTS5 能检索到 |
| 数据库索引 | conversations.mentor_id / conversations.deleted / messages.conversation_id 等 |

### 3. Mentor API

| 测试项 | 预期结果 |
|--------|----------|
| GET /api/mentors | 6 位导师，含 system_prompt 和 style_config 字段 |
| PUT /api/mentors/1 | 更新 style_config 后持久化，GET 查得到 |
| 404 处理 | PUT 不存在的 ID 返回 404 |

### 4. Person API

| 测试项 | 预期结果 |
|--------|----------|
| POST /api/persons | 创建联系人，返回 201 + 完整记录 |
| GET /api/persons | 列表返回全部联系人 |
| PUT /api/persons/:id | 部分更新不覆盖未传字段 |
| DELETE /api/persons/:id | 删除后无法再获取 |
| 400 验证 | 无 name 时返回 400 |
| 404 验证 | 操作不存在的 ID 返回 404 |

### 5. Conversation API

| 测试项 | 预期结果 |
|--------|----------|
| POST /api/conversations | 创建对话，返回 201 |
| GET /api/conversations | 列表含最后一条消息预览和导师信息 |
| GET /api/conversations?mentorId=1 | 按导师筛选 |
| GET /api/conversations/:id | 返回对话详情 + 消息列表 |
| DELETE /api/conversations/:id | 软删除（deleted=1），不再出现在列表 |
| 400 验证 | 无 mentorId 时返回 400 |
| 404 验证 | GET/DELETE 不存在的 ID |

### 6. Conversation-Person API

| 测试项 | 预期结果 |
|--------|----------|
| POST /api/conversation-persons | 对话中添加联系人 |
| GET /api/conversation-persons?conversationId=1 | 返回对话关联的联系人 |
| DELETE /api/conversation-persons | 从对话中移除联系人 |
| 400 验证 | 缺少 conversationId 或 personId |
| 幂等性 | 重复添加不报错（INSERT OR IGNORE） |

### 7. Profile API

| 测试项 | 预期结果 |
|--------|----------|
| GET /api/profile | 返回 profile 对象（id=1） |
| PUT /api/profile | 更新字段，不覆盖未传字段 |
| 自动创建 | 空数据库首次 GET 也会自动创建 |

### 8. Memory API

| 测试项 | 预期结果 |
|--------|----------|
| POST /api/memory | 创建记忆，返回 201 |
| GET /api/memory?q=关键词 | FTS5 按内容检索命中 |
| GET /api/memory（空搜索） | 按重要度排列返回 Top-N |
| GET /api/memory?personId= | 按关联人物筛选 |
| GET /api/memory?limit=3 | 限制返回条数 |
| 400 验证 | 无 content 时 POST 返回 400 |

### 9. Chat API — SSE 流式

| 测试项 | 预期结果 |
|--------|----------|
| POST /api/chat 无 API Key | 返回 SSE error 事件，格式正确 |
| SSE 响应头 | Content-Type: text/event-stream |
| SSE 事件格式 | event: xxx 行 + data: JSON 行 |
| 400 验证 | 无 conversationId 或 content 返回 400 |
| 消息持久化 | AI 回复后自动保存到 messages 表 |
| 对话 updated_at | AI 回复后自动更新 |

### 10. Chat Service — System Prompt 组装

| 测试项 | 预期结果 |
|--------|----------|
| System Prompt 模板 | 包含：导师人设 → 风格要求 → 用户档案 → 联系人 → 记忆 → 上下文 |
| 联系人信息注入 | 对话关联的联系人档案完整拼入 prompt |
| 记忆排序 | 按重要度从高到低排列 |
| 空状态 | 无联系人/无记忆时不插入对应章节 |

### 11. 错误处理

| 场景 | 预期 |
|------|------|
| 请求参数缺失 | 400 + { error: "描述" } |
| 资源不存在 | 404 + { error: "not found" } |
| 服务端异常 | 500 + { error: "描述" } |
| SSE 流中错误 | event: error + { error: "描述" } |

---

## 验证方法

- API 自动化验证：通过 curl 脚本逐一测试，记录 pass/fail
- 数据库验证：通过 sqlite3 命令行检查数据状态
- SSE 格式检查：验证 event: / data: 格式 + Content-Type 响应头
- 人工验证：MANUAL_CHECKLIST.md 列出需肉眼确认的项

## 未覆盖范围

- 异步后处理（记忆提炼/联系人丰富）→ 需要 DeepSeek API Key + 实际对话，在集成环境测试
- 图片上传 / 多模态 → Phase 3
- 对话标题自动生成的智能程度 → 功能验证已覆盖，语义评估留待用户验收
