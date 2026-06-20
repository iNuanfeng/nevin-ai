import { ChatMessage, chatStream, analyze } from "@/lib/deepseek";
import { analyzeUploadedImages } from "@/lib/image-service";
import { buildImageContextBlock, parseMessageImages, type ImageAttachment } from "@/lib/image-utils";
import { formatWebSearchForPrompt, searchWeb } from "@/lib/web-search";
import { getServerDateTimeContext, isDateTimeQuery } from "@/lib/datetime-context";
import { getProfile, appendCollectedInfo } from "@/lib/profile-service";
import { getMentorById, Mentor } from "@/lib/mentor-service";
import { getPersonsByConversation } from "@/lib/person-service";
import { retrieveRelevant, storeMemory, buildRefinePrompt, parseRefinedMemories } from "@/lib/memory-service";
import {
  getConversationById,
  getMessagesPage,
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
  model?: string;
  webSearch?: boolean;
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
  onReasoningChunk?: (text: string) => void;
  onWebSearchStart?: () => void;
  onWebSearchComplete?: (count: number) => void;
  onError: (error: Error) => void;
}

const MAX_CONTEXT_MESSAGES = 20;

/**
 * 构建 System Prompt
 * 包含：用户档案 + 导师提示词 + 人设定制 + 联系人档案 + 历史记忆
 */
function buildSystemPrompt(
  profile: {
    name: string | null;
    background: string | null;
    values: string | null;
    personality: string | null;
    life_goals: string | null;
    habits: string | null;
    collected_info: string | null;
  },
  mentor: Mentor,
  persons: Array<{ name: string; relationship: string | null; background: string | null; personality_notes: string | null; relationship_dynamics: string | null; recent_status: string | null; strategy_notes: string | null }>,
  memories: Array<{ content: string; importance: number; category: string | null }>
): string {
  const lines: string[] = [];

  // 导师人设
  lines.push(`你是一个${mentor.title}，名叫${mentor.name}。`);
  lines.push(mentor.system_prompt);

  // 用户档案
  lines.push("");
  lines.push("【关于用户】");
  if (profile.name) lines.push(`姓名：${profile.name}`);
  if (profile.background) lines.push(`背景：${profile.background}`);
  if (profile.values) lines.push(`价值观：${profile.values}`);
  if (profile.personality) lines.push(`性格：${profile.personality}`);
  if (profile.life_goals) lines.push(`当前目标：${profile.life_goals}`);
  if (profile.habits) lines.push(`习惯：${profile.habits}`);
  if (profile.collected_info) {
    lines.push("");
    lines.push("信息收集（对话中积累的关于你的事实，含手动整理）：");
    lines.push(profile.collected_info);
  }

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
  lines.push("【当前时间】");
  lines.push(`服务器时间：${getServerDateTimeContext()}`);
  lines.push("回答涉及「今天、现在、日期、星期」等问题时，必须以上述服务器时间为准，不要猜测或使用训练数据中的旧日期。");

  lines.push("");
  lines.push("【对话上下文】");

  return lines.join("\n");
}

