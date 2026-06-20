"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, ChevronRight } from "lucide-react";
import type { MentorStyleConfig } from "@/lib/mentor-service";

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

function parseStyleConfig(style_config: string | null): MentorStyleConfig {
  if (!style_config) return {};
  try {
    return JSON.parse(style_config) as MentorStyleConfig;
  } catch {
    return { style: style_config };
  }
}

function mentorSummary(config: MentorStyleConfig): string {
  const parts: string[] = [];
  if (config.style) parts.push(config.style);
  else parts.push("默认风格");
  if (config.model === "deepseek-reasoner") parts.push("深度思考");
  return parts.join(" · ");
}

export default function MentorSettingsView() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [styleText, setStyleText] = useState("");
  const [deepThink, setDeepThink] = useState(false);
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
    const config = parseStyleConfig(m.style_config);
    setExpandedId(m.id);
    setStyleText(config.style || "");
    setDeepThink(config.model === "deepseek-reasoner");
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      const mentor = mentors.find((m) => m.id === id);
      const existing = parseStyleConfig(mentor?.style_config ?? null);
      const styleConfig: MentorStyleConfig = {
        ...existing,
        style: styleText,
        tone: existing.tone || "custom",
        model: deepThink ? "deepseek-reasoner" : "deepseek-chat",
      };
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
        {mentors.map((m) => {
          const config = parseStyleConfig(m.style_config);
          return (
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
                  {m.style_config ? mentorSummary(config) : "默认风格 — 点击定制"}
                </div>
              </div>
              <ChevronRight size={16} className="text-[#c7c7cc] flex-shrink-0" />
            </div>

            {expandedId === m.id && (
              <div className="px-5 py-3 bg-[#fafafa]">
                <div className="text-[15px] font-semibold mb-2">
                  定制 {m.name}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Brain size={16} className="text-[#636366] flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-[#1d1d1f]">深度思考</div>
                        <div className="text-[11px] text-[#8e8e93] leading-snug mt-0.5">
                          开启后默认使用推理模型，进入对话时「深度思考」开关会默认打开
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={deepThink}
                      onClick={() => setDeepThink(!deepThink)}
                      className={`relative w-11 h-6 rounded-full border-none cursor-pointer flex-shrink-0 transition-colors ${
                        deepThink ? "bg-[#1d1d1f]" : "bg-[#e5e5ea]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          deepThink ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
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
                  {saving ? "保存中…" : "保存设置"}
                </button>
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}
