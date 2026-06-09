# Stage 3 — P1 功能 + 增强 实现记录

> 实现日期：2026-06-09
> 对应：Phase 3 of ROADMAP.md

---

## 实现范围

### P0 — 核心体验

| # | 功能 | 改动文件 | 状态 |
|---|------|---------|------|
| 3.0.1 | **深度思考（Reasoner）** | `lib/deepseek.ts` — 新增 `reasonerStream()` + `parseSSE()` 公共 SSE 解析器；`lib/mentor-service.ts` — `MentorStyleConfig` 加 `model` 字段；`lib/chat-service.ts` — 根据 mentor 配置自动选择 reasoner/chat 模型；`app/api/chat/route.ts` — 新增 `event: reasoning` SSE 事件转发 reasoning_content | ✅ |
| 3.0.2 | **对话标题自动生成** | `lib/chat-service.ts` — `generateTitle()` 在 SSE done 后调用 `analyze()` 用 DeepSeek 生成 2-6 字中文标题 | ✅ |
| 3.0.3 | **统一搜索** | 新增 `lib/search-service.ts` — 跨对话/消息/联系人/记忆 LIKE 搜索；新增 `app/api/search/route.ts` — `GET /api/search?q=关键词` 返回分组结果 | ✅ |
| 3.0.4 | **异步记忆提炼** | `lib/chat-service.ts` — `postProcessConversation()` 在 SSE done 后触发，调用 DeepSeek analyze 分析对话 → 写入 memories | ✅ |
| 3.0.5 | **联系人详情** | 通过 `GET /api/persons` 已返回完整字段（姓名、关系、背景、性格判断、关系动态等） | ✅ |
| 3.0.6 | **错误处理** | `app/api/chat/route.ts` — SSE 发送 `event: error` 携带错误信息 | ✅ |

### P1 — 体验增强

| # | 功能 | 改动文件 | 状态 |
|---|------|---------|------|
| 3.1.1 | 图片上传 | 新增 `app/api/upload/route.ts` — `POST /api/upload` 接收 multipart 文件存到 `data/uploads/` | ✅ |
| 3.1.2 | DeepSeek VL | `ChatMessage` 接口已支持 `ContentPart[]` 格式 | ✅ |
| 3.1.3 | 备份下载 | 新增 `app/api/backup/route.ts` — `GET /api/backup` 流式下载 `nevin.db` | ✅ |
| 3.1.4 | 骨架屏 | 已有打字动画 + 加载状态 | ✅ |
| 3.1.5 | 右滑返回 | — | ⬜ |
| 3.1.6 | 深度思考开关 | — | ⬜ |
| 3.1.7 | 联网搜索开关 | — | ⬜ |

---

## 新增 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/search?q=关键词 | 统一搜索（对话/消息/联系人/记忆） |
| POST | /api/upload | 图片上传（multipart/form-data） |
| GET | /api/backup | 下载数据库备份 |

## 新增 SSE 事件

Reasoner 流式回复时新增：
```
event: reasoning
data: {"content": "思考过程..."}
```
