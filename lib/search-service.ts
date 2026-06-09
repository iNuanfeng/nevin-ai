import { getDb } from "@/lib/db";

export interface SearchResults {
  conversations: Array<{ id: number; title: string; mentor_name: string }>;
  persons: Array<{ id: number; name: string; relationship: string | null }>;
  memories: Array<{ id: number; content: string; category: string | null; importance: number }>;
}

/**
 * 统一搜索：跨对话、联系人、记忆检索
 */
export function searchAll(keyword: string): SearchResults {
  const db = getDb();
  const like = `%${keyword}%`;

  const conversations = db.prepare(`
    SELECT DISTINCT c.id, c.title, m.name AS mentor_name
    FROM conversations c
    JOIN mentors m ON m.id = c.mentor_id
    LEFT JOIN messages msg ON msg.conversation_id = c.id
    WHERE c.deleted = 0 AND (c.title LIKE ? OR msg.content LIKE ?)
    ORDER BY c.updated_at DESC
    LIMIT 10
  `).all(like, like) as SearchResults["conversations"];

  const persons = db.prepare(`
    SELECT id, name, relationship FROM persons
    WHERE archived = 0 AND (name LIKE ? OR background LIKE ? OR personality_notes LIKE ?)
    ORDER BY updated_at DESC
    LIMIT 10
  `).all(like, like, like) as SearchResults["persons"];

  const memories = db.prepare(`
    SELECT id, content, category, importance FROM memories
    WHERE content LIKE ?
    ORDER BY importance DESC, created_at DESC
    LIMIT 10
  `).all(like) as SearchResults["memories"];

  return { conversations, persons, memories };
}
