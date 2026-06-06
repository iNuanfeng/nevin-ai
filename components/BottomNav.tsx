"use client";

import { MessageSquare, Users, User, Settings, Archive } from "lucide-react";

export type TabId = "home" | "persons" | "profile" | "mentors" | "backup";

const TABS: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
  { id: "home", label: "首页", icon: MessageSquare },
  { id: "persons", label: "通讯录", icon: Users },
  { id: "profile", label: "档案", icon: User },
  { id: "mentors", label: "导师", icon: Settings },
  { id: "backup", label: "备份", icon: Archive },
];

export default function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <nav className="flex justify-around items-center py-1.5 pb-4 border-t border-[#f0f0f0] bg-white flex-shrink-0">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center gap-[1px] cursor-pointer py-1 px-2.5 border-none bg-transparent rounded-lg transition-colors ${
              active ? "text-[#007aff]" : "text-[#8e8e93]"
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
