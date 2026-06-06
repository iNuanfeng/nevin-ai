"use client";

import { X } from "lucide-react";

export interface MentorOption {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
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

export default function MentorPicker({
  mentors,
  open,
  onClose,
  onSelect,
}: {
  mentors: MentorOption[];
  open: boolean;
  onClose: () => void;
  onSelect: (mentor: MentorOption) => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-20" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-[0_-4px_30px_rgba(0,0,0,0.12)] z-25 p-4 pb-7.5 max-h-[70vh] overflow-y-auto bottom-sheet-anim">
        <div className="w-9 h-1 rounded bg-[#e8e8ed] mx-auto mb-3" />
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8e8e93] border-none bg-transparent cursor-pointer p-1">
          <X size={20} />
        </button>
        <div className="text-[16px] font-semibold mb-3.5 text-[#1d1d1f]">选择导师</div>
        <div className="grid grid-cols-2 gap-2.5">
          {mentors.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-[#f0f0f0] cursor-pointer transition-colors"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: MENTOR_GRADIENTS[m.category] || "#667eea" }}
              >
                <span className="text-white">{CATEGORY_ICONS[m.category] || "💬"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1d1d1f]">{m.name}</div>
                <div className="text-[11px] text-[#8e8e93] truncate">{m.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
