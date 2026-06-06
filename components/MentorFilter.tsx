"use client";

export interface MentorChip {
  id: number;
  name: string;
  category: string;
  isDefault?: boolean;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  all: "全部",
  life_manager: "⭐ 总管家",
  workplace: "💼 职场军师",
  romance: "❤️ 情场顾问",
  family: "👨‍👩‍👧 家庭调解师",
  photography: "📷 摄影导师",
  growth: "🌱 成长教练",
};

export default function MentorFilter({
  selected,
  onChange,
}: {
  selected: string | null;
  onChange: (category: string | null) => void;
}) {
  return (
    <div className="flex gap-1.5 px-5 py-1 pb-2.5 overflow-x-auto scrollbar-none">
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium cursor-pointer border-none transition-colors ${
          selected === null
            ? "bg-[#1d1d1f] text-white"
            : "bg-[#f2f3f5] text-[#555]"
        }`}
      >
        全部
      </button>
      {Object.entries(CATEGORY_EMOJIS).map(([key, label]) => {
        if (key === "all") return null;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium cursor-pointer border-none transition-colors whitespace-nowrap ${
              selected === key
                ? "bg-[#1d1d1f] text-white"
                : "bg-[#f2f3f5] text-[#555]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category]?.split(" ")[0] || "💬";
}
