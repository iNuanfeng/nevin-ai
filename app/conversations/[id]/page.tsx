"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Image, MoreHorizontal, Brain, Globe } from "lucide-react";
import MessageBubble, { TypingIndicator, type MessageData } from "@/components/MessageBubble";
import PersonSelector, { type PersonOption } from "@/components/PersonSelector";

const MENTOR_GRADIENTS: Record<string, string> = {
  life_manager: "linear-gradient(135deg,#667eea,#764ba2)",
  workplace: "linear-gradient(135deg,#f093fb,#f5576c)",
  romance: "linear-gradient(135deg,#ff9a9e,#fad0c4)",
  family: "linear-gradient(135deg,#a8edea,#fed6e3)",
  photography: "linear-gradient(135deg,#ffecd2,#fcb69f)",
  growth: "linear-gradient(135deg,#89f7fe,#66a6ff)",
};

const CATEGORY_ICONS: Record<string, string> = {
  life_manager: "⭐", workplace: "💼", romance: "❤️",
  family: "👨‍👩‍👧", photography: "📷", growth: "🌱",
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [mentor, setMentor] = useState<any>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamReasoning, setStreamReasoning] = useState("");
  const [showReasoning, setShowReasoning] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [allPersons, setAllPersons] = useState<PersonOption[]>([]);
  const [showPersonSelector, setShowPersonSelector] = useState(false);
  const [selectorSelectedIds, setSelectorSelectedIds] = useState<number[]>([]);
  const [deepThink, setDeepThink] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [titleGenerated, setTitleGenerated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        // For now just show the URL as a message
        setInputText(prev => prev + ` [图片](${data.url}) `);
      }
    } catch {}
    e.target.value = "";
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── Load data ──
  useEffect(() => {
    const load = async () => {
      try {
        const [convRes, mentRes, cpRes, perRes] = await Promise.all([
          fetch(`/api/conversations/${conversationId}`),
          fetch("/api/mentors"),
          fetch(`/api/conversation-persons?conversationId=${conversationId}`),
          fetch("/api/persons"),
        ]);
        const convData = await convRes.json();
        const mentData = await mentRes.json();
        const cpData = await cpRes.json();
        const perData = await perRes.json();

        setConversation(convData.conversation);
        setMessages(convData.messages || []);

        const m = (mentData.mentors || []).find((m: any) => m.id === convData.conversation?.mentor_id);
        setMentor(m);
        setMentors(mentData.mentors || []);
        setContacts(cpData.persons || []);
        setAllPersons((perData.persons || []).map((p: any) => ({ id: p.id, name: p.name, relationship: p.relationship })));
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    load();
  }, [conversationId]);

  useEffect(() => { scrollToBottom(); }, [messages, streamContent]);

  // ── Auto-resize textarea ──
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + "px";
    }
  }, [inputText]);

  // ── Send message with SSE streaming ──
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || streaming) return;

    // Optimistic user message
    const tempMsg: MessageData = {
      id: Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");
    setStreaming(true);
    setStreamContent("");
    setStreamReasoning("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: text, model: deepThink ? "deepseek-reasoner" : undefined }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let currentEvent = "chunk";
      let reasoningContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Track SSE event type
          if (trimmed.startsWith("event: ")) {
            currentEvent = trimmed.slice(7).trim();
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));

              // Reasoning content
              if (currentEvent === "reasoning") {
                reasoningContent += json.content || "";
                setStreamReasoning(reasoningContent);
                continue;
              }

              // Normal content
              if (json.content) {
                fullContent += json.content;
                setStreamContent(fullContent);
              }

              // Done event
              if (json.conversationId && json.messageId) {
                setStreaming(false);
                setStreamContent("");
                const msgRes = await fetch(`/api/conversations/${conversationId}`);
                const msgData = await msgRes.json();
                setMessages(msgData.messages || []);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err: any) {
      setStreaming(false);
      setStreamContent("");
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `抱歉，出错了：${err.message}。请稍后再试。`,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  // ── Contacts management ──
  const handleOpenPersonSelector = async () => {
    setSelectorSelectedIds(contacts.map((c: any) => c.id));
    setShowPersonSelector(true);
  };

  const handleTogglePerson = (id: number) => {
    setSelectorSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmPersons = async () => {
    const currentIds = contacts.map((c: any) => c.id);
    const toAdd = selectorSelectedIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !selectorSelectedIds.includes(id));

    try {
      for (const id of toAdd) {
        await fetch("/api/conversation-persons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, personId: id }),
        });
      }
      for (const id of toRemove) {
        await fetch("/api/conversation-persons", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, personId: id }),
        });
      }
      const cpRes = await fetch(`/api/conversation-persons?conversationId=${conversationId}`);
      const cpData = await cpRes.json();
      setContacts(cpData.persons || []);
    } catch {}
    setShowPersonSelector(false);
  };

  const handleRemoveContact = async (personId: number) => {
    try {
      await fetch("/api/conversation-persons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, personId }),
      });
      setContacts((prev) => prev.filter((c: any) => c.id !== personId));
    } catch {}
  };

  // ── Handle Enter key ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white">
        <div className="flex gap-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col min-h-dvh bg-white w-full max-w-[430px] mx-auto sm:rounded-2xl sm:shadow-lg sm:my-3"
