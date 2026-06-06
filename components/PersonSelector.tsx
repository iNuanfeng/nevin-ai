"use client";

import { X, Check } from "lucide-react";

export interface PersonOption {
  id: number;
  name: string;
  relationship: string | null;
}

const REL_COLORS: Record<string, string> = {
  colleague: "linear-gradient(135deg,#667eea,#764ba2)",
  romance: "linear-gradient(135deg,#ff9a9e,#fad0c4)",
  family: "linear-gradient(135deg,#a8edea,#fed6e3)",
  friend: "linear-gradient(135deg,#ffecd2,#fcb69f)",
};

const REL_BADGE: Record<string, string> = {
  colleague: "bg-[#e8f4ff] text-[#007aff]",
  romance: "bg-[#fff0f0] text-[#ff3b30]",
  family: "bg-[#f0fff4] text-[#34c759]",
  friend: "bg-[#fff8e8] text-[#ff9500]",
};

export default function PersonSelector({
  persons,
  selectedIds,
  open,
  onClose,
  onToggle,
  onConfirm,
}: {
  persons: PersonOption[];
  selectedIds: number[];
  open: boolean;
  onClose: () => void;
  onToggle: (id: number) => void;
  onConfirm: () => void;
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
        <div className="text-[16px] font-semibold mb-3.5 text-[#1d1d1f]">添加联系人</div>

        <div className="max-h-[300px] overflow-y-auto">
          {persons.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => onToggle(p.id)}
                className="flex items-center gap-2.5 py-2.5 border-b border-[#f5f5f5] cursor-pointer"
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  checked ? "bg-[#007aff] border-[#007aff]" : "border-[#c7c7cc]"
                }`}>
                  {checked && <Check size={12} className="text-white font-bold" />}
                </div>
                <div
                  className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-sm flex-shrink-0 text-white font-semibold"
                  style={{ background: REL_COLORS[p.relationship || "friend"] || "#e8e8ed" }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-[#1d1d1f]">{p.name}</div>
                  {p.relationship && (
                    <span className="text-[11px] text-[#8e8e93]">{p.relationship}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {persons.length === 0 && (
          <div className="text-center py-8 text-[#aeaeb2] text-sm">
            还没有联系人，先去通讯录添加吧
          </div>
        )}

        {persons.length > 0 && (
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-xl bg-[#007aff] text-white text-[15px] font-semibold border-none cursor-pointer mt-3"
          >
            确认添加 ({selectedIds.length})
          </button>
        )}
      </div>
    </>
  );
}
