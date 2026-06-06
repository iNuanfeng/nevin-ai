# Nevin AI API 接口文档

> 版本：v0.1 | 更新：2026-06-07

---

## 1. 聊天

### POST /api/chat — 发送消息（SSE 流式）

**请求体**

```json
{
  "conversationId": 1,
  "content": "你好，今天和同事闹了点矛盾",
  "images": ["data:image/jpeg;base64,..."]
}
```

**响应** — `text/event-stream`

```
event: chunk
data: {"content": "具体发生了什么"}

event: chunk
data: {"content": "？可以跟我说说。"}

event: done
data: {"conversationId": 1, "messageId": 42}

event: memory
data: {"action": "stored", "count": 3}

event: person-update
data: {"personId": 5, "field": "personality_notes", "hasNew": true}

event: error
data: {"error": "DEEPSEEK_API_KEY is not configured"}
```

**SSE 事件类型**

| 事件 | 触发时机 | 字段 |
|------|---------|------|
| `chunk` | 每个 token | `content: string` |
| `done` | 流结束 | `conversationId: number`, `messageId: number` |
| `memory` | 异步记忆存储 | `action: "stored"`, `count: number` |
| `person-update` | 联系人档案更新 | `personId: number`, `field: string`, `hasNew: boolean` |
| `error` | 出错时 | `error: string` |

---

## 2. 对话管理

### GET /api/conversations — 对话列表

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mentorId | number | 否 | 按导师筛选 |

**响应**

```json
{
  "conversations": [
    {
      "id": 1,
      "mentor_id": 1,
      "mentor_name": "总管家",
      "mentor_title": "你的人生 CEO",
      "mentor_category": "life_manager",
      "title": "总管家的建议",
      "summary": null,
      "last_message": "具体发生了什么？可以跟我说说。",
      "last_message_at": "2026-06-07T10:00:00.000Z",
      "created_at": "2026-06-07T09:00:00.000Z"
    }
  ]
}
```

### POST /api/conversations — 新建对话

**请求体**

```json
{
  "mentorId": 1,
  "title": "关于小红的分析",
  "personIds": [3, 5]
}
```

**响应** — 201

```json
{
  "conversation": {
    "id": 2,
    "mentor_id": 1,
    "title": "关于小红的分析",
    "summary": null,
    "deleted": 0,
    "deleted_at": null,
    "created_at": "2026-06-07T10:00:00.000Z",
    "updated_at": "2026-06-07T10:00:00.000Z"
  }
}
```

### GET /api/conversations/:id — 对话详情

**响应**

```json
{
  "conversation": { "...": "同上" },
  "messages": [
    {
      "id": 1,
      "conversation_id": 2,
      "role": "user",
      "content": "你好，今天和同事闹了点矛盾",
      "images": null,
      "created_at": "2026-06-07T10:00:00.000Z"
    }
  ]
}
```

### DELETE /api/conversations/:id — 软删除对话

**响应**

```json
{ "success": true }
```

---

## 3. 导师管理

### GET /api/mentors — 导师列表

**响应**

```json
{
  "mentors": [
    {
      "id": 1,
      "name": "总管家",
      "title": "你的人生 CEO",
      "description": "理性、温暖、全局视角...",
      "system_prompt": "你是一个理性、温暖、具有全局视角的人生管家...",
      "style_config": null,
      "category": "life_manager",
      "sort_order": 0
    }
  ]
}
```

### PUT /api/mentors/:id — 更新导师人设

**请求体**

```json
{
  "style_config": {
    "style": "风趣痞帅，像童锦程，说话带点撩",
    "rules": ["关键建议时要沉稳认真"],
    "tone": "轻松但专业"
  }
}
```

**响应**

```json
{
  "mentor": { "...": "更新后的完整记录" }
}
```

---

## 4. 联系人管理

### GET /api/persons — 联系人列表

**响应**

```json
{
  "persons": [
    {
      "id": 1,
      "name": "小红",
      "relationship": "同事",
      "category": "workplace",
      "background": "市场部的新人",
      "personality_notes": "性格开朗但有点敏感",
      "relationship_dynamics": "合作愉快",
      "recent_status": "最近负责新项目",
      "strategy_notes": "多给正面反馈",
      "created_at": "2026-06-07T09:00:00.000Z",
      "updated_at": "2026-06-07T09:00:00.000Z"
    }
  ]
}
```

### POST /api/persons — 新建联系人

**请求体**

```json
{
  "name": "小红",
  "relationship": "同事",
  "category": "workplace"
}
```

**响应** — 201

### PUT /api/persons/:id — 更新联系人

**请求体** — 与 POST 相同，所有字段可选

**响应**

```json
{ "person": { "...": "更新后的完整记录" } }
```

### DELETE /api/persons/:id — 删除联系人

**响应**

```json
{ "success": true }
```

---

## 5. 对话-联系人关联

### GET /api/conversation-persons — 查询对话关联的联系人

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | number | 是 | 对话 ID |

**响应**

```json
{ "persons": [ "..." ] }
```

### POST /api/conversation-persons — 对话中添加联系人

**请求体**

```json
{ "conversationId": 1, "personId": 3 }
```

**响应** — 201

### DELETE /api/conversation-persons — 对话中移除联系人

**请求体**

```json
{ "conversationId": 1, "personId": 3 }
```

**响应**

```json
{ "success": true }
```

---

## 6. 用户档案

### GET /api/profile — 获取用户档案

**响应**

```json
{
  "profile": {
    "id": 1,
    "name": "张三",
    "background": "互联网产品经理",
    "values": null,
    "personality": "INTJ",
    "life_goals": null,
    "habits": null,
    "updated_at": "2026-06-07T09:00:00.000Z"
  }
}
```

### PUT /api/profile — 更新用户档案

**请求体**（所有字段可选）

```json
{
  "name": "张三",
  "background": "互联网产品经理，5年经验",
  "values": "真诚、高效、持续成长",
  "personality": "INTJ型，理性但有情感需求",
  "life_goals": "35岁前实现财务独立",
  "habits": "每日冥想、每周输出"
}
```

---

## 7. 记忆管理

### GET /api/memory — 检索记忆

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 否 | 搜索关键词（空则按重要度排列） |
| mentorId | number | 否 | 按导师筛选 |
| personId | number | 否 | 按关联联系人筛选 |
| limit | number | 否 | 返回条数（默认 10） |

**响应**

```json
{
  "memories": [
    {
      "id": 1,
      "source_conversation_id": 3,
      "mentor_id": 1,
      "content": "用户反馈与上司关系紧张，核心矛盾是工作价值观冲突",
      "category": "insight",
      "entities": "[1, 3]",
      "importance": 8,
      "created_at": "2026-06-07T09:00:00.000Z"
    }
  ]
}
```

### POST /api/memory — 手动添加记忆

**请求体**

```json
{
  "content": "用户决定月底提交离职申请",
  "category": "goal",
  "entities": [1],
  "importance": 7,
  "mentorId": 2,
  "sourceConversationId": 5
}
```

**响应** — 201

---

## 状态码总览

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数缺失 |
| 404 | 资源不存在 |
| 500 | 服务端错误 |

所有错误响应格式：

```json
{ "error": "错误描述" }
```
