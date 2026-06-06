import { getDb } from "@/lib/db";

export interface Conversation {
  id: number;
  mentor_id: number;
  title: string | null;
  summary: string | null;
  deleted: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  images: string | null;
  created_at: string;
}

export interface ConversationListItem {
  id: number;
  mentor_id: number;
  mentor_name: string;
  mentor_title: string;
  mentor_category: string;
  title: string | null;
  summary: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

/**
 * 获取对话列表，支持按 mentor 筛选。
 * 只返回非软删除的对话，附带最后一条消息预览和导师信息。
 */
export function getConversations(mentorId?: number): ConversationListItem[] {
  const db = getDb();
  let sql = `
    SELECT
      c.id,
      c.mentor_id,
      m.name AS mentor_name,
      m.title AS mentor_title,
      m.category AS mentor_category,
      c.title,
      c.summary,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message_at,
      c.created_at
    FROM conversations c
    JOIN mentors m ON m.id = c.mentor_id
    WHERE c.deleted = 0
  `;
  const params: unknown[] = [];
  if (mentorId !== undefined) {
    sql += ` AND c.mentor_id = ?`;
    params.push(mentorId);
  }
  sql += ` ORDER BY COALESCE(last_message_at, c.created_at) DESC`;
  return db.prepare(sql).all(...params) as ConversationListItem[];
}

/**
 * 按 ID 查询单条对话（不含软删除）
 */
export function getConversationById(id: number): Conversation | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM conversations WHERE id = ? AND deleted = 0").get(id) as Conversation | undefined;
}

/**
 * 新建对话，可选关联联系人
 */
export function createConversation(mentorId: number, title?: string, personIds?: number[]): Conversation {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO conversations (mentor_id, title) VALUES (?, ?)"
  ).run(mentorId, title ?? null);
  const conversationId = result.lastInsertRowid as number;

  if (personIds && personIds.length > 0) {
    const insert = db.prepare(
      "INSERT OR IGNORE INTO conversation_persons (conversation_id, person_id) VALUES (?, ?)"
    );
    for (const pid of personIds) {
      insert.run(conversationId, pid);
    }
  }

  return getConversationById(conversationId)!;
}

/**
 * 软删除对话
 */
export function deleteConversation(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE conversations SET deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(id);
}

/**
 * 获取某条对话的全部消息，按时间正序
 */
export function getMessagesByConversation(conversationId: number, limit?: number): Message[] {
  const db = getDb();
  if (limit) {
    return db.prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC LIMIT ?"
    ).all(conversationId, limit) as Message[];
  }
  return db.prepare(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC"
  ).all(conversationId) as Message[];
}

/**
 * 保存用户消息
 */
export function saveUserMessage(conversationId: number, content: string, images?: string[]): Message {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO messages (conversation_id, role, content, images) VALUES (?, 'user', ?, ?)"
  ).run(conversationId, content, images ? JSON.stringify(images) : null);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid) as Message;
}

/**
 * 保存 AI 回复消息
 */
export function saveAssistantMessage(conversationId: number, content: string): Message {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)"
  ).run(conversationId, content);

  // 更新对话的 updated_at
  db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);

  return db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid) as Message;
}

/**
 * 更新对话标题（用于 AI 自动生成标题后）
 */
export function updateConversationTitle(id: number, title: string): void {
  const db = getDb();
  db.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, id);
}

/**
 * 更新对话摘要
 */
export function updateConversationSummary(id: number, summary: string): void {
  const db = getDb();
  db.prepare("UPDATE conversations SET summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(summary, id);
}
