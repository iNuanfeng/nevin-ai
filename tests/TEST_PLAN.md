# Nevin AI — Phase 0 测试计划

> 版本：v0.1
> 测试日期：2026-06-06
> 测试目标：验证 Phase 0（项目脚手架）全部交付物完整、可运行

---

## 测试范围

### 1. 项目启动

| 测试项 | 预期结果 | 验证手段 |
|--------|----------|----------|
| npm install | 依赖安装无报错，node_modules 生成 | 终端输出 |
| npm run dev | Next.js 开发服务器 0 错误启动 | 终端输出 / 端口监听 |
| 浏览器访问 localhost:3000 | HTTP 200，页面正常渲染 | curl / 浏览器 |
| HMR（热更新） | 修改文件后页面自动刷新 | 手动验证 |

### 2. 数据库（SQLite）

| 测试项 | 预期结果 | 验证手段 |
|--------|----------|----------|
| data/nevin.db 自动生成 | 首次启动后自动创建 | 文件存在检查 |
| 所有表按 schema 创建 | profile/mentors/conversations/messages/persons/conversation_persons/memories/events 共8张 | sqlite3 .tables |
| FTS5 虚拟表创建 | memories_fts 存在 | sqlite3 .tables |
| conversations.deleted 字段 | 允许软删除，默认 0 | PRAGMA table_info |
| messages.role CHECK 约束 | 仅允许 user/assistant | PRAGMA table_info |
| memories.importance CHECK | 范围 1-10，默认 5 | PRAGMA table_info |
| 外键约束启用 | PRAGMA foreign_keys = ON | PRAGMA foreign_keys |
| WAL 模式 | 启用 WAL | PRAGMA journal_mode |

### 3. 导师 Seeding 数据

| 测试项 | 预期结果 | 验证手段 |
|--------|----------|----------|
| mentors 表行数 | 恰好 6 行 | SELECT COUNT(*) |
| 导师列表完整 | 总管家/职场军师/情场顾问/家庭调解师/摄影导师/成长教练 | SELECT name |
| 必填字段非空 | 全体 name, system_prompt 非 NULL | SELECT ... IS NULL |
| sort_order 连续 | 0-5 各一条 | SELECT sort_order |
| category 合法 | 不包含未知分类值 | SELECT DISTINCT category |
| 中文内容正确 | 无乱码、无截断 | 手动阅读 |
| 幂等性 | 多次重启不产生重复 seed | 重启后再次计数 |

### 4. 目录结构

| 测试项 | 预期结果 | 验证手段 |
|--------|----------|----------|
| app/ | 含 layout.tsx / page.tsx / globals.css / api/ | ls |
| app/api/ | mentors/route.ts 存在 | ls |
| components/ | 目录存在 | ls |
| lib/ | 含 db.ts / schema.sql | ls |
| data/ | 含 .gitkeep 或 nevin.db | ls |
| public/ | 图标和 manifest 资源 | ls |
| .env.example | 存在，含 DEEPSEEK_API_KEY | 文件检查 |
| next.config.ts | 含 serverExternalPackages | 文件检查 |

### 5. 全局布局 & PWA

| 测试项 | 预期结果 | 验证手段 |
|--------|----------|----------|
| Tailwind CSS v4 | 样式生效 | curl HTML / 浏览器 |
| 页面 title | `<title>Nevin AI</title>` | curl HTML |
| PWA manifest | manifest link 存在 | curl HTML |
| Apple Web App | apple-mobile-web-app-capable meta | curl HTML |
| Viewport meta | width=device-width，禁止缩放 | curl HTML |
| 主题色 | themeColor: #ffffff | layout.tsx 检查 |

### 6. API & 浏览器访问

| 测试项 | 预期结果 | 验证手段 |
|--------|----------|----------|
| GET /api/mentors | 返回 JSON，含 6 条 | curl |
| GET / HTML 内容 | 含 "Nevin" 标题和导师 chip | curl |
| 首页空状态 | 显示"还没有对话" | curl |

---

## 验证方法说明

- 自动化验证：通过 curl + sqlite3 命令行执行，输出 pass/fail
- 人工验证：MANUAL_CHECKLIST.md 列出需肉眼确认的项
- 环境隔离：测试在开发环境执行，不依赖 DeepSeek API Key

## 未覆盖范围（后续 Phase）

- 记忆检索 FTS5 功能测试 → Phase 1
- SSE 流式响应测试 → Phase 1
- 前端组件交互测试 → Phase 2
- E2E 全流程测试 → Phase 3
