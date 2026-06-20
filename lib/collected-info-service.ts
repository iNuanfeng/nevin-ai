import { analyze } from "@/lib/deepseek";
import { getProfile, updateProfile, type Profile } from "@/lib/profile-service";

export const COLLECTED_INFO_BATCH_SIZE = 10;

export function parsePendingJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function factLines(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

export function isDuplicateFact(fact: string, existingText: string | null | undefined): boolean {
  const trimmed = fact.trim();
  if (!trimmed) return true;
  return factLines(existingText).some(
    (line) => line === trimmed || line.includes(trimmed) || trimmed.includes(line)
  );
}

export function isDuplicateInList(fact: string, list: string[]): boolean {
  return list.some(
    (line) => line === fact || line.includes(fact) || fact.includes(line)
  );
}

export function getPendingCollectedInfoCount(): number {
  const profile = getProfile();
  return parsePendingJson(profile.pending_collected_info).length;
}

/**
 * 将一条 AI 提炼的 personal_info 放入待整理队列；满 10 条时返回 shouldConsolidate=true
 */
export function queueCollectedInfo(fact: string): {
  pendingCount: number;
  shouldConsolidate: boolean;
} {
  const trimmed = fact.trim();
  if (!trimmed) {
    return { pendingCount: getPendingCollectedInfoCount(), shouldConsolidate: false };
  }

  const profile = getProfile();
  const pending = parsePendingJson(profile.pending_collected_info);

  if (
    isDuplicateInList(trimmed, pending) ||
    isDuplicateFact(trimmed, profile.collected_info)
  ) {
    return { pendingCount: pending.length, shouldConsolidate: false };
  }

  pending.push(trimmed);
  updateProfile({ pending_collected_info: JSON.stringify(pending) });

  return {
    pendingCount: pending.length,
    shouldConsolidate: pending.length >= COLLECTED_INFO_BATCH_SIZE,
  };
}

function buildConsolidatePrompt(existing: string, pending: string[]): string {
  const pendingBlock = pending.map((item, i) => `${i + 1}. ${item}`).join("\n");
  return `你是用户档案整理助手。请将「已有信息收集」与「待合并的新事实」整理成一份简洁、无重复、尽量无矛盾的信息收集正文。

规则：
1. 同一属性（如口味、生日、职业）只保留一条最可信表述
2. 若新事实与旧内容矛盾，以最新事实为准；若无法判断真伪，写「待确认：…」
3. 合并重复表述，删除问候语和废话，不要编造未提供的信息
4. 保留用户可能手动整理过的有用结构；输出纯文本，每条一行或短段落
5. 总长度尽量控制在 800 字以内

已有信息收集：
${existing.trim() || "（暂无）"}

待合并的新事实（共 ${pending.length} 条）：
${pendingBlock}

只输出整理后的「信息收集」正文，不要标题、不要 markdown、不要解释。`;
}

/**
 * 将待整理队列合并进 collected_info，并清空队列
 */
export async function consolidateCollectedInfo(): Promise<Profile> {
  const profile = getProfile();
  const pending = parsePendingJson(profile.pending_collected_info);
  if (pending.length === 0) return profile;

  const existing = profile.collected_info?.trim() || "";

  try {
    const merged = await analyze(buildConsolidatePrompt(existing, pending), [
      { role: "user", content: "请输出整理后的信息收集正文。" },
    ]);
    const cleaned = merged.trim();
    if (cleaned) {
      updateProfile({
        collected_info: cleaned,
        pending_collected_info: "[]",
      });
    } else {
      updateProfile({ pending_collected_info: "[]" });
    }
  } catch (err) {
    console.warn("[collected-info] consolidate failed:", err instanceof Error ? err.message : err);
  }

  return getProfile();
}

/** 异步触发整理，不阻塞主流程 */
export function scheduleCollectedInfoConsolidation(): void {
  void consolidateCollectedInfo();
}
