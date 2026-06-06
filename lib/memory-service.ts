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
 * 使用 FTS5 + 重要度混合排序：score = importance * 0.6 + bm25 * 0.4
 * 支持按 mentor 和 person 筛选。
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

  // 如果查询词为空，按重要度返回最近的记忆
  if (!query || query.trim() === "") {
    let sql = "SELECT * FROM memories WHERE 1=1";
    const params: unknown[] = [];
    if (options?.mentorId !== undefined) {
      sql += " AND mentor_id = ?";
      params.push(options.mentorId);
    }
    if (options?.personId !== undefined) {
      sql += " AND entities LIKE ?";
      params.push(`%"${options.personId}"%`);
    }
    sql += " ORDER BY importance DESC, created_at DESC LIMIT ?";
    params.push(limit);
    return db.prepare(sql).all(...params) as Memory[];
  }

  // FTS5 全文搜索
  let ftsSql = `
    SELECT m.*, 
           (m.importance * 0.6 + COALESCE(mf.rank, 0) * 0.4) AS combined_score
    FROM memories m
    JOIN memories_fts mf ON mf.rowid = m.id
    WHERE memories_fts MATCH ?
  `;
  const ftsParams: unknown[] = [query];

  if (options?.mentorId !== undefined) {
    ftsSql += " AND m.mentor_id = ?";
    ftsParams.push(options.mentorId);
  }
  if (options?.personId !== undefined) {
    ftsSql += " AND m.entities LIKE ?";
    ftsParams.push(`%"${options.personId}"%`);
  }

  ftsSql += " ORDER BY combined_score DESC LIMIT ?";
  ftsParams.push(limit);

  return db.prepare(ftsSql).all(...ftsParams) as Memory[];
}

/**
 * 存储一条新记忆，同时同步写入 FTS5 索引。
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

  // 同步 FTS5 索引 — 使用 INSERT trigger 自动同步
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

  // 存为一条提炼后的综合记忆
  if (summary && summary.trim()) {
    const memory = storeMemory({
      source_conversation_id: conversationId,
      mentor_id: mentorId,
      content: summary,
      category: "insight",
      entities: personIds.length > 0 ? personIds : undefined,
      importance: 6, // 提炼出的记忆默认中高重要度
    });
    memories.push(memory);
  }

  return memories;
}

/**
 * 基于对话内容生成记忆提炼的 prompt（供 DeepSeek 分析用）
 */
export function buildRefinePrompt(messagesContent: string): string {
  return `你是一个记忆提炼助手。请分析以下对话内容，提炼出需要永久记住的关键信息。

规则：
1. 每条记忆应是一个独立的事实陈述，不要包含对话中的问候语或闲聊
2. 重要度 1-10：对用户人生影响越大的信息重要度越高
3. 分类：personal_info（个人基本情况）/ relationship（关系动态）/ event（事件记录）/ insight（深刻洞察）/ goal（目标与计划）
4. 只提炼客观有长期价值的信息，过滤掉一次性或临时性内容

请按以下 JSON 格式返回（如果无有价值内容返回空数组）：
[
  {"content": "...", "category": "insight", "importance": 7, "entities": []},
  {"content": "...", "category": "relationship", "importance": 8, "entities": [person_id]}
]`;
}
