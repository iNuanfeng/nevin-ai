# Nevin AI 架构设计文档

> 版本：v0.1（MVP）
> 最后更新：2026-06-06

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                   浏览器 / PWA 手机端                         │
│  Next.js 前端（React + Tailwind）                            │
│  导师列表 · 对话列表 · 聊天界面 · 通讯录 · 导师设置          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / SSE
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                Next.js API Routes（Node Runtime）             │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │  Chat    │ │  Mentor  │ │  Persons │ │  Profile       │  │
│  │  Route   │ │  Route   │ │  Route   │ │  /Upload Route │  │
│  └────┬─────┘ └──────────┘ └────┬─────┘ └───────┬───────┘  │
│       │                         │               │          │
│       ▼                         ▼               ▼          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Service Layer                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │ChatSvc   │  │MemorySvc │  │DeepSeek Client   │  │   │
│  │  │(含记忆   │  │(含记忆    │  │(streaming/vision) │  │   │
│  │  │ 检索注入)│  │ 提炼总结) │  │                  │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │PersonSvc │  │MentorSvc │  │ProfileSvc        │  │   │
│  │  │(联系人   │  │(导师管理  │  │(用户档案)        │  │   │
│  │  │ 管理/丰富)│  │ 人设定制)│  │                  │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Database Layer                          │   │
│  │  better-sqlite3 + FTS5                               │   │
│  │  /data/nevin.db                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              DeepSeek API（deepseek-chat / deepseek-vl）
              流式 SSE 返回 · 图片 base64 传入
```

**核心设计原则：**

- **一个进程跑完** — Next.js 同时承担前端和服务端
- **单文件数据库** — SQLite，全量数据一个文件
- **联系人为中心的记忆** — 联系人跨对话、跨导师共享累积
- **重要度驱动记忆** — 重要信息不会被长对话或时间冲淡

---

## 2. 目录结构

```
nevin-ai/
├── app/                          # Next.js App Router 页面
│   ├── layout.tsx                # 全局布局
│   ├── page.tsx                  # 首页 → 对话列表（含导师过滤器）
│   ├── conversations/
│   │   └── [id]/
│   │       └── page.tsx          # 具体对话页（聊天界面）
│   ├── persons/
│   │   └── page.tsx              # 通讯录管理页
│   └── globals.css
│
├── components/                   # React 组件
│   ├── ChatWindow.tsx            # 聊天窗口
│   ├── MessageBubble.tsx         # 单条消息
│   ├── ConversationList.tsx      # 对话列表（首页主体）
│   ├── ConversationItem.tsx      # 单条对话卡片（含导师标签、联系人标注）
│   ├── MentorFilter.tsx          # 顶部导师过滤器（横向滚动 chip）
│   ├── MentorPicker.tsx          # 新建对话时的导师选择面板（底部弹出）
│   ├── PersonSelector.tsx        # 联系人选择器（新建对话时）
│   ├── PersonTag.tsx             # 对话中显示已添加的联系人标签
│   ├── ImageUploader.tsx         # 图片上传
│   ├── MentorSettings.tsx        # 导师人设定制
│   └── MarkdownRenderer.tsx      # AI 回复渲染
│
├── lib/                          # 核心库
│   ├── db.ts                     # 数据库初始化
│   ├── schema.sql                # 建表 SQL
│   ├── chat-service.ts           # 聊天核心逻辑（记忆检索 + prompt 组装 + 流式）
│   ├── memory-service.ts         # 记忆检索/存储/提炼
│   ├── mentor-service.ts         # 导师管理 + 人设定制
│   ├── person-service.ts         # 联系人 CRUD + 档案丰富
│   ├── deepseek.ts               # DeepSeek API 客户端
│   └── profile-service.ts        # 用户档案
│
├── app/api/                      # API Routes
│   ├── chat/
│   │   └── route.ts              # POST: SSE 流式对话
│   ├── conversations/
│   │   └── route.ts              # GET（含 mentor 筛选）/POST/DELETE
│   ├── mentors/
│   │   └── route.ts              # GET/PUT（含人设定制）
│   ├── persons/
│   │   └── route.ts              # CRUD 联系人
│   ├── conversation-persons/
│   │   └── route.ts              # 对话与联系人的关联管理
│   ├── memory/
│   │   └── route.ts              # GET: 检索 / POST: 手动添加
│   ├── upload/
│   │   └── route.ts              # POST: 上传图片
│   ├── profile/
│   │   └── route.ts              # GET/PUT: 用户档案
│
├── data/                         # 数据目录
│   └── nevin.db
│
├── public/
│   └── icons/
│
├── next.config.ts
├── package.json
└── ...config files
```

---

## 3. 数据库设计

### 3.1 完整表结构

```sql
-- ========================================
-- ① 用户档案（一个人用只有一行记录）
-- ========================================
CREATE TABLE profile (
    id INTEGER PRIMARY KEY,
    name TEXT,
    background TEXT,           -- 背景经历
    values TEXT,               -- 核心价值观
    personality TEXT,          -- 性格特质
    life_goals TEXT,           -- 人生目标
    habits TEXT,               -- 习惯偏好
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ② 导师定义
-- ========================================
CREATE TABLE mentors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,          -- 导师名
    title TEXT,                  -- 头衔（如"你的职场参谋"）
    description TEXT,            -- 简短描述
    system_prompt TEXT NOT NULL, -- 核心系统提示词
    style_config TEXT,           -- 用户定制的人设风格（JSON）
    category TEXT,               -- life_manager / workplace / romance / family / photography / growth
    sort_order INTEGER DEFAULT 0
);

