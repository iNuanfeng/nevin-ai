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
  const [contacts, setContacts] = useState<any[]>([]);
  const [allPersons, setAllPersons] = useState<PersonOption[]>([]);
  const [showPersonSelector, setShowPersonSelector] = useState(false);
  const [selectorSelectedIds, setSelectorSelectedIds] = useState<number[]>([]);
  const [deepThink, setDeepThink] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [titleGenerated, setTitleGenerated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number } | null>(null);
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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: text }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
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
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("event: chunk")) {
            // Next line has the data
            continue;
          }
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.content) {
                fullContent += json.content;
                setStreamContent(fullContent);
              }
              if (json.conversationId && json.messageId) {
                // done event
                setStreaming(false);
                setStreamContent("");
                // Reload messages to get the saved assistant message
                const msgRes = await fetch(`/api/conversations/${conversationId}`);
                const msgData = await msgRes.json();
                setMessages(msgData.messages || []);
              }
            } catch {
              // Might be JSON with special chars, skip
            }
          }
          if (trimmed === "event: done") continue;
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
    <div className="flex flex-col min-h-dvh bg-white w-full max-w-[430px] mx-auto sm:rounded-2xl sm:shadow-lg sm:my-3"
    onTouchStart={(e) => { swipeRef.current = { startX: e.touches[0].clientX }; }}
    onTouchEnd={(e) => {
      if (!swipeRef.current) return;
      const delta = e.changedTouches[0].clientX - swipeRef.current.startX;
      if (delta > 80) router.push("/");
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
        {streaming && <MessageBubble message={{ id: 0, role: "assistant", content: streamContent || " ", created_at: "" }} />}
        {streaming && !streamContent && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Toggle area */}
      {(deepThink || webSearch) && (
        <div className="flex items-center gap-1.5 px-3 py-1 border-t border-[#f0f0f0] flex-shrink-0 bg-white">
          {deepThink && <span className="text-[11px] text-[#8e8e93] bg-[#f2f3f5] px-2 py-0.5 rounded-full">深度思考已开启</span>}
          {webSearch && <span className="text-[11px] text-[#8e8e93] bg-[#f2f3f5] px-2 py-0.5 rounded-full">联网搜索已开启</span>}
        </div>
      )}
      {/* Input area */}
      <div className="flex items-end gap-2 px-3 py-2 pb-3 border-t border-[#f0f0f0] flex-shrink-0 bg-white">
        <button onClick={() => setDeepThink(!deepThink)} className={`w-[34px] h-[34px] rounded-full flex items-center justify-center border-none cursor-pointer flex-shrink-0 ${deepThink ? "bg-[#1d1d1f] text-white" : "bg-[#f2f3f5] text-[#666]"}`} title="深度思考">
          <Brain size={18} />
        </button>
        <button onClick={() => setWebSearch(!webSearch)} className={`w-[34px] h-[34px] rounded-full flex items-center justify-center border-none cursor-pointer flex-shrink-0 ${webSearch ? "bg-[#007aff] text-white" : "bg-[#f2f3f5] text-[#666]"}`} title="联网搜索">
          <Globe size={18} />
        </button>
        <button className="w-[34px] h-[34px] rounded-full bg-[#f2f3f5] flex items-center justify-center border-none cursor-pointer flex-shrink-0">
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
  );
}
