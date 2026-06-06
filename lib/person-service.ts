import { getDb } from "@/lib/db";

export interface Person {
  id: number;
  name: string;
  relationship: string | null;
  category: string | null;
  background: string | null;
  personality_notes: string | null;
  relationship_dynamics: string | null;
  recent_status: string | null;
  strategy_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonInput {
  name: string;
  relationship?: string;
  category?: string;
  background?: string;
  personality_notes?: string;
  relationship_dynamics?: string;
  recent_status?: string;
  strategy_notes?: string;
}

/**
 * 获取联系人列表（按创建时间倒序）
 */
export function getAllPersons(): Person[] {
  const db = getDb();
  return db.prepare("SELECT * FROM persons ORDER BY created_at DESC").all() as Person[];
}

/**
 * 按 ID 查询联系人
 */
export function getPersonById(id: number): Person | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM persons WHERE id = ?").get(id) as Person | undefined;
}

/**
 * 新建联系人
 */
export function createPerson(input: CreatePersonInput): Person {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO persons (name, relationship, category, background, personality_notes, relationship_dynamics, recent_status, strategy_notes)
    VALUES (@name, @relationship, @category, @background, @personality_notes, @relationship_dynamics, @recent_status, @strategy_notes)
  `).run({
    name: input.name,
    relationship: input.relationship ?? null,
    category: input.category ?? null,
    background: input.background ?? null,
    personality_notes: input.personality_notes ?? null,
    relationship_dynamics: input.relationship_dynamics ?? null,
    recent_status: input.recent_status ?? null,
    strategy_notes: input.strategy_notes ?? null,
  });
  return getPersonById(result.lastInsertRowid as number)!;
}

/**
 * 更新联系人。只传入需要更新的字段，保留原有值。
 */
export function updatePerson(id: number, input: Partial<CreatePersonInput>): Person | undefined {
  const db = getDb();
  const existing = getPersonById(id);
  if (!existing) return undefined;

  const merged = {
    name: input.name ?? existing.name,
    relationship: input.relationship !== undefined ? input.relationship : existing.relationship,
    category: input.category !== undefined ? input.category : existing.category,
    background: input.background !== undefined ? input.background : existing.background,
    personality_notes: input.personality_notes !== undefined ? input.personality_notes : existing.personality_notes,
    relationship_dynamics: input.relationship_dynamics !== undefined ? input.relationship_dynamics : existing.relationship_dynamics,
    recent_status: input.recent_status !== undefined ? input.recent_status : existing.recent_status,
    strategy_notes: input.strategy_notes !== undefined ? input.strategy_notes : existing.strategy_notes,
  };

  db.prepare(`
    UPDATE persons SET
      name = @name, relationship = @relationship, category = @category,
      background = @background, personality_notes = @personality_notes,
      relationship_dynamics = @relationship_dynamics, recent_status = @recent_status,
      strategy_notes = @strategy_notes, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({ ...merged, id });
  return getPersonById(id);
}

/**
 * 删除联系人
 */
export function deletePerson(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM persons WHERE id = ?").run(id);
}

// ── 对话-联系人关联管理 ──

export interface ConversationPerson {
  id: number;
  conversation_id: number;
  person_id: number;
  created_at: string;
}

/**
 * 获取某对话关联的联系人列表
 */
export function getPersonsByConversation(conversationId: number): Person[] {
  const db = getDb();
  return db.prepare(`
    SELECT p.* FROM persons p
    JOIN conversation_persons cp ON cp.person_id = p.id
    WHERE cp.conversation_id = ?
    ORDER BY cp.created_at ASC
  `).all(conversationId) as Person[];
}

/**
 * 在对话中添加联系人
 */
export function addPersonToConversation(conversationId: number, personId: number): void {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO conversation_persons (conversation_id, person_id) VALUES (?, ?)"
  ).run(conversationId, personId);
}

/**
 * 从对话中移除联系人
 */
export function removePersonFromConversation(conversationId: number, personId: number): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM conversation_persons WHERE conversation_id = ? AND person_id = ?"
  ).run(conversationId, personId);
}

/**
 * 在联系人档案中追加（不覆盖）新洞察
 */
export function appendPersonInsight(id: number, field: keyof Person, insight: string): void {
  const db = getDb();
  const existing = getPersonById(id);
  if (!existing) return;
  const currentVal = existing[field] as string | null;
  const newVal = currentVal ? `${currentVal}\n---\n${insight}` : insight;
  db.prepare(`UPDATE persons SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newVal, id);
}