style={{
          transform: `translateX(${Math.min(swipeX > 0 ? swipeX : 0, 180)}px)`,
          transition: swipeX === 0 ? "transform 0.3s ease" : "none",
        }}
        onTouchStart={(e) => { swipeRef.current = { startX: e.touches[0].clientX }; setSwipeX(0); }}
        onTouchMove={(e) => {
          if (!swipeRef.current) return;
          const delta = e.touches[0].clientX - swipeRef.current.startX;
          if (delta > 0) setSwipeX(delta * 0.7);
        }}
        onTouchEnd={(e) => {
          if (!swipeRef.current) return;
          const delta = e.changedTouches[0].clientX - swipeRef.current.startX;
          if (delta > 100) router.push("/");
          else setSwipeX(0);
          swipeRef.current = null;
        }}>
      {/* Chat header */}
      <header className="flex items-center gap-2.5 px-4 py-2 border-b border-[#f0f0f0] flex-shrink-0">
        <button onClick={() => router.push("/")} className="text-[22px] text-[#333] border-none bg-transparent cursor-pointer p-0.5">
          <ArrowLeft size={22} />
        </button>
        <div
          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: mentor ? (MENTOR_GRADIENTS[mentor.category] || "#667eea") : "#667eea" }}
        >
          <span className="text-white text-sm">{mentor ? (CATEGORY_ICONS[mentor.category] || "💬") : "💬"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#1d1d1f]">{mentor?.name || "对话"}</div>
          <div className="text-[11px] text-[#8e8e93]">{mentor?.title || ""}</div>
        </div>
        <button onClick={handleOpenPersonSelector} className="text-[#666] border-none bg-transparent cursor-pointer p-1" title="添加联系人">
          <Plus size={20} />
                            <MoreHorizontal size={20} />
        </button>
      </header>

      {/* Contact tags */}
      <div className="flex gap-1.5 px-4 py-1.5 pb-1 border-b border-[#f0f0f0] flex-wrap flex-shrink-0">
        {contacts.map((c: any) => (
          <div key={c.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[#e8e8ed]">
            {c.name}
            <button onClick={() => handleRemoveContact(c.id)} className="w-3.5 h-3.5 rounded-full bg-[#e8e8ed] flex items-center justify-center text-[10px] text-[#8e8e93] cursor-pointer border-none p-0">
              ×
            </button>
          </div>
        ))}
        <button
          onClick={handleOpenPersonSelector}
          className="text-xs text-[#8e8e93] border border-dashed border-[#c7c7cc] rounded-full px-2.5 py-1 bg-transparent cursor-pointer"
        >
          + 添加联系人
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streamReasoning && (
          <div className="self-start max-w-[85%]">
            <div
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-[11px] text-[#8e8e93] bg-[#f2f3f5] px-3 py-1 rounded-t-lg cursor-pointer select-none flex items-center gap-1"
            >
              <span className="font-medium">{showReasoning ? "▼" : "▶"}</span>
              深度思考过程
            </div>
            {showReasoning && (
              <div className="text-[12px] text-[#666] bg-[#f8f9fb] px-3 py-2 leading-relaxed border-t border-[#e8e8ed] rounded-b-lg whitespace-pre-wrap">
                {streamReasoning}
              </div>
            )}
          </div>
        )}
        {streaming && <MessageBubble message={{ id: 0, role: "assistant", content: streamContent || " ", created_at: "" }} />}
        {streaming && !streamContent && !streamReasoning && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Toggle row */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[#f0f0f0] flex-shrink-0 bg-white">
        <button onClick={() => setDeepThink(!deepThink)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border-none transition-colors ${
            deepThink ? "bg-[#1d1d1f] text-white" : "bg-[#f2f3f5] text-[#555]"
          }`}>
          <Brain size={13} />
          深度思考
        </button>
        <button onClick={() => { 
            const d = document.createElement("div");
            d.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md text-white px-4 py-3 rounded-xl text-sm z-30 toast";
            d.textContent = "联网搜索功能即将推出";
            document.body.appendChild(d);
            setTimeout(() => d.remove(), 2000);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border-none bg-[#f2f3f5] text-[#555]">
          <Globe size={13} />
          联网搜索
        </button>
        <span className="text-[10px] text-[#aeaeb2] ml-auto">当前对话有效</span>
      </div>
      {/* Input area */}
      <div className="flex items-end gap-2 px-3 py-2 pb-3 border-t border-[#f0f0f0] flex-shrink-0 bg-white">
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()} className="w-[34px] h-[34px] rounded-full bg-[#f2f3f5] flex items-center justify-center border-none cursor-pointer flex-shrink-0">
          <Image size={18} className="text-[#666]" />
        </button>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息…"
          rows={1}
          className="flex-1 border-none bg-[#f2f3f5] rounded-[20px] px-3.5 py-2 text-sm font-inherit resize-none outline-none min-h-[36px] max-h-[100px]"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || streaming}
          className="w-[36px] h-[36px] rounded-full bg-[#007aff] text-white flex items-center justify-center border-none cursor-pointer flex-shrink-0 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Person Selector */}
      <PersonSelector
        persons={allPersons}
        selectedIds={selectorSelectedIds}
        open={showPersonSelector}
        onClose={() => setShowPersonSelector(false)}
        onToggle={handleTogglePerson}
        onConfirm={handleConfirmPersons}
      />
    </div>
      {swipeX > 0 && (
        <div className="fixed inset-0 bg-black pointer-events-none" style={{ opacity: Math.min(swipeX / 300, 0.3) }} />
      )}
    </>
  );
}
