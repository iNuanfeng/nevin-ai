# Nevin AI 数据库设计文档

> 版本：v0.1 | 更新：2026-06-07

---

## 存储方案

- **数据库引擎**：SQLite 3 (via better-sqlite3)
- **数据库文件**：`data/nevin.db`
- **全文索引**：FTS5（用于记忆内容的全文搜索）
- **WAL 模式**：启用 WAL (Write-Ahead Logging) 提升并发性能
- **外键约束**：启用

---

## 表结构

### ① profile — 用户档案

单用户系统，只有一行记录（id=1）。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 固定为 1 |
| name | TEXT | 用户姓名 |
| background | TEXT | 背景经历 |
| values | TEXT | 核心价值观 |
| personality | TEXT | 性格特质 |
| life_goals | TEXT | 人生目标 |
| habits | TEXT | 习惯偏好 |
| updated_at | DATETIME | 最后更新 |

### ② mentors — 导师定义

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| name | TEXT NOT NULL | 导师名（如"总管家"） |
| title | TEXT | 头衔（如"你的人生 CEO"） |
| description | TEXT | 简短描述 |
| system_prompt | TEXT NOT NULL | 核心系统提示词 |
| style_config | TEXT | 用户定制风格（JSON 字符串） |
| category | TEXT | 领域分类 |
| sort_order | INTEGER | 排序权重 |

`style_config` JSON 格式：

```json
{
  "style": "风趣痞帅",
  "rules": ["关键建议时要沉稳认真"],
  "tone": "轻松但专业"
}
```

### ③ conversations — 对话会话

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| mentor_id | INTEGER FK | → mentors(id) |
| title | TEXT | AI 自动生成的标题 |
| summary | TEXT | 对话摘要（供记忆检索） |
| deleted | INTEGER | 软删除标记（0=正常, 1=已删除） |
| deleted_at | DATETIME | 删除时间 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### ④ messages — 消息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| conversation_id | INTEGER FK | → conversations(id) |
| role | TEXT | 'user' 或 'assistant' |
| content | TEXT NOT NULL | 消息内容 |
| images | TEXT | 图片 JSON 数组 |
| created_at | DATETIME | |

### ⑤ persons — 联系人（全局通讯录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| name | TEXT NOT NULL | 姓名/代号 |
| relationship | TEXT | 关系标签（同事/恋人/家人/朋友） |
| category | TEXT | 领域分类（workplace/romance/family） |
| background | TEXT | 背景信息 |
| personality_notes | TEXT | 性格判断（AI 累积） |
| relationship_dynamics | TEXT | 关系动态描述 |
| recent_status | TEXT | 最近状态 |
| strategy_notes | TEXT | 有效相处策略和禁忌 |
| updated_at | DATETIME | |
| created_at | DATETIME | |

### ⑥ conversation_persons — 对话-联系人关联

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| conversation_id | INTEGER FK | → conversations (CASCADE DELETE) |
| person_id | INTEGER FK | → persons |
| created_at | DATETIME | |
| UNIQUE | (conversation_id, person_id) | |

### ⑦ memories — 永久记忆

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| source_conversation_id | INTEGER FK | → conversations |
| mentor_id | INTEGER FK | → mentors |
| content | TEXT NOT NULL | 记忆条目 |
| category | TEXT | 分类（personal_info/relationship/event/insight/goal） |
| entities | TEXT | 关联人物 ID 的 JSON 数组 |
| importance | INTEGER | 重要度 1-10（默认 5） |
| created_at | DATETIME | |

### ⑧ memories_fts — FTS5 全文索引

虚拟表，自动同步 `memories.content`。

```
CREATE VIRTUAL TABLE memories_fts USING fts5(content, content=memories);
```

### ⑨ events — 事件时间线

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | |
| title | TEXT NOT NULL | 事件标题 |
| description | TEXT | 详细描述 |
| person_ids | TEXT | 关联人物 ID 的 JSON 数组 |
| event_date | DATE | 事件日期 |
| emotion | TEXT | 情绪标签 |
| created_at | DATETIME | |

---

## ER 关系

```
mentors 1 ── N conversations 1 ── N messages
                   │
                   N
                   │
           conversation_persons
                   N
                   │
            persons（全局共享）

memories → source_conversation_id (optional)
memories → mentor_id (optional)
events  → person_ids (denormalized reference)
```

---

## FTS5 搜索说明

`memories_fts` 表使用外部内容同步（`content=memories`），对 `memories.content` 字段建全文索引。

在 `lib/memory-service.ts` 中，检索时采用混合评分：

```
score = importance * 0.6 + bm25_rank * 0.4
```

重要度权重更高，确保用户标记/自然累积的高重要度记忆能优先被召回。

---

## 索引清单

| 表 | 索引 | 原因 |
|----|------|------|
| conversations | mentor_id | 按导师筛选对话 |
| conversations | deleted | 软删除过滤 |
| conversations | created_at | 对话列表排序 |
| messages | conversation_id | 按对话查消息 |
| conversation_persons | (conversation_id, person_id) UNIQUE | 避免重复关联 |
| memories | mentor_id | 按导师筛选记忆 |
| memories | importance | 重要度排序 |
| memories | created_at | 时间排序 |
| memories_fts | FTS5 index | 全文搜索 |
