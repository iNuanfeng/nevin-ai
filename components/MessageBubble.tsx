"use client";

import MarkdownRenderer from "./MarkdownRenderer";

export interface MessageData {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  images?: string | null;
}

export default function MessageBubble({ message }: { message: MessageData }) {
  const isUser = message.role === "user";
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed relative ${
      isUser
        ? "bg-[#007aff] text-white self-end rounded-br-sm"
        : "bg-[#f2f3f5] text-[#1d1d1f] self-start rounded-bl-sm"
    }`}>
      {isUser ? (
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      ) : (
        <MarkdownRenderer content={message.content} />
      )}
      <div className={`text-[10px] mt-1 text-right ${
        isUser ? "text-white/50" : "text-[#aeaeb2]"
      }`}>
        {time}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="max-w-[80%] px-3.5 py-3 rounded-2xl bg-[#f2f3f5] self-start rounded-bl-sm">
      <div className="flex gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
