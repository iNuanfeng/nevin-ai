export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Bar */}
      <header className="flex justify-between items-center px-5 pt-12 pb-2">
        <h1 className="text-[28px] font-bold tracking-tight bg-gradient-to-r from-[#1d1d1f] to-[#555] bg-clip-text text-transparent">
          Nevin
        </h1>
        <div className="flex items-center gap-4">
          <svg className="w-5 h-5 text-[#666] cursor-pointer" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#00d4aa] flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
            N
          </div>
        </div>
      </header>

      {/* Mentor Filter */}
      <div className="flex gap-2 overflow-x-auto px-5 py-2 scrollbar-none">
        <MentorChip active>全部</MentorChip>
        <MentorChip>⭐ 总管家</MentorChip>
        <MentorChip>💼 职场军师</MentorChip>
        <MentorChip>❤️ 情场顾问</MentorChip>
        <MentorChip>👨‍👩‍👧 家庭调解师</MentorChip>
        <MentorChip>📷 摄影导师</MentorChip>
        <MentorChip>🌱 成长教练</MentorChip>
      </div>

      {/* Conversation List Placeholder */}
      <div className="flex-1 px-5 pt-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">最近对话</span>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f2f3f5] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#aeaeb2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p className="text-[#8e8e93] text-sm">还没有对话</p>
          <p className="text-[#aeaeb2] text-xs mt-1">点击右下角 + 开始吧</p>
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-[34px] w-14 h-14 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center shadow-lg border-none text-[28px] font-light cursor-pointer z-10 hover:scale-105 transition-transform">
        +
      </button>
    </div>
  );
}

function MentorChip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer transition-colors ${
        active ? "bg-[#1d1d1f] text-white" : "bg-[#f2f3f5] text-[#555] hover:bg-[#e8e8ed]"
      }`}
    >
      {children}
    </button>
  );
}
