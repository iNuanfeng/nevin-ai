"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, Image as ImageIcon, MoreHorizontal, Brain, Globe } from "lucide-react";
import MessageBubble, { TypingIndicator, type MessageData } from "@/components/MessageBubble";
import PersonSelector, { type PersonOption } from "@/components/PersonSelector";
import { MESSAGE_PRELOAD_REMAINING } from "@/lib/chat-constants";
import { MENTOR_GRADIENTS, CATEGORY_ICONS } from "@/lib/mentor-ui";
import ImageThumbStrip from "@/components/ImageThumbStrip";

const ENABLE_IMAGE_UPLOAD = false;
const ENABLE_WEB_SEARCH = false;

function mentorPrefersReasoner(mentor: { style_config?: string | null } | null): boolean {
  if (!mentor?.style_config) return false;
  try {
    const config = JSON.parse(mentor.style_config);
    return config.model === "deepseek-reasoner";
  } catch {
    return false;
  }
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [totalMessageCount, setTotalMessageCount] = useState(0);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [mentor, setMentor] = useState<any>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamReasoning, setStreamReasoning] = useState("");
  const [showReasoning, setShowReasoning] = useState(true);
  const [reasoningPhase, setReasoningPhase] = useState<"idle" | "thinking" | "done">("idle");
  const [contacts, setContacts] = useState<any[]>([]);
  const [allPersons, setAllPersons] = useState<PersonOption[]>([]);
  const [showPersonSelector, setShowPersonSelector] = useState(false);
  const [selectorSelectedIds, setSelectorSelectedIds] = useState<number[]>([]);
  const [deepThink, setDeepThink] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [searchPhase, setSearchPhase] = useState<"idle" | "searching" | "done">("idle");
  const [pendingImages, setPendingImages] = useState<Array<{ id: string; url: string }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [titleGenerated, setTitleGenerated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<MessageData[]>([]);
  const preloadAnchorRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  const hasMoreRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const swipeRef = useRef<{ startX: number; startY: number; axis: "x" | "y" | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const imeEnterRef = useRef(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingImage) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setPendingImages((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, url: data.url }]);
      }
    } catch {}
    setUploadingImage(false);
    e.target.value = "";
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  messagesRef.current = messages;
  hasMoreRef.current = hasMoreMessages;

  function isServerMessageId(id: number): boolean {
    return Number.isFinite(id) && id > 0 && id < 1_000_000_000_000;
  }

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreRef.current) return;
    const oldest = messagesRef.current.find((m) => isServerMessageId(m.id));
    if (!oldest) return;

    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);
    const container = messagesScrollRef.current;
    const prevHeight = container?.scrollHeight ?? 0;

    try {
      const res = await fetch(
        `/api/conversations/${conversationId}?limit=10&before=${oldest.id}`
      );
      const data = await res.json();
      const older: MessageData[] = data.messages || [];
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
      setHasMoreMessages(Boolean(data.hasMore));
      if (typeof data.totalCount === "number") {
        setTotalMessageCount(data.totalCount);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevHeight;
          }
        });
      });
    } catch {
      // keep current messages
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [conversationId]);

  const preloadAnchorIndex = Math.max(0, Math.min(MESSAGE_PRELOAD_REMAINING - 1, messages.length - 1));

  useEffect(() => {
    if (!hasMoreMessages || loadingOlderMessages) return;
    const root = messagesScrollRef.current;
    const target = preloadAnchorRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadOlderMessages();
        }
      },
      { root, rootMargin: "240px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreMessages, loadingOlderMessages, loadOlderMessages, messages.length, preloadAnchorIndex]);

  // ── Load data ──
  useEffect(() => {
    initialScrollDoneRef.current = false;
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
        setHasMoreMessages(Boolean(convData.hasMore));
        setTotalMessageCount(convData.totalCount ?? (convData.messages?.length ?? 0));

        const m = (mentData.mentors || []).find((m: any) => m.id === convData.conversation?.mentor_id);
        setMentor(m);
        setDeepThink(mentorPrefersReasoner(m));
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

  useEffect(() => {
    if (loading || initialScrollDoneRef.current) return;
    if (messages.length === 0) return;
    initialScrollDoneRef.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [loading, messages.length, scrollToBottom]);

  useEffect(() => {
    if (streaming || !initialScrollDoneRef.current) return;
    scrollToBottom();
  }, [streamContent, streamReasoning, streaming, scrollToBottom]);

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
    const imageUrls = pendingImages.map((img) => img.url);
    if ((!text && imageUrls.length === 0) || streaming) return;

    const tempId = Date.now();
    const tempMsg: MessageData = {
      id: tempId,
      role: "user",
      content: text || "（图片）",
      images: imageUrls.length > 0 ? JSON.stringify(imageUrls.map((url) => ({ url }))) : null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");
    setPendingImages([]);
    requestAnimationFrame(() => scrollToBottom("auto"));
    setStreaming(true);
    setStreamContent("");
    setStreamReasoning("");
    setShowReasoning(deepThink);
    setReasoningPhase("idle");
    setSearchPhase(webSearch ? "searching" : "idle");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: text,
          images: imageUrls.length > 0 ? imageUrls : undefined,
          model: deepThink ? "deepseek-reasoner" : "deepseek-chat",
          webSearch: webSearch || undefined,
        }),
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

              // Web search status
              if (currentEvent === "search") {
                if (json.status === "start") {
                  setSearchPhase("searching");
                } else if (json.status === "done") {
                  setSearchPhase("done");
                }
                continue;
              }

              // Reasoning content (streams before answer)
              if (currentEvent === "reasoning") {
                reasoningContent += json.content || "";
                setStreamReasoning(reasoningContent);
                setReasoningPhase("thinking");
                setShowReasoning(true);
                continue;
              }

              // Normal content (starts after reasoning)
              if (json.content) {
                setSearchPhase("idle");
                if (reasoningContent) {
                  setReasoningPhase("done");
                  setShowReasoning(false);
                }
                fullContent += json.content;
                setStreamContent(fullContent);
              }

              // Done event
              if (json.conversationId && json.messageId) {
                setStreaming(false);
                setStreamContent("");
                setStreamReasoning("");
                setReasoningPhase("idle");
                setSearchPhase("idle");
                setMessages((prev) => {
                  const userMsg = prev.find((m) => m.id === tempId);
                  const rest = prev.filter((m) => m.id !== tempId);
                  return [
                    ...rest,
                    ...(userMsg ? [userMsg] : []),
                    {
                      id: json.messageId,
                      role: "assistant" as const,
                      content: fullContent,
                      created_at: new Date().toISOString(),
                    },
                  ];
                });
                setTotalMessageCount((c) => c + 1);
                requestAnimationFrame(() => scrollToBottom("auto"));
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
      setSearchPhase("idle");
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
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    // 部分输入法按 Enter 确认选词时，keydown 会在 compositionend 之后触发
    imeEnterRef.current = true;
    setTimeout(() => {
      imeEnterRef.current = false;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing || isComposingRef.current || imeEnterRef.current) return;
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh max-h-dvh overflow-hidden bg-white">
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
    <div className="flex flex-col h-dvh max-h-dvh overflow-hidden bg-white w-full max-w-[430px] mx-auto sm:rounded-2xl sm:shadow-lg sm:h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-24px)] sm:my-3"
style={{
          transform: `translateX(${Math.min(swipeX > 0 ? swipeX : 0, 180)}px)`,
          transition: swipeX === 0 ? "transform 0.3s ease" : "none",
        }}
        onTouchStart={(e) => {
          swipeRef.current = {
            startX: e.touches[0].clientX,
            startY: e.touches[0].clientY,
            axis: null,
          };
          setSwipeX(0);
        }}
        onTouchMove={(e) => {
          if (!swipeRef.current) return;
          const deltaX = e.touches[0].clientX - swipeRef.current.startX;
          const deltaY = e.touches[0].clientY - swipeRef.current.startY;
          if (!swipeRef.current.axis) {
            if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
            swipeRef.current.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
          }
          if (swipeRef.current.axis === "x" && deltaX > 0) {
            setSwipeX(deltaX * 0.7);
          }
        }}
        onTouchEnd={(e) => {
          if (!swipeRef.current) return;
          const delta = e.changedTouches[0].clientX - swipeRef.current.startX;
          if (swipeRef.current.axis === "x" && delta > 100) router.push("/");
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

      {ENABLE_WEB_SEARCH && webSearch && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[#eef6ff] border-b border-[#d6e8ff] text-[11px] text-[#2563eb] flex-shrink-0">
          <Globe size={12} />
          联网搜索已开启，你的问题会发送到搜索引擎
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesScrollRef}
        className="app-scroll flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3"
      >
        {(hasMoreMessages || loadingOlderMessages) && (
          <div className="py-1 text-center text-[11px] text-[#aeaeb2]">
            {loadingOlderMessages
              ? "加载更早的消息…"
              : totalMessageCount > messages.length
                ? `还有 ${totalMessageCount - messages.length} 条，继续上滑加载`
                : "继续上滑加载更早消息"}
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={msg.id}>
            {hasMoreMessages && index === preloadAnchorIndex && (
              <div ref={preloadAnchorRef} className="h-px w-full" aria-hidden />
            )}
            <MessageBubble message={msg} />
          </div>
        ))}
        {streamReasoning && (
          <div className="self-start max-w-[85%] w-full">
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              className="w-full text-left text-[11px] text-[#8e8e93] bg-[#f2f3f5] px-3 py-1.5 rounded-t-lg cursor-pointer select-none flex items-center gap-1.5 border-none"
            >
              <span className="font-medium">{showReasoning ? "▼" : "▶"}</span>
              {reasoningPhase === "thinking" ? (
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-[#636366]">深度思考中</span>
                  <span className="flex gap-0.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                </span>
              ) : (
                <span className="font-medium text-[#636366]">已深度思考</span>
              )}
            </button>
            {showReasoning && (
              <div className="text-[12px] text-[#666] bg-[#f8f9fb] px-3 py-2 leading-relaxed border-t border-[#e8e8ed] rounded-b-lg whitespace-pre-wrap max-h-[240px] overflow-y-auto">
                {streamReasoning}
              </div>
            )}
          </div>
        )}
        {streaming && streamContent && (
          <MessageBubble message={{ id: 0, role: "assistant", content: streamContent, created_at: "" }} />
        )}
        {ENABLE_WEB_SEARCH && streaming && !streamContent && !streamReasoning && searchPhase === "searching" && (
          <div className="self-start text-[12px] text-[#2563eb] bg-[#eef6ff] px-3 py-2 rounded-lg flex items-center gap-2">
            <Globe size={14} />
            <span>正在联网搜索…</span>
            <span className="flex gap-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          </div>
        )}
        {streaming && !streamContent && !streamReasoning && (!ENABLE_WEB_SEARCH || searchPhase !== "searching") && <TypingIndicator />}
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
        {ENABLE_WEB_SEARCH && (
        <button onClick={() => setWebSearch(!webSearch)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border-none transition-colors ${
            webSearch ? "bg-[#2563eb] text-white" : "bg-[#f2f3f5] text-[#555]"
          }`}>
          <Globe size={13} />
          联网搜索
        </button>
        )}
        <span className="text-[10px] text-[#aeaeb2] ml-auto">当前对话有效</span>
      </div>
      {/* Input area */}
      <div className="flex flex-col gap-2 px-3 py-2 pb-3 border-t border-[#f0f0f0] flex-shrink-0 bg-white">
        {ENABLE_IMAGE_UPLOAD && pendingImages.length > 0 && (
          <ImageThumbStrip
            images={pendingImages.map((img) => img.url)}
            onRemove={(index) => setPendingImages((prev) => prev.filter((_, i) => i !== index))}
          />
        )}
        <div className="flex items-end gap-2">
        {ENABLE_IMAGE_UPLOAD && (
        <>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileSelect} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="w-[34px] h-[34px] rounded-full bg-[#f2f3f5] flex items-center justify-center border-none cursor-pointer flex-shrink-0 disabled:opacity-40"
        >
          <ImageIcon size={18} className="text-[#666]" />
        </button>
        </>
        )}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          placeholder={uploadingImage ? "图片上传中…" : "输入消息…"}
          rows={1}
          className="flex-1 border-none bg-[#f2f3f5] rounded-[20px] px-3.5 py-2 text-sm font-inherit resize-none outline-none min-h-[36px] max-h-[100px]"
        />
        <button
          onClick={handleSend}
          disabled={(!inputText.trim() && pendingImages.length === 0) || streaming || uploadingImage}
          className="w-[36px] h-[36px] rounded-full bg-[#007aff] text-white flex items-center justify-center border-none cursor-pointer flex-shrink-0 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
        </div>
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
