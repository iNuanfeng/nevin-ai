export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string }; // data:image/jpeg;base64,...
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: Error) => void;
}

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }
  return key;
}

/**
 * DeepSeek 流式对话。
 * 通过 SSE 解析逐 token 回调 onChunk，流结束后回调 onDone。
 */
export async function chatStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getApiKey();

  try {
    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown error");
      throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;

        // SSE data: prefix
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              callbacks.onChunk(delta.content);
            }
          } catch {
            // Skip malformed JSON lines (common in SSE parsing)
          }
        }
      }
    }

    // Flush remaining buffer
    if (buffer.trim() && !buffer.trim().startsWith("data: [DONE]")) {
      try {
        const json = JSON.parse(buffer.trim().replace(/^data: /, ""));
        const delta = json.choices?.[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          callbacks.onChunk(delta.content);
        }
      } catch {
        // Ignore
      }
    }

    callbacks.onDone(fullContent);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError(error);
  }
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 非流式分析调用（用于记忆提炼、联系人档案丰富等后台任务）。
 * 使用低温度（0.3）以获得更稳定的输出。
 */
export async function analyze(
  systemPrompt: string,
  messages: DeepSeekMessage[]
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown error");
    throw new Error(`DeepSeek analyze error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
