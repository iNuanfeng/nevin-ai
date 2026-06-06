import { ChatMessage, chatStream, analyze } from "@/lib/deepseek";
import { getProfile, updateProfile } from "@/lib/profile-service";
import { getMentorById, Mentor } from "@/lib/mentor-service";
import { getPersonsByConversation, appendPersonInsight } from "@/lib/person-service";
import { retrieveRelevant, storeMemory, buildRefinePrompt } from "@/lib/memory-service";
import {
  getConversationById,
  getMessagesByConversation,
  saveUserMessage,
  saveAssistantMessage,
  updateConversationTitle,
  updateConversationSummary,
  Conversation,
  Message,
} from "@/lib/conversation-service";

export interface HandleMessageInput {
  conversationId: number;
  content: string;
  images?: string[];
}

export interface HandleMessageCallbacks {
  /** AI 回答的每一个 token 块 */
  onChunk: (text: string) => void;
  /** 流式完成，返回完整消息体 */
  onDone: (message: Message) => void;
  /** 异步后处理完成通知 */
  onMemoryStored?: (count: number) => void;
  onPersonUpdated?: (personId: number, field: string, hasNew: boolean) => void;
  /** 流式错误 */
  onError: (error: Error) => void;
}

const MAX_CONTEXT_MESSAGES = 20;

/**
 * 构建 System Prompt
 * 包含：用户档案 + 导师提示词 + 人设定制 + 联系人档案 + 历史记忆
 */
function buildSystemPrompt(
  profile: { name: string | null; background: string | null; values: string | null; personality: string | null; life_goals: string | null; habits: string | null },
  mentor: Mentor,
  persons: Array<{ name: string; relationship: string | null; background: string | null; personality_notes: string | null; relationship_dynamics: string | null; recent_status: string | null; strategy_notes: string | null }>,
  memories: Array<{ content: string; importance: number; category: string | null }>
): string {
  const lines: string[] = [];

  // 导师人设
  lines.push(`你是一个${mentor.title}，名叫${mentor.name}。`);
  lines.push(mentor.system_prompt);

  if (mentor.style_config) {
    try {
      const style = JSON.parse(mentor.style_config);
      lines.push("");
      lines.push("【你的风格要求】");
      if (style.style) lines.push(style.style);
      if (style.tone) lines.push(`语气：${style.tone}`);
      if (style.rules?.length) lines.push(...style.rules.map((r: string) => `- ${r}`));
    } catch {
      lines.push(`\n【风格定制】${mentor.style_config}`);
    }
  }

  // 用户档案
  lines.push("");
  lines.push("【关于用户】");
  if (profile.name) lines.push(`姓名：${profile.name}`);
  if (profile.background) lines.push(`背景：${profile.background}`);
  if (profile.values) lines.push(`价值观：${profile.values}`);
  if (profile.personality) lines.push(`性格：${profile.personality}`);
  if (profile.life_goals) lines.push(`当前目标：${profile.life_goals}`);
  if (profile.habits) lines.push(`习惯：${profile.habits}`);

  // 联系人档案
  if (persons.length > 0) {
    lines.push("");
    lines.push("【当前对话涉及的联系人】");
    for (const p of persons) {
      lines.push(`\n${p.name}（${p.relationship ?? "未定义关系"}）`);
      if (p.background) lines.push(`背景：${p.background}`);
      if (p.personality_notes) lines.push(`性格判断：${p.personality_notes}`);
      if (p.relationship_dynamics) lines.push(`关系动态：${p.relationship_dynamics}`);
      if (p.recent_status) lines.push(`最近动态：${p.recent_status}`);
      if (p.strategy_notes) lines.push(`相处策略：${p.strategy_notes}`);
    }
  }

  // 历史记忆
  if (memories.length > 0) {
    lines.push("");
    lines.push("【历史相关记忆（按重要度排序）】");
    for (const mem of memories) {
      const tag = mem.category ? `[${mem.category}]` : "";
      lines.push(`- [重要度${mem.importance}]${tag} ${mem.content}`);
    }
  }

  lines.push("");
  lines.push("【对话上下文】");

  return lines.join("\n");
}

/**
 * 完整的对话处理流程。
 *
 * 1. 保存用户消息
 * 2. 读取 profile + mentor + 联系人 + 历史记忆
 * 3. 组装 system prompt + 最近消息上下文
 * 4. 调用 DeepSeek 流式返回
 * 5. 保存 AI 回复
 * 6. 异步后处理：记忆提炼、联系人丰富
 */
