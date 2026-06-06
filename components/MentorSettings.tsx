"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight } from "lucide-react";

interface Mentor {
  id: number;
  name: string;
  title: string;
  description: string;
  system_prompt: string;
  style_config: string | null;
  category: string;
  sort_order: number;
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
  life_manager: "⭐", workplace: "💼", romance: "❤️",
  family: "👨‍👩‍👧", photography: "📷", growth: "🌱",
};

export default function MentorSettingsView() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [styleText, setStyleText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mentors");
      const data = await res.json();
      setMentors(data.mentors || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExpand = (m: Mentor) => {
    if (expandedId === m.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(m.id);
    try {
      const config = m.style_config ? JSON.parse(m.style_config) : {};
      setStyleText(config.style || config.tone || "");
    } catch {
      setStyleText(m.style_config || "");
    }
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const styleConfig = { style: styleText, tone: "custom" };
      await fetch(`/api/mentors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style_config: styleConfig }),
      });
      await load();
      setExpandedId(null);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="py-2">
        {mentors.map((m) => (
          <div key={m.id}>
            <div
              onClick={() => handleExpand(m)}
              className="flex items-center gap-3 px-5 py-3.5 cursor-pointer border-b border-[#f5f5f5] active:bg-[#f8f8fa]"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: MENTOR_GRADIENTS[m.category] || "#667eea" }}
              >
                <span className="text-white text-sm">{CATEGORY_ICONS[m.category] || "💬"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-[#1d1d1f]">{m.name}</div>
                <div className="text-[12px] text-[#8e8e93] truncate mt-0.5">
                  {m.style_config
                    ? (() => {
                        try {
                          const c = JSON.parse(m.style_config);
                          return c.style || "默认风格";
                        } catch {
                          return m.style_config;
                        }
                      })()
                    : "默认风格 — 点击定制"}
                </div>
              </div>
              <ChevronRight size={16} className="text-[#c7c7cc] flex-shrink-0" />
            </div>

            {expandedId === m.id && (
              <div className="px-5 py-3 bg-[#fafafa]">
                <div className="text-[15px] font-semibold mb-2">
                  定制 {m.name} 的风格
                </div>
                <div className="text-[12px] text-[#8e8e93] mb-2.5 leading-relaxed">
                  描述你希望 {m.name} 以什么风格与你对话。例如："风趣幽默，像一位老朋友"，"理性冷静，直击重点"
                </div>
                <textarea
                  value={styleText}
                  onChange={(e) => setStyleText(e.target.value)}
                  placeholder="例如：像童锦程一样风趣，说话带点撩…"
                  className="w-full p-3 rounded-xl border border-[#e8e8ed] text-sm font-inherit resize-vertical min-h-[80px] outline-none focus:border-[#007aff] bg-white"
                />
                <button
                  onClick={() => handleSave(m.id)}
                  disabled={saving}
                  className="mt-2.5 px-5 py-2 rounded-xl bg-[#007aff] text-white text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? "保存中…" : "保存风格"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