function formatMessageForAI(message: Message): ChatMessage {
  const role = message.role as "user" | "assistant";
  let content = message.content;
  if (role === "user") {
    const attachments = parseMessageImages(message.images);
    const imageBlock = buildImageContextBlock(attachments);
    if (imageBlock) {
      content = content.trim() ? `${content.trim()}\n\n${imageBlock}` : imageBlock;
    }
  }
  return { role, content };
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

    // 2. 分析并保存用户消息
    let analyzedImages: ImageAttachment[] = [];
    if (images && images.length > 0) {
      analyzedImages = await analyzeUploadedImages(images);
    }
    const displayContent = content.trim() || (analyzedImages.length > 0 ? "（图片）" : "");
    saveUserMessage(
      conversationId,
      displayContent,
      analyzedImages.length > 0 ? analyzedImages : undefined
    );

    // 3. 读取上下文
    const profile = getProfile();
    const mentor = getMentorById(conversation.mentor_id);
    if (!mentor) {
      throw new Error(`Mentor ${conversation.mentor_id} not found`);
    }

    const persons = getPersonsByConversation(conversationId);
    const personIds = persons.map((p) => p.id);

    // 4. 检索记忆（跨导师共享，不按 mentor_id 过滤）
    const memoryQuery = [content, ...analyzedImages.map((img) => img.ocrText)].filter(Boolean).join("\n");
    let memories = retrieveRelevant(memoryQuery || content, { limit: 10 });
    if (/生日|出生|几号生|什么时候生/.test(content)) {
      const birthdayMemories = retrieveRelevant("生日", { limit: 5 });
      const seen = new Set(memories.map((m) => m.id));
      for (const m of birthdayMemories) {
        if (!seen.has(m.id)) memories.push(m);
      }
      memories = memories.slice(0, 10);
    }

    // 5. 获取最近上下文消息
    const recentMessages = getMessagesPage(conversationId, { limit: MAX_CONTEXT_MESSAGES }).items;

    // 6. 组装 System Prompt
    let systemPrompt = buildSystemPrompt(profile, mentor, persons, memories);

    if (input.webSearch && content.trim()) {
      callbacks.onWebSearchStart?.();
      try {
        const webResults = await searchWeb(content.trim());
        systemPrompt += `\n\n${formatWebSearchForPrompt(webResults)}`;
        callbacks.onWebSearchComplete?.(webResults.length);
      } catch (err) {
        console.warn("[web-search] failed:", err instanceof Error ? err.message : err);
        const fallback = isDateTimeQuery(content)
          ? formatWebSearchForPrompt([
              {
                title: "服务器当前时间",
                url: "server://local-time",
                snippet: getServerDateTimeContext(),
              },
            ])
          : formatWebSearchForPrompt([], true);
        systemPrompt += `\n\n${fallback}`;
        callbacks.onWebSearchComplete?.(0);
      }
    }

    // 读取导师默认 model 配置
    let mentorConfig: { model?: string } = {};
    if (mentor.style_config) {
      try { mentorConfig = JSON.parse(mentor.style_config); } catch {}
    }
    // 前端开关显式传 model 时以用户选择为准；未传时回退导师默认
    const defaultModel = mentorConfig.model || "deepseek-chat";
    const activeModel = input.model ?? defaultModel;
    const useReasoner = activeModel === "deepseek-reasoner";
    // 7. 组装消息列表（reasoner 不支持 system role）
    let deepseekMessages: ChatMessage[];
    if (useReasoner) {
      deepseekMessages = [
        { role: "user", content: systemPrompt },
        ...recentMessages.map(formatMessageForAI),
      ];
    } else {
      deepseekMessages = [
        { role: "system", content: systemPrompt },
        ...recentMessages.map(formatMessageForAI),
      ];
    }


    // 8. 调用 DeepSeek 流式（按模型选择 reasoner 或 chat）
    let fullResponse = "";
    let fullReasoning = "";
    const thinkingExtra = useReasoner ? {} : {};
    const streamModel = useReasoner ? "deepseek-reasoner" : "deepseek-chat";
    await chatStream(deepseekMessages, {
      onChunk: (text) => {
        fullResponse += text;
        callbacks.onChunk(text);
      },
      onReasoningChunk: (text) => {
        fullReasoning += text;
        callbacks.onReasoningChunk?.(text);
      },
      onDone: async (fullContent) => {
        fullResponse = fullContent;

        // 9. 保存 AI 回复
        const message = saveAssistantMessage(conversationId, fullContent);
        callbacks.onDone(message);

        // 10. 异步后处理
        if (!conversation.title) {
          generateTitle(conversationId, recentMessages, fullContent, mentor.name);
        }
        generateSummary(conversationId, recentMessages, fullContent);
        postProcessConversation(conversationId, mentor.id, personIds, recentMessages, fullContent, callbacks);
      },
      onError: (error) => {
        callbacks.onError(error);
      },
    }, thinkingExtra, streamModel);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError(error);
  }
}

// ── 异步后处理 ──

/**
 * AI 自动生成对话标题（触发时机：首轮 AI 回复后）
 */
async function generateTitle(conversationId: number, messages: Message[], aiResponse: string, mentorName: string): Promise<void> {
  try {
    const userMsg = messages.find(m => m.role === "user")?.content.slice(0, 200) || aiResponse.slice(0, 200);
    const title = await analyze(
      "Generate a concise 2-6 word Chinese title for this conversation. Output ONLY the title.",
      [{ role: "user", content: userMsg }]
    );
    const clean = title.trim();
    if (clean && clean.length > 1 && clean.length < 40) {
      updateConversationTitle(conversationId, clean);
    }
  } catch {
    // Silent fail
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
  const recentText = messages
    .slice(-6)
    .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
    .join("\n");
  const conversationText = recentText
    ? `${recentText}\nassistant: ${aiResponse.slice(0, 1000)}`
    : `assistant: ${aiResponse.slice(0, 1000)}`;

  const userTurn = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const shouldRefine =
    conversationText.trim().length > 15 &&
    (aiResponse.length > 15 || /生日|出生|名字|我叫|我姓|年龄|工作|住在|电话|邮箱/.test(userTurn));

  if (!shouldRefine) return;

  try {
    const analysis = await analyze(buildRefinePrompt(conversationText), [
      { role: "user", content: "请提炼上述对话中的长期记忆。" },
    ]);

    const parsed = parseRefinedMemories(analysis);
    if (parsed.length === 0) return;

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
        if (item.category === "personal_info") {
          appendCollectedInfo(item.content);
        }
        stored++;
      }
    }
    callbacks.onMemoryStored?.(stored);
  } catch {
    // API 调用失败 — 不影响主流程
  }
}
