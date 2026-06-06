import { getDb } from "@/lib/db";

export interface Profile {
  id: number;
  name: string | null;
  background: string | null;
  values: string | null;
  personality: string | null;
  life_goals: string | null;
  habits: string | null;
  updated_at: string;
}

export interface UpdateProfileInput {
  name?: string;
  background?: string;
  values?: string;
  personality?: string;
  life_goals?: string;
  habits?: string;
}

/**
 * 获取用户档案。不存在时自动创建一行空档案。
 */
export function getProfile(): Profile {
  const db = getDb();
  let profile = db.prepare("SELECT * FROM profile WHERE id = 1").get() as Profile | undefined;
  if (!profile) {
    db.prepare("INSERT INTO profile (id, name) VALUES (1, NULL)").run();
    profile = db.prepare("SELECT * FROM profile WHERE id = 1").get() as Profile;
  }
  return profile;
}

/**
 * 更新用户档案。只传入需要更新的字段。
 */
export function updateProfile(input: UpdateProfileInput): Profile {
  const db = getDb();
  // 确保档案行存在
  getProfile();

  const sets: string[] = [];
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      sets.push(`"${key}" = @${key}`);
      params[key] = value;
    }
  }
  if (sets.length === 0) return getProfile();

  sets.push("updated_at = CURRENT_TIMESTAMP");
  params.id = 1;

  db.prepare(`UPDATE profile SET ${sets.join(", ")} WHERE id = @id`).run(params);
  return getProfile();
}
