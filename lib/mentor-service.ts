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

/**
 * 更新导师的风格配置（style_config JSON）
 * 仅更新 style_config 字段，不覆盖 system_prompt。
 */
export function updateMentorStyleConfig(id: number, styleConfig: MentorStyleConfig): Mentor | undefined {
  const db = getDb();
  db.prepare("UPDATE mentors SET style_config = ? WHERE id = ?").run(JSON.stringify(styleConfig), id);
  return getMentorById(id);
}
