"use client";

import { X, Edit3 } from "lucide-react";

function pendingCount(raw: string | null | undefined): number {
  if (!raw?.trim()) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

interface PersonDetailProps {
  person: any;
  onClose: () => void;
  onEdit: () => void;
}

export default function PersonDetail({ person, onClose, onEdit }: PersonDetailProps) {
  const pending = pendingCount(person.pending_collected_info);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-20" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white w-[300px] rounded-2xl p-6 shadow-lg z-25 max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#8e8e93] border-none bg-transparent cursor-pointer p-1">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#00d4aa] flex items-center justify-center text-white font-semibold text-base">
            {(person.name || "?")[0]}
          </div>
          <div>
            <div className="text-[17px] font-bold">{person.name}</div>
            {person.relationship && <div className="text-[13px] text-[#8e8e93]">{person.relationship}</div>}
          </div>
        </div>
        <div className="space-y-3">
          {person.background && (
            <div>
              <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-0.5">背景</div>
              <div className="text-[13px] text-[#1d1d1f]">{person.background}</div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider">信息收集</div>
              {pending > 0 && (
                <span className="text-[10px] text-[#ff9500] font-medium">待整理 {pending}/10</span>
              )}
            </div>
            <div className="text-[13px] text-[#1d1d1f] whitespace-pre-wrap">
              {person.collected_info?.trim() || "（暂无，对话中关联 TA 后 AI 会自动积累）"}
            </div>
          </div>
          {person.personality_notes && (
            <div>
              <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-0.5">性格判断</div>
              <div className="text-[13px] text-[#1d1d1f]">{person.personality_notes}</div>
            </div>
          )}
          {person.relationship_dynamics && (
            <div>
              <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-0.5">关系动态</div>
              <div className="text-[13px] text-[#1d1d1f]">{person.relationship_dynamics}</div>
            </div>
          )}
          {person.recent_status && (
            <div>
              <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-0.5">最近动态</div>
              <div className="text-[13px] text-[#1d1d1f]">{person.recent_status}</div>
            </div>
          )}
          {person.strategy_notes && (
            <div>
              <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-0.5">策略笔记</div>
              <div className="text-[13px] text-[#1d1d1f]">{person.strategy_notes}</div>
            </div>
          )}
        </div>
        <div className="flex gap-2.5 mt-5">
          <button onClick={onEdit} className="flex-1 py-2.5 rounded-xl bg-[#007aff] text-white text-[14px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5">
            <Edit3 size={14} /> 编辑
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#f2f3f5] text-[#1d1d1f] text-[14px] font-semibold border-none cursor-pointer">
            关闭
          </button>
        </div>
      </div>
    </>
  );
}
