"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, ChevronRight, RotateCcw } from "lucide-react";
import type { MentorStyleConfig } from "@/lib/mentor-service";
import { getDefaultSystemPrompt, getDefaultStyleConfig } from "@/lib/mentor-defaults";

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
    return {};
  }
}

function mentorSummary(m: Mentor): string {
  const config = parseStyleConfig(m.style_config);
  const preview = m.system_prompt.replace(/\s+/g, " ").trim();
  const short = preview.length > 40 ? `${preview.slice(0, 40)}…` : preview;
  const parts = [short || "默认人设"];
  if (config.model === "deepseek-reasoner") parts.push("深度思考");
  return parts.join(" · ");
}

function buildPromptForEdit(m: Mentor): string {
  const config = parseStyleConfig(m.style_config);
  const style = config.style?.trim();
  if (style && !m.system_prompt.includes(style)) {
    return `${m.system_prompt}\n\n${style}`;
  }
  return m.system_prompt;
}

export default function MentorSettingsView() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [systemPromptText, setSystemPromptText] = useState("");
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
    setSystemPromptText(buildPromptForEdit(m));
    setDeepThink(config.model === "deepseek-reasoner");
  };

  const handleReset = (m: Mentor) => {
    const defaultPrompt = getDefaultSystemPrompt(m.category);
    if (defaultPrompt) setSystemPromptText(defaultPrompt);

    const defaultConfig = getDefaultStyleConfig(m.category);
    if (defaultConfig) {
      try {
        const parsed = JSON.parse(defaultConfig) as MentorStyleConfig;
        setDeepThink(parsed.model === "deepseek-reasoner");
      } catch {}
    }
  };

  const handleSave = async (id: number) => {
    const trimmed = systemPromptText.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const styleConfig: MentorStyleConfig = {
        model: deepThink ? "deepseek-reasoner" : "deepseek-chat",
      };
      await fetch(`/api/mentors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_prompt: trimmed,
          style_config: styleConfig,
        }),
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
                  {mentorSummary(m)}
                </div>
              </div>
              <ChevronRight size={16} className="text-[#c7c7cc] flex-shrink-0" />
            </div>

            {expandedId === m.id && (
              <div className="px-5 py-3 bg-[#fafafa]">
                <div className="text-[15px] font-semibold mb-1">
                  编辑 {m.name} 人设
                </div>
                <div className="text-[12px] text-[#8e8e93] mb-3 leading-relaxed">
                  以下内容会作为该导师的核心人设发给 AI，保存后下一条消息即生效。
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

                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-[#1d1d1f]">完整人设</div>
                  <button
                    type="button"
                    onClick={() => handleReset(m)}
                    className="inline-flex items-center gap-1 text-[12px] text-[#007aff] bg-transparent border-none cursor-pointer p-0"
                  >
                    <RotateCcw size={12} />
                    恢复默认
                  </button>
                </div>
                <textarea
                  value={systemPromptText}
                  onChange={(e) => setSystemPromptText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#e8e8ed] text-sm font-inherit resize-vertical min-h-[180px] outline-none focus:border-[#007aff] bg-white leading-relaxed"
                />
                <button
                  onClick={() => handleSave(m.id)}
                  disabled={saving || !systemPromptText.trim()}
                  className="mt-2.5 px-5 py-2 rounded-xl bg-[#007aff] text-white text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? "保存中…" : "保存设置"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
