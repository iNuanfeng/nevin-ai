"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export interface ConversationItemData {
  id: number;
  mentor_id: number;
  mentor_name: string;
  mentor_title: string;
  mentor_category: string;
  title: string | null;
  summary: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

const MENTOR_GRADIENTS: Record<string, string> = {
  life_manager: "linear-gradient(135deg,#667eea,#764ba2)",
  workplace: "linear-gradient(135deg,#f093fb,#f5576c)",
  romance: "linear-gradient(135deg,#ff9a9e,#fad0c4)",
  family: "linear-gradient(135deg,#a8edea,#fed6e3)",
  photography: "linear-gradient(135deg,#ffecd2,#fcb69f)",
  growth: "linear-gradient(135deg,#89f7fe,#66a6ff)",
};

const CATEGORY_ICONS: Record<string, string> = {
  life_manager: "⭐",
  workplace: "💼",
  romance: "❤️",
  family: "👨‍👩‍👧",
  photography: "📷",
  growth: "🌱",
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时前`;
  if (diffHr < 48) return "昨天";
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function getPreview(msg: string | null): string {
  if (!msg) return "";
  return msg.length > 50 ? msg.slice(0, 50) + "…" : msg;
}

export default function ConversationList({
  conversations,
  onDelete,
}: {
  conversations: ConversationItemData[];
  onDelete: (id: number) => void;
}) {
  const router = useRouter();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f2f3f5] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#aeaeb2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p className="text-[#8e8e93] text-sm">还没有对话</p>
        <p className="text-[#aeaeb2] text-xs mt-1">点击右下角 + 开始吧</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {conversations.map((conv) => (
        <div key={conv.id} className="relative group">
          <div
            onClick={() => router.push(`/conversations/${conv.id}`)}
            className="flex gap-3 px-5 py-3 cursor-pointer transition-colors active:bg-[#f2f3f5]"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: MENTOR_GRADIENTS[conv.mentor_category] || "#667eea" }}
            >
              <span className="text-white text-sm font-semibold">{CATEGORY_ICONS[conv.mentor_category] || "💬"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                  {conv.title || conv.mentor_name}
                </span>
                <span className="text-[11px] text-[#aeaeb2] flex-shrink-0 ml-1.5">
                  {formatTime(conv.last_message_at || conv.created_at)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-[#8e8e93] bg-[#f2f3f5] px-1.5 py-0.5 rounded font-medium">
                  {conv.mentor_name}
                </span>
              </div>
              <div className="text-[13px] text-[#8e8e93] truncate mt-0.5">
                {getPreview(conv.last_message || "")}
              </div>
            </div>
          </div>
          {/* Delete button - shown on hover for desktop, always tappable */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#ff3b30]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
          >
            <Trash2 size={14} className="text-[#ff3b30]" />
          </button>
        </div>
      ))}
    </div>
  );
}
