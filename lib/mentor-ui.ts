/** 导师列表/聊天页头像渐变与图标（按 category） */

export const MENTOR_GRADIENTS: Record<string, string> = {
  life_manager: "linear-gradient(135deg,#667eea,#764ba2)",
  workplace: "linear-gradient(135deg,#f093fb,#f5576c)",
  romance: "linear-gradient(135deg,#9d8b96,#c8bcc4)",
  family: "linear-gradient(135deg,#a8edea,#fed6e3)",
  photography: "linear-gradient(135deg,#ffecd2,#fcb69f)",
  growth: "linear-gradient(135deg,#89f7fe,#66a6ff)",
};

export const CATEGORY_ICONS: Record<string, string> = {
  life_manager: "⭐",
  workplace: "💼",
  romance: "✨",
  family: "👨‍👩‍👧",
  photography: "📷",
  growth: "🌱",
};

export const MENTOR_FILTER_LABELS: Record<string, string> = {
  life_manager: "⭐ 总管家",
  workplace: "💼 职场军师",
  romance: "✨ 情场顾问",
  family: "👨‍👩‍👧 家庭调解师",
  photography: "📷 摄影导师",
  growth: "🌱 成长教练",
};
