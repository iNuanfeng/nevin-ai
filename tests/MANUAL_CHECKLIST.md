# Nevin AI — 人工抽查清单

> 更新：2026-06-07 | 覆盖 Phase 0 + Phase 1

---

## 如何执行

1. `npm run dev` 启动开发服务器
2. 确保 DEEPSEEK_API_KEY 已设置（如果需要测试完整 SSE 流）
3. 在浏览器中打开 `http://localhost:3000`
4. 逐项检查

---

## A. 页面渲染（首页 — Phase 0）

| # | 检查项 | 预期 | 结果 | 备注 |
|---|--------|------|------|------|
| A1 | 顶栏标题 | "Nevin" 渐变文字 | □ 通过 □ 失败 | |
| A2 | 搜索图标 + 头像 | 可见可点的图标 | □ 通过 □ 失败 | |
| A3 | 导师过滤器 | 7 个横向滚动 chip，"全部"高亮 | □ 通过 □ 失败 | |
| A4 | 空状态 | "还没有对话" | □ 通过 □ 失败 | |
| A5 | FAB 按钮 | 右下角 "+" | □ 通过 □ 失败 | |

## B. PWA / Meta（Phase 0）

| # | 检查项 | 预期 | 结果 | 备注 |
|---|--------|------|------|------|
| B1 | Page Title | "Nevin AI" | □ 通过 □ 失败 | |
| B2 | Viewport | 禁止缩放 + viewport-fit=cover | □ 通过 □ 失败 | |
| B3 | 移动端适配 | 375-430px 布局不变形 | □ 通过 □ 失败 | |

## C. API 响应（Phase 1 — 手动 curl 验证）

| # | 检查项 | 预期 | 命令 | 结果 |
|---|--------|------|------|------|
| C1 | 导师列表 | 6 条，含 system_prompt | `curl localhost:3000/api/mentors` | □ 通过 □ 失败 |
| C2 | 导师人设更新 | style_config 持久化 | `curl -X PUT -H 'Content-Type: application/json' -d '{"style_config":{"style":"测试"}}' localhost:3000/api/mentors/1` | □ 通过 □ 失败 |
| C3 | 联系人 CRUD | 全生命周期正常 | 见阶段一测试脚本 | □ 通过 □ 失败 |
| C4 | 对话列表 | 含 last_message 和 mentor_info | `curl localhost:3000/api/conversations` | □ 通过 □ 失败 |
| C5 | SSE 流式 | event: chunk / event: done 格式 | `curl -X POST -H 'Content-Type: application/json' -d '{"conversationId":1,"content":"你好"}' localhost:3000/api/chat` | □ 通过 □ 失败 |
| C6 | 记忆检索 | FTS5 命中 | `curl 'localhost:3000/api/memory?q=工作'` | □ 通过 □ 失败 |
| C7 | 用户档案 | 自动创建空行 | `curl localhost:3000/api/profile` | □ 通过 □ 失败 |

## D. 错误处理（手动验证）

| # | 场景 | 预期 | 结果 |
|---|------|------|------|
| D1 | POST /api/chat 无 conversationId | 400 + error | □ 通过 □ 失败 |
| D2 | POST /api/persons 无 name | 400 + error | □ 通过 □ 失败 |
| D3 | GET /api/conversations/99999 | 404 + error | □ 通过 □ 失败 |
| D4 | DELETE /api/persons/99999 | 404 + error | □ 通过 □ 失败 |
| D5 | Chat 无 API Key | SSE event: error 格式正确 | □ 通过 □ 失败 |

## E. 数据库（手动 sqlite3 验证）

| # | 检查项 | 命令 | 结果 |
|---|--------|------|------|
| E1 | 所有表存在 | `sqlite3 data/nevin.db ".tables"` | □ 通过 □ 失败 |
| E2 | mentors 6 行 | `sqlite3 data/nevin.db "SELECT COUNT(*) FROM mentors"` | □ 通过 □ 失败 |
| E3 | 外键约束生效 | `sqlite3 data/nevin.db "PRAGMA foreign_keys"` → 1 | □ 通过 □ 失败 |
| E4 | FTS5 存在 | `sqlite3 data/nevin.db "SELECT name FROM sqlite_master WHERE name='memories_fts'"` | □ 通过 □ 失败 |

---

## 检查人签字

- **测试日期**：_________
- **测试人**：_________
- **浏览器**：_________
- **DEEPSEEK_API_KEY 已设置**：□ 是 □ 否
- **备注**：_________

---

*更新于 2026-06-07*