export async function handleMessage(
  input: HandleMessageInput,
  callbacks: HandleMessageCallbacks
): Promise<void> {
  const { conversationId, content, images } = input;

  try {
    // 1. 验证对话存在
    const conversation = getConversationById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // 2. 保存用户消息
    saveUserMessage(conversationId, content, images);

    // 3. 读取上下文
    const profile = getProfile();
    const mentor = getMentorById(conversation.mentor_id);
    if (!mentor) {
      throw new Error(`Mentor ${conversation.mentor_id} not found`);
    }

    const persons = getPersonsByConversation(conversationId);
    const personIds = persons.map((p) => p.id);

    // 4. 检索记忆
    const memories = retrieveRelevant(content, {
      mentorId: mentor.id,
      limit: 10,
    });

    // 5. 获取最近上下文消息
    const recentMessages = getMessagesByConversation(conversationId, MAX_CONTEXT_MESSAGES);

    // 6. 组装 System Prompt
    const systemPrompt = buildSystemPrompt(profile, mentor, persons, memories);

    // 7. 组装消息列表
    const deepseekMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];
    // Note: image messages supported by ChatMessage type, full multi-modal in Phase 3n


    // 8. 调用 DeepSeek 流式
    let fullResponse = "";
    await chatStream(deepseekMessages, {
      onChunk: (text) => {
        fullResponse += text;
        callbacks.onChunk(text);
      },
      onDone: async (fullContent) => {
        fullResponse = fullContent;

        // 9. 保存 AI 回复
        const message = saveAssistantMessage(conversationId, fullContent);
        callbacks.onDone(message);

        // 10. 异步后处理
        if (!conversation.title) {
          generateTitle(conversationId, fullContent, mentor.name);
        }
        generateSummary(conversationId, recentMessages, fullContent);
        postProcessConversation(conversationId, mentor.id, personIds, recentMessages, fullContent, callbacks);
      },
      onError: (error) => {
        callbacks.onError(error);
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError(error);
  }
}

/**
 * 构建带图片的 content 数组
 */
function buildImageContent(text: string, images: string[]): ChatMessageContent {
  if (!images || images.length === 0) return text;
  return [
    { type: "text", text },
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}` },
    })),
  ];
}

type ChatMessageContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

// ── 异步后处理 ──

/**
 * AI 自动生成对话标题（触发时机：首轮 AI 回复后）
 */
async function generateTitle(conversationId: number, firstResponse: string, mentorName: string): Promise<void> {
  try {
    const title = firstResponse.slice(0, 30).replace(/[\n\r]/g, " ").trim();
    if (title.length > 3) {
      updateConversationTitle(conversationId, `${mentorName}的建议`);
    }
  } catch {
    // Silent fail — 标题不重要到需要报错
  }
}

/**
 * 生成对话摘要
 */
async function generateSummary(
  _conversationId: number,
  messages: Message[],
  _fullResponse: string
): Promise<void> {
  try {
    const textParts = messages.map((m) => `${m.role}: ${m.content.slice(0, 100)}`);
    const raw = textParts.join("\n").slice(0, 500);
    if (raw) {
      updateConversationSummary(_conversationId, raw);
    }
  } catch {
    // Silent fail
  }
}

/**
 * 对话结束后异步后处理：
 * - 提炼记忆
 * - 丰富联系人档案
 */
async function postProcessConversation(
  conversationId: number,
  mentorId: number,
  personIds: number[],
  messages: Message[],
  aiResponse: string,
  callbacks: HandleMessageCallbacks
): Promise<void> {
  // 记忆提炼
  if (aiResponse.length > 50) {
    try {
      const recentText = messages
        .slice(-4)
        .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
        .join("\n");

      const refinePrompt = buildRefinePrompt(recentText);
      const analysis = await analyze(refinePrompt, [
        { role: "user", content: `AI 的回复：${aiResponse.slice(0, 1000)}` },
      ]);

      // 解析 JSON 并存储记忆
      try {
        const parsed = JSON.parse(analysis);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let stored = 0;
          for (const item of parsed) {
            if (item.content) {
              storeMemory({
                source_conversation_id: conversationId,
                mentor_id: mentorId,
                content: item.content,
                category: item.category ?? "insight",
                entities: item.entities?.length ? item.entities : undefined,
                importance: item.importance ?? 5,
              });
              stored++;
            }
          }
          callbacks.onMemoryStored?.(stored);
        }
      } catch {
        // JSON 解析失败 — 非结构化的提炼结果，静默丢弃
      }
    } catch {
      // API 调用失败 — 不影响主流程
    }
  }

  // 联系人档案丰富（简化版：将 AI 回复中含有联系人名的分析追加到档案）
  // 完整版需要调 DeepSeek 做专门分析，MVP 阶段简化处理
  /*
  for (const personId of personIds) {
    // placeholder for enrichProfile
  }
  */
}
