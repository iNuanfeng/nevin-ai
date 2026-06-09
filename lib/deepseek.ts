export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onReasoningChunk?: (text: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: Error) => void;
}

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
  return key;
}

function parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  callbacks: StreamCallbacks
): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    let fullContent = "";
    let fullReasoning = "";

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]" || trimmed === "event: done") continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta;
                if (delta?.reasoning_content) {
                  fullReasoning += delta.reasoning_content;
                  callbacks.onReasoningChunk?.(delta.reasoning_content);
                }
                if (delta?.content) {
                  fullContent += delta.content;
                  callbacks.onChunk(delta.content);
                }
              } catch { /* skip malformed lines */ }
            }
          }
        }
        // Flush remaining buffer
        if (buffer.trim() && !buffer.trim().startsWith("data: [DONE]")) {
          try {
            const json = JSON.parse(buffer.trim().replace(/^data: /, ""));
            const delta = json.choices?.[0]?.delta;
            if (delta?.reasoning_content) {
              fullReasoning += delta.reasoning_content;
              callbacks.onReasoningChunk?.(delta.reasoning_content);
            }
            if (delta?.content) {
              fullContent += delta.content;
              callbacks.onChunk(delta.content);
            }
          } catch { /* ignore */ }
        }
        resolve(fullContent);
      } catch (err) {
        reject(err);
      }
    };
    pump();
  });
}

async function streamRequest(
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const apiKey = getApiKey();
  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
      max_tokens: 4096,
    };
    if (!model.includes("reasoner")) {
      body.temperature = 0.7;
    }
    Object.assign(body, extra);

    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown error");
      throw new Error(`DeepSeek error (${response.status}): ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    await parseSSE(reader, decoder, callbacks);
    callbacks.onDone("");
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError(error);
  }
}

export async function chatStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  return streamRequest("deepseek-chat", messages, callbacks);
}

export async function reasonerStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  return streamRequest("deepseek-reasoner", messages, callbacks);
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function analyze(
  systemPrompt: string,
  messages: DeepSeekMessage[],
  options?: { model?: string }
): Promise<string> {
  const apiKey = getApiKey();
  const model = options?.model ?? "deepseek-chat";

  const response = await fetch(DEEPSEEK_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
      temperature: model.includes("reasoner") ? undefined : 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown error");
    throw new Error(`DeepSeek analyze error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message;
  return choice?.reasoning_content
    ? `${choice.reasoning_content}\n\n---\n\n${choice.content}`
    : choice?.content ?? "";
}