-- style_config 示例：
-- {
--   "style": "风趣痞帅，像童锦程，说话带点撩，偶尔土味情话",
--   "rules": ["关键建议时要沉稳认真", "多用比喻和生动的例子"],
--   "tone": "轻松但专业"
-- }

-- ========================================
-- ③ 对话会话
-- ========================================
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id),
    title TEXT,                  -- AI 自动生成的标题或用户命名
    summary TEXT,                -- 对话摘要（供记忆检索）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ④ 消息
-- ========================================
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    images TEXT,                 -- JSON: ["/uploads/a.jpg"]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ⑤ 联系人（全局通讯录）
-- ========================================
CREATE TABLE persons (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,           -- 姓名/代号
    relationship TEXT,            -- 同事 / 恋人 / 家人 / 朋友
    category TEXT,                -- workplace / romance / family
    background TEXT,              -- 背景信息
    personality_notes TEXT,       -- 性格判断（AI 积累）
    relationship_dynamics TEXT,   -- 你和TA的关系动态
    recent_status TEXT,           -- 最近状态
    strategy_notes TEXT,          -- 相处有效策略/禁忌
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ⑥ 对话-联系人关联（多对多）
-- ========================================
CREATE TABLE conversation_persons (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, person_id)
);

-- ========================================
-- ⑦ 永久记忆
-- ========================================
CREATE TABLE memories (
    id INTEGER PRIMARY KEY,
    source_conversation_id INTEGER REFERENCES conversations(id),
    mentor_id INTEGER REFERENCES mentors(id),
    content TEXT NOT NULL,        -- 记忆条目正文
    category TEXT,                -- personal_info / relationship / event / insight / goal
    entities TEXT,                -- JSON: 关联的人物ID列表 ["person_1", "person_3"]
    importance INTEGER DEFAULT 5 CHECK(importance BETWEEN 1 AND 10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 全文索引
CREATE VIRTUAL TABLE memories_fts USING fts5(content, content=memories);

-- ========================================
-- ⑧ 事件时间线
-- ========================================
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    person_ids TEXT,             -- JSON: [1, 3, 5]
    event_date DATE,
    emotion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 ER 关系

```
mentors 1──N conversations 1──N messages
                           │
                           N
                           │
                      conversation_persons
                           N
                           │
                     persons（全局共享）
```

---

## 4. 核心流程设计

### 4.1 全链路对话流

```
用户操作：
1. 创建对话
   → 选择 mentorId
   → 可选：从通讯录选择联系人加入（写入 conversation_persons）
   → 创建 conversation 记录
   ↓
2. 发送消息 POST /api/chat
   body: { conversationId, content, images? }
   ↓
3. ChatService.handleMessage()
   ↓
4. 获取 profile（用户档案）→ 全量读取
   ↓
5. 获取 mentor（导师配置 + 人设定制）
   ↓
6. 获取 contacts（该对话关联的联系人档案）→ 全量读取
   ↓
7. MemoryService.retrieveRelevant(query, mentorId, personIds)
   → FTS5 搜索 memories 表
   → 优先召回关联了这些人物的记忆
   → 按重要度排序取 Top-10
   ↓
8. 组装 System Prompt：
   [用户档案]
   [导师提示词 + 人设定制]
   [联系人档案]（对话中添加了谁就注入谁的）
   [历史记忆]（Top-10 重要记忆）
   [当前对话上下文]（近 N 条消息）
   ↓
9. DeepSeekClient.chatStream(messages)
   → SSE 流式返回 → 前端逐块渲染
   ↓
10. 流结束后
   → 保存完整消息到 messages 表
   → 异步触发总结：
      a. 提炼关键记忆 → 写入 memories
      b. 分析联系人 → 更新 persons 档案
      c. 如有用户相关更新 → 更新 profile
```

### 4.2 联系人档案丰富流

```
对话结束后，异步触发 PersonService.enrichProfile()

1. 收集本对话中所有关于该联系人的内容
2. 调用 DeepSeek 专用 prompt：
   "根据以下对话内容，分析关于{联系人名}的信息，
   包括：性格判断、当前心理状态、关系动态、
   有效沟通策略、需要避免的雷区。
   如有新的洞察请补充，如无新信息则返回 unchanged。"
3. 解析返回的结构化信息
4. 增量更新 persons 表对应字段
   → 不覆盖原有内容，只在末尾追加新洞察
   → 保持档案的历史累积
```

### 4.3 记忆检索策略

```
检索逻辑（优先级排序）：

1. 精确命中联系人
   → 检索 entities 包含该 person_id 的记忆
   → 按重要度排序

2. 关键词匹配
   → 使用 FTS5 MATCH 搜索 content 字段
   → 按 BM25 评分排序

3. 最终排序
   → 合并结果，按 importance * 0.6 + relevance_score * 0.4 排序
   → 取 Top-10 注入

为什么重要度权重更高：
用户说"50 条前的事要记得"——关键词可能不够精确，
但那次对话如果被标记为高重要度（比如 8+），
就能靠重要度权重被优先召回。
```

### 4.4 导师切换与联系人共享

```
用户在情场顾问下分析小红：
→ 小红档案不断丰富

用户转到职场军师，新建对话，添加小红：
→ 职场军师读取小红档案（已有的性格分析+关系动态）
→ 职场军师对话中的新分析 → 继续追加到小红档案
→ 两个导师共享同一个联系人档案

技术实现：
persons 表是全局的，conversation_persons 只关联不复制数据
```

---

## 5. 组件接口设计

### 5.1 API Routes

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat | 发送消息，返回 SSE 流 |
| GET | /api/conversations?mentorId= | 某导师下的对话列表 |
| POST | /api/conversations | 新建对话（传 mentorId + personIds） |
| DELETE | /api/conversations/:id | 删除对话（不影响联系人） |
| GET | /api/mentors | 获取导师列表 |
| PUT | /api/mentors/:id | 更新导师人设（style_config） |
| GET | /api/persons | 获取联系人列表（通讯录） |
| POST | /api/persons | 新建联系人 |
| PUT | /api/persons/:id | 更新联系人 |
| DELETE | /api/persons/:id | 删除联系人 |
| GET | /api/conversation-persons?conversationId= | 获取对话关联的联系人 |
| POST | /api/conversation-persons | 对话中添加联系人 |
| DELETE | /api/conversation-persons | 对话中移除联系人 |
| GET | /api/memory?q=&conversationId=&personId= | 检索记忆 |
| POST | /api/upload | 上传图片 |
| GET | /api/profile | 获取用户档案 |
| PUT | /api/profile | 更新用户档案 |

### 5.2 SSE 流式响应格式

```
Content-Type: text/event-stream

event: chunk
data: {"content": "你好"}

event: chunk
data: {"content": "，我是你的职场军师"}

event: done
data: {"conversationId": 1, "messageId": 42}

event: memory
data: {"action": "stored", "count": 3}

event: person-update
data: {"personId": 5, "field": "personality_notes", "hasNew": true}
```

---

## 6. System Prompt 组装模板

```
你是一个{mentor.title}，名叫{mentor.name}。
{mentor.system_prompt}

【你的风格要求】
{mentor.style_config}

【关于用户】
{profile.name}，{profile.background}
价值观：{profile.values}
性格：{profile.personality}
当前目标：{profile.life_goals}

【当前对话涉及的联系人】
{person.name}（{person.relationship}）
背景：{person.background}
性格判断：{person.personality_notes}
关系动态：{person.relationship_dynamics}
最近动态：{person.recent_status}
相处策略：{person.strategy_notes}

【历史相关记忆】
{memory_1}
{memory_2}
...

【对话上下文】
（近 20 条消息）
```

---

## 7. DeepSeek API 调用

### 7.1 文本对话（SSE 流式）

```typescript
async function chatStream(
  messages: Message[],
  onChunk: (text: string) => void
) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    // 解析 SSE data 行
    // 调用 onChunk(content)
  }
}
```

### 7.2 总结/分析调用（非流式）

用于记忆提炼和联系人档案更新——不需要流式，直接获取完整结果。

```typescript
async function analyze(conversationMessages: Message[]): Promise<Analysis> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        ...conversationMessages
      ],
      stream: false,
      temperature: 0.3  // 总结用低温度，更稳定
    })
  });

  const data = await response.json();
  return parseAnalysis(data.choices[0].message.content);
}
```

### 7.3 图片识别

```
发送带图片的消息时：
{
  role: "user",
  content: [
    { type: "text", text: "分析这张聊天截图，对方是什么意思？" },
    { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }
  ]
}
```

---

## 8. 部署方案

### 8.1 生产部署

```bash
# 服务器
git clone ...
cd nevin-ai
npm install
npm run build

export DEEPSEEK_API_KEY=sk-xxx
export PORT=3000

# 启动
npm start

# 建议 PM2 管理进程
# pm2 start npm --name nevin-ai -- start
```

### 8.2 Nginx 反代

```nginx
server {
    listen 443 ssl;
    server_name ai.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;  # SSE 需要
    }
}
```

### 8.3 数据备份

```bash
# 备份（全部数据在一个文件里）
cp data/nevin.db data/backup/nevin-$(date +%Y%m%d).db

# 恢复
cp data/backup/nevin-20260101.db data/nevin.db
```

---

## 9. 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js (App Router) | 用户熟悉，一体化部署 |
| 数据库 | SQLite + better-sqlite3 | 单人使用，一个文件备份全量数据 |
| 记忆检索 | FTS5 + 重要度排序 | MVP 够用，避免引入向量数据库 |
| 联系人共享 | 全局 persons 表 + 多对多关联 | 跨导师、跨对话共享数据 |
| 流式方案 | SSE | 浏览器原生支持，足够简单 |
| 人设存储 | mentors.style_config JSON | 灵活扩展，不限制人设描述格式 |
| 对话模型 | 导师 N→对话 1→联系人 M | 灵活支持各种使用场景 |

---

## 10. 后续演进

```
MVP
├── 6 个预置导师 + 人设定制
├── 每导师下多个对话
├── 全局联系人通讯录
├── 对话添加联系人
├── AI 自动丰富联系人档案
├── SSE 流式对话
├── 永久记忆检索注入（重要度驱动）
├── 图片上传识别
└── PWA + 移动端适配

阶段二
├── 语义搜索（embedding 向量检索）
├── 对话中提及人物一键建联系人
├── 自定义导师
├── 事件日历
└── 数据导出

阶段三
├── 语音输入
├── 关系图谱可视化
├── 主动提醒
├── 摄影学习系统
└── 多模型支持
```

---

## 11. 数据备份方案

### 11.1 备份什么

| 数据 | 位置 | 类型 | 备份方式 |
|------|------|------|----------|
| 数据库 | `data/nevin.db` | 结构化数据 | SQLite `.backup` |
| 图片 | `data/uploads/` | 文件 | tar 归档 |
| 配置 | `.env.local` | 环境变量 | 单独备份（敏感） |

### 11.2 备份方案（三选一按需使用）

#### 方案 A：本地备份（推荐）
服务器本地保留最近 30 天的备份。

```bash
# crontab -e 每日凌晨 3 点执行
0 3 * * * /path/to/nevin-ai/scripts/backup.sh
```

备份结果：
```
backups/
├── 20260101_030000/
│   ├── nevin.db           # SQLite 完整快照
│   ├── uploads.tar.gz     # 图片 tar 包
│   └── BACKUP_INFO.txt    # 元信息
├── 20260102_030000/
│   └── ...
```

#### 方案 B：本地 + 异地

在 backup.sh 尾部追加一条 `rsync`，推送备份到另一个机器或 NAS：

```bash
rsync -avz --delete "${BACKUP_DIR}/" user@nas:/backup/nevin-ai/
```

#### 方案 C：本地 + 手动下载

什么自动化都不配，隔段时间手动拉下来：

```bash
scp -r user@yourserver.com:/path/to/nevin-ai/data/nevin.db ~/my-backups/
```

### 11.3 恢复

```bash
# 列出可用备份
ls backups/

# 恢复指定备份
./scripts/restore.sh backups/20260101_030000
```

### 11.4 SQLite 备份为什么不用直接 cp

```bash
# ❌ 不安全的做法（写入中途 cp 可能拿到损坏文件）
cp data/nevin.db backup/nevin.db

# ✅ 安全的做法（.backup 保证一致性）
sqlite3 data/nevin.db ".backup 'backup/nevin.db'"
```

`.backup` 命令会在 SQLite 内部加锁，等当前事务完成后再快照，确保备份文件是一个完整一致的数据库状态。

## 12. 灾备方案（MVP）

### 12.1 策略：App 内一键下载备份包

不上 OSS、不配 rclone、不搞异地同步。需要备份时，浏览器打开一个页面，点按钮下载完整备份。

```
你在手机上或电脑上打开
    https://ai.domain.com/backup
    → 点击「下载备份」
    → 后端实时打包：
        ├── nevin.db（sqlite3 .backup 安全快照）
        └── uploads.tar.gz（图片打包）
    → 浏览器下载一个 .zip 文件
    → 存到电脑或移动硬盘
```

恢复时解压 zip，把 `nevin.db` 放回 `data/` 目录，图片解压到 `data/uploads/`，重启服务即可。

### 12.2 备份页面

```
app/backup/page.tsx
    → 说明页 + 下载按钮

app/api/backup/route.ts
    → 生成临时备份文件
    → 返回 ZIP 流式下载
    → 完成后自动清理临时文件
```

### 12.3 日常双重保险

```
每天 3AM（crontab）
  本地备份 → 保留 30 天 ← 防数据库意外损坏

你需要时（手动）
  /backup 页面下载完整包 ← 防服务器爆炸
```

两者不冲突。每日备份是保险丝，手动下载是灭火器。


## 13. 对话删除设计

### 13.1 软删除机制

对话删除采用软删除（soft delete），不物理删除数据。

```sql
-- conversations 表新增字段
ALTER TABLE conversations ADD COLUMN deleted INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN deleted_at DATETIME;
```

### 13.2 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | /api/conversations/:id/delete | 软删除对话 |
| PUT | /api/conversations/:id/undo-delete | 撤销删除（3 秒窗口内）|
| DELETE | /api/conversations/:id | 物理删除（可选，超时后清理）|

### 13.3 记忆独立性

删除对话不影响任何其他数据表：

```
用户删除对话
    ↓
conversations.deleted = 1  ✅
conversation_persons       ❌ 不受影响（关联关系存在但不影响联系人）
persons                    ❌ 完全不受影响
memories                   ❌ 完全不受影响（记忆检索照常工作）
profile                    ❌ 完全不受影响
```

### 13.4 前端交互

参见 PRD 第 13 节详细交互流程。
前端左滑删除使用 `react-gesture-responder` 或原生 touch 事件实现，
配合 3 秒 `setTimeout` 自动确认删除，toast 内提供撤销按钮。


## 14. 深度思考（Reasoner）集成

### 14.1 模型选择逻辑

```
mentor.style_config.model
    │
    ├── 未设置 → 默认使用 deepseek-chat
    │
    ├── "deepseek-reasoner"
    │       ↓
    │   lib/deepseek.ts 调用时：
    │   model: "deepseek-reasoner"
    │   messages 中包含 system prompt + user/assistant 交替
    │   SSE 响应中额外解析 reasoning_content 字段
    │       ↓
    │   前端收到 reasoning_content → 先以灰色/折叠框展示思考过程
    │   前端收到 content → 正常展示答案
    │
    └── "deepseek-chat"
            ↓
        lib/deepseek.ts 调用时：
        model: "deepseek-chat"
        无 reasoning_content
```

### 14.2 API 差异

```typescript
// deepseek.ts
async function chatStream(
  messages: Message[],
  model: 'deepseek-chat' | 'deepseek-reasoner',
  onChunk: (text: string) => void,
  onReasoning?: (text: string) => void  // reasoner 的推理过程回调
) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    })
  });

  const reader = response.body!.getReader();
  // SSE 解析：
  // 当 model=deepseek-reasoner 时：
  //   delta.reasoning_content → 调用 onReasoning
  //   delta.content → 调用 onChunk
  // 当 model=deepseek-chat 时：
  //   delta.content → 调用 onChunk
}
```

### 14.3 前端展示

```
┌──────────────────────────────────┐
│  💭 思考过程                     │  ← 灰色/折叠框，可展开收起
│  用户从秒回到几小时回复           │
│  → 可能是关系进入新阶段            │
│  → 也可能是她在自我保护           │
│  → 最不应该做的是质问             │
│  → 建议表达关心但不施压           │
├──────────────────────────────────┤
│                                  │
│  ❤️ 情场顾问的回复                 │
│  这种变化通常不是单一的"你哪里     │
│  做错了"...                       │
└──────────────────────────────────┘
```

### 14.4 配置存储

```json
// mentors 表 style_config 字段扩展
{
  "style": "风趣痞帅，像童锦程，说话带点撩",
  "model": "deepseek-reasoner",
  "rules": ["关键建议时要沉稳认真", "多用比喻和生动的例子"],
  "allow_web_search": false
}
```

### 14.5 导师默认 model 表

| 导师 | category | model |
|------|---------|-------|
| 总管家 | life_manager | deepseek-chat |
| 职场军师 | workplace | deepseek-reasoner |
| 情场顾问 | romance | deepseek-reasoner |
| 家庭调解师 | family | deepseek-chat |
| 摄影导师 | photography | deepseek-chat |
| 成长教练 | growth | deepseek-reasoner |
