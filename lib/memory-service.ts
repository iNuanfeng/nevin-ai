import { getDb } from "@/lib/db";

export interface Memory {
  id: number;
  source_conversation_id: number | null;
  mentor_id: number | null;
  content: string;
  category: string | null;
  entities: string | null;   // JSON array of person IDs
  importance: number;
  created_at: string;
}

export interface StoreMemoryInput {
  source_conversation_id?: number;
  mentor_id?: number;
  content: string;
  category?: string;
  entities?: number[];        // person IDs
  importance?: number;
}

/**
 * 检索相关记忆。
 *
 * 搜索策略：
 * - 查询长度 >= 3 时：使用 FTS5 trigram MATCH（支持中文 + BM25 排序）
 * - 查询长度 < 3 时：使用 LIKE %keyword%（短词 trigram 无法匹配）
 * - 空查询：按重要度 + 时间倒序
 *
 * 支持按 mentor 和 person（entities 字段）筛选。
 */
export function retrieveRelevant(
  query: string,
  options?: {
    mentorId?: number;
    personId?: number;
    limit?: number;
  }
): Memory[] {
  const db = getDb();
  const limit = options?.limit ?? 10;

  const buildWhereClause = (useAlias: boolean) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const p = useAlias ? "m." : "";

    if (options?.mentorId !== undefined) {
      clauses.push(`${p}mentor_id = ?`);
      params.push(options.mentorId);
    }
    if (options?.personId !== undefined) {
      clauses.push(`${p}entities LIKE ?`);
      params.push(`%"${options.personId}"%`);
    }

    return { clauses, params };
  };

  const emptyQuery = !query || query.trim() === "";

  // ── 空查询：按重要度 + 时间返回 ──
  if (emptyQuery) {
    let sql = "SELECT * FROM memories WHERE 1=1";
    const { clauses, params } = buildWhereClause(false);
    if (clauses.length) sql += " AND " + clauses.join(" AND ");
    sql += " ORDER BY importance DESC, created_at DESC LIMIT ?";
    params.push(limit);
    return db.prepare(sql).all(...params) as Memory[];
  }

  // ── 短查询（1-2 chars）：FTS5 trigram 无法处理，回退 LIKE ──
  // 对任何语言的 1-2 字查询都走 LIKE，因为 trigram 最低 3 字
  if (query.length < 3) {
    let sql = "SELECT * FROM memories WHERE content LIKE ?";
    const params: unknown[] = [`%${query}%`];
    const { clauses, params: likeParams } = buildWhereClause(false);
    if (clauses.length) sql += " AND " + clauses.join(" AND ");
    params.push(...likeParams);
    sql += " ORDER BY importance DESC, created_at DESC LIMIT ?";
    params.push(limit);
    return db.prepare(sql).all(...params) as Memory[];
  }

  // ── 长查询（>= 3 chars）：FTS5 trigram MATCH + BM25 排序 ──
  let sql = `
    SELECT m.*,
           (m.importance * 0.6 + COALESCE(memories_fts.rank, 0) * 0.4) AS combined_score
    FROM memories m
    JOIN memories_fts ON memories_fts.rowid = m.id
    WHERE memories_fts MATCH ?
  `;
  const params: unknown[] = [query];

  // 如果开启了 person 筛选，需要 JOIN entities LIKE（FTS5 无法筛 JSON）
  const { clauses, params: ftsParams } = buildWhereClause(true);
  if (clauses.length) {
    sql += " AND " + clauses.join(" AND ");
    params.push(...ftsParams);
  }

  sql += " ORDER BY combined_score DESC LIMIT ?";
  params.push(limit);

  return db.prepare(sql).all(...params) as Memory[];
}

/**
 * 存储一条新记忆，FTS5 索引由 INSERT trigger 自动同步。
 */
export function storeMemory(input: StoreMemoryInput): Memory {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO memories (source_conversation_id, mentor_id, content, category, entities, importance)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.source_conversation_id ?? null,
    input.mentor_id ?? null,
    input.content,
    input.category ?? null,
    input.entities ? JSON.stringify(input.entities) : null,
    input.importance ?? 5
  );

  return db.prepare("SELECT * FROM memories WHERE id = ?").get(result.lastInsertRowid) as Memory;
}

/**
 * 在对话结束后，将对话消息提炼为记忆存储。
 * 调用方（chat-service）在 SSE done 后异步执行。
 */
export function refineMemoriesFromConversation(
  conversationId: number,
  mentorId: number,
  personIds: number[],
  summary: string
): Memory[] {
  const memories: Memory[] = [];

  if (summary && summary.trim()) {
    const memory = storeMemory({
      source_conversation_id: conversationId,
      mentor_id: mentorId,
      content: summary,
      category: "insight",
      entities: personIds.length > 0 ? personIds : undefined,
      importance: 6,
    });
    memories.push(memory);
  }

  return memories;
}

/**
 * 基于对话内容生成记忆提炼的 prompt（供 DeepSeek 分析用）
 */
export function buildRefinePrompt(
  messagesContent: string,
  linkedPersons?: Array<{ id: number; name: string }>
): string {
  const personBlock =
    linkedPersons && linkedPersons.length > 0
      ? `\n\n本对话关联的联系人（JSON 中 entities 请使用下列 id 整数）：\n${linkedPersons
          .map((p) => `- id ${p.id}: ${p.name}`)
          .join("\n")}`
      : "";

  return `你是一个记忆提炼助手。请分析以下对话内容，提炼出需要永久记住的关键信息。

对话内容：
${messagesContent}${personBlock}

规则：
1. 每条记忆应是一个独立的事实陈述，不要包含对话中的问候语或闲聊
2. personal_info 仅用于「用户本人」（应用所有者）的客观信息（生日、职业等），entities 必须为空数组 []
3. person_info 用于联系人的客观信息（生日、职业、性格等），entities 必须填联系人 person_id（整数）
4. relationship 用于用户与某联系人的关系动态、互动模式，entities 必填 person_id
5. insight / event / goal 若明确涉及某联系人，entities 填对应 person_id
6. 重要度 1-10；只提炼有长期价值的信息

请只输出 JSON 数组，不要 markdown 代码块（无有价值内容则返回 []）：
[
  {"content": "用户生日为6月20日", "category": "personal_info", "importance": 9, "entities": []},
  {"content": "小红最近工作压力大", "category": "person_info", "importance": 7, "entities": [2]}
]`;
}

/** 从模型输出中解析记忆 JSON 数组 */
export function parseRefinedMemories(analysis: string): Array<{
  content?: string;
  category?: string;
  importance?: number;
  entities?: number[];
}> {
  const trimmed = analysis.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
