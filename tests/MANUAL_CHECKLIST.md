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

---

## F. Phase 2 — 首页 & 导航（浏览器打开 `localhost:3000` 验证）

| # | 检查项 | 预期 | 结果 |
|---|--------|------|------|
| F1 | 标题 "Nevin" | 左侧渐变文字显示 | □ 通过 □ 失败 |
| F2 | 搜索图标 + 头像 | 顶栏右侧可见 | □ 通过 □ 失败 |
| F3 | 导师过滤器 | 7 个 chip 可横向滚动，"全部"高亮 | □ 通过 □ 失败 |
| F4 | 空状态 | "还没有对话" + 图标 + 提示文字 | □ 通过 □ 失败 |
| F5 | FAB "+" 按钮 | 右下角，点击弹出导师选择面板 | □ 通过 □ 失败 |
| F6 | 导师选择面板 | 底部弹出，6 个导师，总管家居首带 "默认" | □ 通过 □ 失败 |
| F7 | 底部导航 | 5 个 tab 全部显示，点击切换视图 | □ 通过 □ 失败 |
| F8 | 活跃 tab 高亮 | 当前 tab 蓝色 | □ 通过 □ 失败 |

## G. Phase 2 — 聊天页

| # | 操作 | 预期 | 结果 |
|---|------|------|------|
| G1 | 点 "+" 选导师 | 跳转 `/conversations/:id` | □ 通过 □ 失败 |
| G2 | 聊天头部 | 返回按钮 + 导师信息 + 添加按钮 | □ 通过 □ 失败 |
| G3 | 发送消息 | Enter 发送，消息气泡显示 | □ 通过 □ 失败 |
| G4 | SSE 流式 | 逐 token 渲染，打字指示器动画 | □ 通过 □ 失败 |
| G5 | Markdown 渲染 | 代码块、列表、链接样式正确 | □ 通过 □ 失败 |
| G6 | 添加联系人 | 底部 sheet 勾选 → 确认 → 标签显示 | □ 通过 □ 失败 |
| G7 | 移除联系人 | 点击 tag 上的 × | □ 通过 □ 失败 |
| G8 | 输入框自适应 | 多行 textarea 自动增高 | □ 通过 □ 失败 |
| G9 | Shift+Enter | 换行不发送 | □ 通过 □ 失败 |
| G10 | 发送按钮 disabled | 输入为空或流式传输中灰色不可点 | □ 通过 □ 失败 |

## H. Phase 2 — 通讯录 / 档案 / 导师 / 备份

| # | 页面 | 检查项 | 结果 |
|---|------|--------|------|
| H1 | 通讯录 | 列表渲染 + 搜索框过滤 | □ 通过 □ 失败 |
| H2 | 通讯录 | 新建联系人表单（底部 sheet） | □ 通过 □ 失败 |
| H3 | 通讯录 | 编辑/删除联系人 | □ 通过 □ 失败 |
| H4 | 档案 | 6 个字段 + 数据回填 | □ 通过 □ 失败 |
| H5 | 档案 | 保存按钮 → API 调用 + Toast | □ 通过 □ 失败 |
| H6 | 导师 | 6 位导师列表 + 风格描述 | □ 通过 □ 失败 |
| H7 | 导师 | 点击展开编辑 → 输入 → 保存 | □ 通过 □ 失败 |
| H8 | 备份 | 统计卡片 + 下载按钮 | □ 通过 □ 失败 |

## I. Phase 2 — 设计一致性 & 响应式

| # | 检查项 | 预期 | 结果 |
|---|--------|------|------|
| I1 | 颜色 | 全站 #fff 背景，#1d1d1f 文字，#007aff 强调 | □ 通过 □ 失败 |
| I2 | 圆角 | 一致，与 design/all-pages.html 对比 | □ 通过 □ 失败 |
| I3 | 字体 | SF Pro / PingFang SC 渲染正常 | □ 通过 □ 失败 |
| I4 | 375px 宽度 | 布局不变形 | □ 通过 □ 失败 |
| I5 | 430px 宽度 | 布局正常，FAB 不遮挡 | □ 通过 □ 失败 |
| I6 | 桌面端 | max-w-[430px] 居中 + 圆角阴影 | □ 通过 □ 失败 |
| I7 | 动画 | 底部 sheet slideUp / typing 跳动 / toast 淡入 | □ 通过 □ 失败 |
| I8 | 对照设计稿 | design/all-pages.html 各项逐项比对 | □ 通过 □ 失败 |

---

*更新于 2026-06-07*
