# Stage 2 — 前端核心页面 实现记录

> 实现日期：2026-06-07
> 对应：Phase 2 of ROADMAP.md

---

## 实现范围

### 新增/修改的文件

```
app/
├── page.tsx                              ← 重写为主壳（底部导航 + 5 个页面视图）
├── conversations/[id]/page.tsx           ← 新增：聊天页（SSE 流式对话）
└── globals.css                           ← 更新：添加设计系统 CSS

components/
├── BottomNav.tsx              ← 底部导航（5 个 tab）
├── MentorFilter.tsx           ← 导师过滤器（横向滚动 chip）
├── ConversationList.tsx       ← 对话列表 + 空状态
├── MentorPicker.tsx           ← 底部弹出导师选择面板
├── PersonSelector.tsx         ← 底部弹出联系人选择面板
├── MessageBubble.tsx          ← 消息气泡 + 打字指示器
├── MarkdownRenderer.tsx       ← AI 回复 Markdown 渲染
└── MentorSettings.tsx         ← 导师人设编辑
```

---

## 页面结构

### 主壳 (`app/page.tsx`)
单一客户端组件，使用 `activeTab` 状态控制 5 个页面视图：

| Tab | 视图 | 功能 |
|-----|------|------|
| home | 首页 | 顶栏 + 导师过滤器 + 对话列表 + FAB 新建 |
| persons | 通讯录 | 搜索 + 联系人列表 + 底部表单 CRUD |
| profile | 档案 | 6 字段表单 + 保存 |
| mentors | 导师 | 导师列表 + 展开式人设编辑器 |
| backup | 备份 | 统计卡片 + 下载按钮 |

### 聊天页 (`app/conversations/[id]/page.tsx`)
独立路由，内容：
- 聊天头部（返回 + 导师信息 + 添加联系人）
- 联系人标签栏
- 消息区（自动滚动 + 流式渲染）
- 输入区（多行 textarea + 发送 + 附件按钮）
- SSE 流式接收（fetch + ReadableStream 手动解析）
- 底部联系人生成器（底部 sheet）

---

## 关键设计决策

### 1. 页面切换不使用路由
主壳使用 `useState<TabId>` 控制 tab 切换，不产生 URL 变化。聊天页作为独立路由。

### 2. SSE 流式渲染
使用 `fetch` + `ReadableStream` 手动解析 SSE 事件：
```
event: chunk → 逐 token 追加到 streamContent
event: done → 重新加载消息列表
```

### 3. 联系人管理
- 联系人标签显示在聊天头部下方
- 点击 `+` 打开底部 sheet 勾选
- 支持添加和移除对话中的联系人

### 4. 对话删除
- 悬浮删除按钮 + 确认弹窗
- 提示联系人和记忆不受影响
- Toast 提示

---

## 组件清单

| 组件 | 用途 |
|------|------|
| BottomNav | 5 tab 底部导航 |
| MentorFilter | 横向滚动导师芯片 |
| ConversationList | 对话列表 + 空状态 |
| MentorPicker | 新建对话选导师 |
| PersonSelector | 选择联系人加入对话 |
| MessageBubble | 消息气泡 + 打字动画 |
| MarkdownRenderer | react-markdown 渲染 |
| MentorSettings | 展开式人设编辑器 |
