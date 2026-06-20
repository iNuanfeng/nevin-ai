import { getDb } from "@/lib/db";
import type { ImageAttachment } from "@/lib/image-utils";
import { MESSAGE_PAGE_SIZE } from "@/lib/chat-constants";

export interface Conversation {
  id: number;
  mentor_id: number;
  title: string | null;
  summary: string | null;
  person_names: string | null;
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
  person_names: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationListPage {
  items: ConversationListItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const CONVERSATION_LIST_PAGE_SIZE = 5;

const CONVERSATION_LIST_SELECT = `
  SELECT
    c.id,
    c.mentor_id,
    m.name AS mentor_name,
    m.title AS mentor_title,
    m.category AS mentor_category,
    c.title,
    c.summary,
    lm.content AS last_message,
    lm.created_at AS last_message_at,
    (SELECT GROUP_CONCAT(p.name, ', ') FROM conversation_persons cp JOIN persons p ON p.id = cp.person_id WHERE cp.conversation_id = c.id) AS person_names,
    c.created_at,
    COALESCE(lm.created_at, c.created_at) AS sort_at
  FROM conversations c
  JOIN mentors m ON m.id = c.mentor_id
  LEFT JOIN messages lm ON lm.id = (
    SELECT id FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1
  )
  WHERE c.deleted = 0
`;

function mapConversationRows(rows: Array<ConversationListItem & { sort_at?: string }>): ConversationListItem[] {
  return rows.map(({ sort_at: _sortAt, ...item }) => item);
}

export function encodeConversationCursor(sortAt: string, id: number): string {
  return Buffer.from(`${sortAt}\t${id}`, "utf8").toString("base64url");
}

export function decodeConversationCursor(cursor: string): { sortAt: string; id: number } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const tab = raw.lastIndexOf("\t");
    if (tab === -1) return null;
    const id = Number.parseInt(raw.slice(tab + 1), 10);
    if (!Number.isFinite(id)) return null;
    return { sortAt: raw.slice(0, tab), id };
  } catch {
    return null;
  }
}

export interface GetConversationsPageOptions {
  mentorId?: number;
  category?: string;
  limit?: number;
  cursor?: string;
}

/**
 * 分页获取对话列表（按最近活跃时间倒序）。
 * 不传 limit 时返回全部（兼容测试/统计场景）。
 */
export function getConversationsPage(options: GetConversationsPageOptions = {}): ConversationListPage {
  const db = getDb();
  const { mentorId, category, limit, cursor } = options;

  let sql = CONVERSATION_LIST_SELECT;
  const params: unknown[] = [];

  if (mentorId !== undefined) {
    sql += " AND c.mentor_id = ?";
    params.push(mentorId);
  }
  if (category) {
    sql += " AND m.category = ?";
    params.push(category);
  }

  const decoded = cursor ? decodeConversationCursor(cursor) : null;
  if (cursor && !decoded) {
    return { items: [], hasMore: false, nextCursor: null };
  }
  if (decoded) {
    sql += " AND (COALESCE(lm.created_at, c.created_at) < ? OR (COALESCE(lm.created_at, c.created_at) = ? AND c.id < ?))";
    params.push(decoded.sortAt, decoded.sortAt, decoded.id);
  }

  sql += " ORDER BY sort_at DESC, c.id DESC";

  const fetchLimit = limit !== undefined ? limit + 1 : undefined;
  if (fetchLimit !== undefined) {
    sql += " LIMIT ?";
    params.push(fetchLimit);
  }

  const rows = db.prepare(sql).all(...params) as Array<ConversationListItem & { sort_at: string }>;

  if (limit === undefined) {
    return {
      items: mapConversationRows(rows),
      hasMore: false,
      nextCursor: null,
    };
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];

  return {
    items: mapConversationRows(pageRows),
    hasMore,
    nextCursor: hasMore && last ? encodeConversationCursor(last.sort_at, last.id) : null,
  };
}

export function countConversations(options: { mentorId?: number; category?: string } = {}): number {
  const db = getDb();
  let sql = `
    SELECT COUNT(*) AS c
    FROM conversations c
    JOIN mentors m ON m.id = c.mentor_id
    WHERE c.deleted = 0
  `;
  const params: unknown[] = [];
  if (options.mentorId !== undefined) {
    sql += " AND c.mentor_id = ?";
    params.push(options.mentorId);
  }
  if (options.category) {
    sql += " AND m.category = ?";
    params.push(options.category);
  }
  const row = db.prepare(sql).get(...params) as { c: number };
  return row.c;
}

/**
 * 获取对话列表，支持按 mentor 筛选。
 * @deprecated 列表页请使用 getConversationsPage
 */
export function getConversations(mentorId?: number): ConversationListItem[] {
  return getConversationsPage({ mentorId }).items;
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
 * 获取某条对话的全部消息，按时间正序（供 AI 上下文等内部使用）
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

export interface MessagePage {
  items: Message[];
  hasMore: boolean;
  totalCount: number;
}

/**
 * 分页获取消息：默认返回最新一页，按时间正序。
 * beforeId：加载比该 id 更早的消息（向上滚动）
 */
export function getMessagesPage(
  conversationId: number,
  options: { limit?: number; beforeId?: number } = {}
): MessagePage {
  const db = getDb();
  const limit = options.limit ?? MESSAGE_PAGE_SIZE;
  const totalCount = db.prepare(
    "SELECT COUNT(*) AS c FROM messages WHERE conversation_id = ?"
  ).get(conversationId) as { c: number };

  let sql = "SELECT * FROM messages WHERE conversation_id = ?";
  const params: unknown[] = [conversationId];
  if (options.beforeId !== undefined) {
    sql += " AND id < ?";
    params.push(options.beforeId);
  }
  sql += " ORDER BY id DESC LIMIT ?";
  params.push(limit + 1);

  const rows = db.prepare(sql).all(...params) as Message[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).reverse();

  return {
    items,
    hasMore,
    totalCount: totalCount.c,
  };
}

/**
 * 保存用户消息
 */
export function saveUserMessage(
  conversationId: number,
  content: string,
  images?: ImageAttachment[] | string[]
): Message {
  const db = getDb();
  const normalizedImages = images?.length
    ? images.map((img) => (typeof img === "string" ? { url: img } : img))
    : undefined;
  const result = db.prepare(
    "INSERT INTO messages (conversation_id, role, content, images) VALUES (?, 'user', ?, ?)"
  ).run(conversationId, content, normalizedImages ? JSON.stringify(normalizedImages) : null);
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
