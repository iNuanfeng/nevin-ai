-- ========================================
-- Nevin AI 数据库 Schema
-- ========================================

-- ① 用户档案（一个人用只有一行记录）
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY,
    name TEXT,
    background TEXT,
    "values" TEXT,
    personality TEXT,
    life_goals TEXT,
    habits TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ② 导师定义
CREATE TABLE IF NOT EXISTS mentors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    system_prompt TEXT NOT NULL,
    style_config TEXT,
    category TEXT,
    sort_order INTEGER DEFAULT 0
);

-- ③ 对话会话
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentors(id),
    title TEXT,
    summary TEXT,
    deleted INTEGER DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ④ 消息
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    images TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ⑤ 联系人（全局通讯录）
CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT,
    category TEXT,
    background TEXT,
    personality_notes TEXT,
    relationship_dynamics TEXT,
    recent_status TEXT,
    strategy_notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ⑥ 对话-联系人关联（多对多）
CREATE TABLE IF NOT EXISTS conversation_persons (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, person_id)
);

-- ⑦ 永久记忆
CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY,
    source_conversation_id INTEGER REFERENCES conversations(id),
    mentor_id INTEGER REFERENCES mentors(id),
    content TEXT NOT NULL,
    category TEXT,
    entities TEXT,
    importance INTEGER DEFAULT 5 CHECK(importance BETWEEN 1 AND 10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ⑧ 事件时间线
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    person_ids TEXT,
    event_date DATE,
    emotion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 全文索引（需要在建表之后创建）
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    content,
    content=memories
);
