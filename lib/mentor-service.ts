import { getDb } from "@/lib/db";

export interface Mentor {
  id: number;
  name: string;
  title: string;
  description: string;
  system_prompt: string;
  style_config: string | null;       // JSON string
  category: string | null;
  sort_order: number;
}

export interface MentorStyleConfig {
  style?: string;
  rules?: string[];
  tone?: string;
  model?: string;
}

/**
 * 获取导师完整列表（按 sort_order 排序）
 */
export function getAllMentors(): Mentor[] {
  const db = getDb();
  return db.prepare("SELECT * FROM mentors ORDER BY sort_order").all() as Mentor[];
}

/**
 * 按 ID 查询导师
 */
export function getMentorById(id: number): Mentor | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM mentors WHERE id = ?").get(id) as Mentor | undefined;
}

export interface MentorUpdates {
  system_prompt?: string;
  style_config?: MentorStyleConfig;
}

/**
 * 更新导师人设（system_prompt）和/或模型偏好（style_config）
 */
export function updateMentor(id: number, updates: MentorUpdates): Mentor | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.system_prompt !== undefined) {
    fields.push("system_prompt = ?");
    values.push(updates.system_prompt.trim());
  }
  if (updates.style_config !== undefined) {
    fields.push("style_config = ?");
    values.push(JSON.stringify(updates.style_config));
  }
  if (fields.length === 0) return getMentorById(id);

  values.push(id);
  db.prepare(`UPDATE mentors SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return getMentorById(id);
}

/** @deprecated 使用 updateMentor */
export function updateMentorStyleConfig(id: number, styleConfig: MentorStyleConfig): Mentor | undefined {
  return updateMentor(id, { style_config: styleConfig });
}
