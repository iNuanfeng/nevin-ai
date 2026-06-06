# Changelog

## v0.1 — Phase 1 (2026-06-07)

### Added
- **Service layer** (`lib/`):
  - `mentor-service.ts` — 导师完整查询 + style_config 更新
  - `person-service.ts` — 联系人 CRUD + 对话关联管理 + 档案追加
  - `profile-service.ts` — 用户档案读取/更新（自动创建空行）
  - `conversation-service.ts` — 对话列表/创建/删除 + 消息保存
  - `memory-service.ts` — FTS5 + 重要度混合搜索 + 记忆存储/提炼
  - `deepseek.ts` — DeepSeek SDK 封装（流式 SSE + 非流式分析）
  - `chat-service.ts` — 全链路对话编排（profile→mentor→contacts→memories→DeepSeek→后处理）
- **API Routes** (`app/api/`):
  - `POST /api/chat` — SSE 流式对话接口
  - `GET /api/conversations` / `POST /api/conversations`
  - `GET /api/conversations/[id]` / `DELETE /api/conversations/[id]`
  - `GET /api/mentors` / `PUT /api/mentors/[id]`
  - `GET /api/persons` / `POST /api/persons`
  - `PUT /api/persons/[id]` / `DELETE /api/persons/[id]`
  - `GET /api/conversation-persons` / `POST` / `DELETE`
  - `GET /api/profile` / `PUT /api/profile`
  - `GET /api/memory` / `POST /api/memory`
- **Documentation**:
  - `docs/API.md` — 全部接口请求/响应格式文档
  - `docs/DATABASE.md` — 完整表结构 + 字段说明 + ER 关系
  - `docs/DEPLOYMENT.md` — 部署指南
  - `docs/CHANGELOG.md` — 本文件
  - `docs/stages/stage-1-backend.md` — 实现说明和关键决策

### Changed
- `app/api/mentors/route.ts` — GET 返回完整字段（含 system_prompt, style_config）

### Notes
- `app/page.tsx` 保留 Phase 0 首页占位，Phase 2 重构前端时替换
- `lib/db.ts` 维持原样（建表和 seed 仍在 db.ts 中，Phase 2 前按 Checkpoint A 拆出）
