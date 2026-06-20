import { analyze } from "@/lib/deepseek";
import {
  COLLECTED_INFO_BATCH_SIZE,
  parsePendingJson,
  isDuplicateFact,
  isDuplicateInList,
} from "@/lib/collected-info-service";
import { getPersonById, updatePerson, type Person } from "@/lib/person-service";

function buildPersonConsolidatePrompt(personName: string, existing: string, pending: string[]): string {
  const pendingBlock = pending.map((item, i) => `${i + 1}. ${item}`).join("\n");
  return `你是联系人档案整理助手。请将「${personName}」的已有信息收集与待合并的新事实整理成一份简洁、无重复、尽量无矛盾的正文。

规则：
1. 只记录关于「${personName}」本人的事实，以及 TA 与用户的关系/互动，不要写成用户本人的档案
2. 同一属性只保留一条最可信表述；矛盾时以最新为准，无法判断则写「待确认：…」
3. 合并重复内容，不要编造未提供的信息
4. 输出纯文本，每条一行或短段落，尽量控制在 600 字以内

已有信息收集：
${existing.trim() || "（暂无）"}

待合并的新事实（共 ${pending.length} 条）：
${pendingBlock}

只输出整理后的正文，不要标题、不要 markdown、不要解释。`;
}

export function getPersonPendingCollectedCount(personId: number): number {
  const person = getPersonById(personId);
  if (!person) return 0;
  return parsePendingJson(person.pending_collected_info).length;
}

export function queuePersonCollectedInfo(
  personId: number,
  fact: string
): { pendingCount: number; shouldConsolidate: boolean } {
  const trimmed = fact.trim();
  if (!trimmed) {
    return { pendingCount: getPersonPendingCollectedCount(personId), shouldConsolidate: false };
  }

  const person = getPersonById(personId);
  if (!person) {
    return { pendingCount: 0, shouldConsolidate: false };
  }

  const pending = parsePendingJson(person.pending_collected_info);
  if (
    isDuplicateInList(trimmed, pending) ||
    isDuplicateFact(trimmed, person.collected_info)
  ) {
    return { pendingCount: pending.length, shouldConsolidate: false };
  }

  pending.push(trimmed);
  updatePerson(personId, { pending_collected_info: JSON.stringify(pending) });

  return {
    pendingCount: pending.length,
    shouldConsolidate: pending.length >= COLLECTED_INFO_BATCH_SIZE,
  };
}

export async function consolidatePersonCollectedInfo(personId: number): Promise<Person | undefined> {
  const person = getPersonById(personId);
  if (!person) return undefined;

  const pending = parsePendingJson(person.pending_collected_info);
  if (pending.length === 0) return person;

  const existing = person.collected_info?.trim() || "";

  try {
    const merged = await analyze(buildPersonConsolidatePrompt(person.name, existing, pending), [
      { role: "user", content: "请输出整理后的信息收集正文。" },
    ]);
    const cleaned = merged.trim();
    if (cleaned) {
      updatePerson(personId, {
        collected_info: cleaned,
        pending_collected_info: "[]",
      });
    } else {
      updatePerson(personId, { pending_collected_info: "[]" });
    }
  } catch (err) {
    console.warn(
      `[person-collected-info] consolidate failed for ${personId}:`,
      err instanceof Error ? err.message : err
    );
  }

  return getPersonById(personId);
}

export function schedulePersonCollectedInfoConsolidation(personId: number): void {
  void consolidatePersonCollectedInfo(personId);
}
