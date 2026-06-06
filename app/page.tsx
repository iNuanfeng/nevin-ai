"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ArrowUp, Download, X, Check } from "lucide-react";

import BottomNav, { type TabId } from "@/components/BottomNav";
import MentorFilter from "@/components/MentorFilter";
import ConversationList, { type ConversationItemData } from "@/components/ConversationList";
import MentorPicker, { type MentorOption } from "@/components/MentorPicker";
import PersonSelector, { type PersonOption } from "@/components/PersonSelector";
import MentorSettingsView from "@/components/MentorSettings";

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

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("home");

  // ── Data states ──
  const [conversations, setConversations] = useState<ConversationItemData[]>([]);
  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [personsFull, setPersonsFull] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>({});
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // ── UI states ──
  const [showPicker, setShowPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Persons view
  const [personSearch, setPersonSearch] = useState("");
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personForm, setPersonForm] = useState({ name: "", relationship: "", category: "", background: "" });
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);

  // Profile view
  const [profileForm, setProfileForm] = useState({
    name: "", background: "", values: "", personality: "", life_goals: "", habits: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Backup stats
  const [backupStats, setBackupStats] = useState({ conversations: 0, persons: 0, memories: 0 });

  // ── Data fetching ──
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  const fetchMentors = useCallback(async () => {
    try {
      const res = await fetch("/api/mentors");
      const data = await res.json();
      setMentors(data.mentors || []);
    } catch {}
  }, []);

  const fetchPersons = useCallback(async () => {
    try {
      const res = await fetch("/api/persons");
      const data = await res.json();
      setPersonsFull(data.persons || []);
      setPersons((data.persons || []).map((p: any) => ({ id: p.id, name: p.name, relationship: p.relationship })));
    } catch {}
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setProfileForm({
          name: data.profile.name || "",
          background: data.profile.background || "",
          values: data.profile.values || "",
          personality: data.profile.personality || "",
          life_goals: data.profile.life_goals || "",
          habits: data.profile.habits || "",
        });
      }
    } catch {}
  }, []);

  const fetchBackupStats = useCallback(async () => {
    try {
      const [convRes, perRes, memRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/persons"),
        fetch("/api/memory"),
      ]);
      const conv = await convRes.json();
      const per = await perRes.json();
      const mem = await memRes.json();
      setBackupStats({
        conversations: (conv.conversations || []).length,
        persons: (per.persons || []).length,
        memories: (mem.memories || []).length,
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchMentors();
    fetchPersons();
    fetchProfile();
  }, [fetchMentors, fetchPersons, fetchProfile]);

  useEffect(() => {
    if (activeTab === "home") fetchConversations();
    if (activeTab === "backup") fetchBackupStats();
  }, [activeTab, fetchConversations, fetchBackupStats]);

  // ── Toast ──
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── Delete conversation ──
  const handleDeleteConv = async (id: number) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await fetch(`/api/conversations/${deleteTarget}`, { method: "DELETE" });
      const deletedId = deleteTarget;
      setDeleteTarget(null);
      fetchConversations();
      showToast("对话已删除");
    } catch {
      showToast("删除失败");
    }
  };

  const handleDeleteCancel = () => setDeleteTarget(null);

  // ── Create conversation ──
  const handleSelectMentor = async (mentor: MentorOption) => {
    setShowPicker(false);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId: mentor.id }),
      });
      const data = await res.json();
      if (data.conversation) {
        router.push(`/conversations/${data.conversation.id}`);
      }
    } catch {
      showToast("创建对话失败");
    }
  };

  // ── Person CRUD ──
  const handleSavePerson = async () => {
    if (!personForm.name.trim()) return;
    try {
      if (editingPersonId) {
        await fetch(`/api/persons/${editingPersonId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(personForm),
        });
      } else {
        await fetch("/api/persons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(personForm),
        });
      }
      setShowPersonForm(false);
      setEditingPersonId(null);
      setPersonForm({ name: "", relationship: "", category: "", background: "" });
      fetchPersons();
      showToast(editingPersonId ? "联系人已更新" : "联系人已添加");
    } catch {
      showToast("保存失败");
    }
  };

  const handleEditPerson = (p: any) => {
    setPersonForm({
      name: p.name || "",
      relationship: p.relationship || "",
      category: p.category || "",
      background: p.background || "",
    });
    setEditingPersonId(p.id);
    setShowPersonForm(true);
  };

  const handleDeletePerson = async (id: number) => {
    try {
      await fetch(`/api/persons/${id}`, { method: "DELETE" });
      fetchPersons();
      showToast("联系人已删除");
    } catch {
      showToast("删除失败");
    }
  };

  // ── Profile ──
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      showToast("档案已更新");
    } catch {
      showToast("保存失败");
    }
    setProfileSaving(false);
  };

  // ── Backup ──
  const handleDownload = () => {
    // MVP: redirect to backup download (future endpoint)
    showToast("备份功能开发中");
  };

  // ── Filter conversations by mentor ──
  const filteredConversations = filterCategory
    ? conversations.filter((c) => c.mentor_category === filterCategory)
    : conversations;

  const filteredPersons = personSearch
    ? personsFull.filter((p: any) => p.name.includes(personSearch))
    : personsFull;

  // ──── RENDER ────
  return (
    <div className="flex flex-col min-h-dvh bg-white w-full max-w-[430px] mx-auto relative sm:rounded-2xl sm:shadow-lg sm:my-3">
      {/* ── HOME TAB ── */}
      {activeTab === "home" && (
        <>
          <header className="flex justify-between items-center px-5 pt-3 pb-1">
            <h1 className="text-[26px] font-bold tracking-tight bg-gradient-to-r from-[#1d1d1f] to-[#555] bg-clip-text text-transparent">
              Nevin
            </h1>
            <div className="flex items-center gap-3.5">
              <Search size={20} className="text-[#666] cursor-pointer" />
              <div
                onClick={() => setActiveTab("profile")}
                className="w-7.5 h-7.5 rounded-full bg-gradient-to-br from-[#5e5ce6] to-[#00d4aa] flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
              >
                {(profileForm.name || "N")[0]}
              </div>
            </div>
          </header>

          <div className="flex items-center justify-between px-5 pt-0.5 pb-0.5">
            <span className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
              {filterCategory ? getMentorName(filterCategory) + "的对话" : "最近对话"}
            </span>
          </div>

          <MentorFilter selected={filterCategory} onChange={(cat) => {
            setFilterCategory(cat);
            fetchConversations();
          }} />

          <div className="flex-1 overflow-y-auto">
            <ConversationList conversations={filteredConversations} onDelete={handleDeleteConv} />
          </div>

          <button
            onClick={() => setShowPicker(true)}
            className="fixed bottom-[88px] right-[26px] w-12 h-12 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center shadow-lg border-none text-[26px] font-light cursor-pointer z-10"
          >
            <Plus size={24} />
          </button>

          <MentorPicker
            mentors={mentors}
            open={showPicker}
            onClose={() => setShowPicker(false)}
            onSelect={handleSelectMentor}
          />
        </>
      )}

      {/* ── PERSONS TAB ── */}
      {activeTab === "persons" && (
        <>
          <div className="flex justify-between items-center px-5 pt-6 pb-1">
            <h1 className="text-[26px] font-bold tracking-tight bg-gradient-to-r from-[#1d1d1f] to-[#555] bg-clip-text text-transparent">
              通讯录
            </h1>
          </div>

          <div className="mx-5 my-1 mb-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
            <input
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              placeholder="搜索联系人"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#f2f3f5] text-sm outline-none border-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredPersons.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#f5f5f5] active:bg-[#f8f8fa]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0 text-white font-semibold"
                  style={{ background: REL_COLORS[p.category || "friend"] || "#e8e8ed" }}
                >
                  {(p.name || "?")[0]}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEditPerson(p)}>
                  <div className="text-[15px] font-semibold text-[#1d1d1f]">{p.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {p.relationship && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${REL_BADGE[p.category || "friend"] || "bg-[#f2f3f5] text-[#8e8e93]"}`}>
                        {p.relationship}
                      </span>
                    )}
                    <span className="text-[12px] text-[#8e8e93]">{p.background || ""}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePerson(p.id)}
                  className="text-[11px] text-[#ff3b30] bg-transparent border-none cursor-pointer p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setEditingPersonId(null); setPersonForm({ name: "", relationship: "", category: "", background: "" }); setShowPersonForm(true); }}
            className="fixed bottom-[88px] right-[26px] w-12 h-12 rounded-full bg-[#007aff] text-white flex items-center justify-center shadow-lg border-none cursor-pointer z-10"
          >
            <Plus size={24} />
          </button>

          {/* Person form bottom sheet */}
          {showPersonForm && (
            <>
              <div className="fixed inset-0 bg-black/40 z-20" onClick={() => setShowPersonForm(false)} />
              <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-[0_-4px_30px_rgba(0,0,0,0.12)] z-25 p-4 pb-7.5 bottom-sheet-anim">
                <div className="w-9 h-1 rounded bg-[#e8e8ed] mx-auto mb-3" />
                <div className="text-[16px] font-semibold mb-3.5 text-[#1d1d1f]">
                  {editingPersonId ? "编辑联系人" : "新建联系人"}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] font-semibold text-[#8e8e93] uppercase mb-1.5 block">姓名</label>
                    <input value={personForm.name} onChange={e => setPersonForm({ ...personForm, name: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8e8ed] text-sm outline-none focus:border-[#007aff]" placeholder="姓名" />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#8e8e93] uppercase mb-1.5 block">关系</label>
                    <select value={personForm.relationship} onChange={e => setPersonForm({ ...personForm, relationship: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8e8ed] text-sm outline-none focus:border-[#007aff] bg-white">
                      <option value="">选择关系</option>
                      <option value="同事">同事</option>
                      <option value="恋人">恋人</option>
                      <option value="家人">家人</option>
                      <option value="朋友">朋友</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[#8e8e93] uppercase mb-1.5 block">背景描述</label>
                    <textarea value={personForm.background} onChange={e => setPersonForm({ ...personForm, background: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8e8ed] text-sm outline-none focus:border-[#007aff] resize-vertical min-h-[60px]" placeholder="可选" />
                  </div>
                  <button onClick={handleSavePerson} className="w-full py-3 rounded-xl bg-[#007aff] text-white text-[15px] font-semibold border-none cursor-pointer">
                    {editingPersonId ? "更新" : "添加"}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <>
          <div className="px-5 pt-6 pb-1">
            <h1 className="text-[26px] font-bold tracking-tight bg-gradient-to-r from-[#1d1d1f] to-[#555] bg-clip-text text-transparent">
              个人档案
            </h1>
            <p className="text-[13px] text-[#8e8e93] mt-1">这些信息将帮助 AI 更好地了解你</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pt-2">
            {[
              { key: "name", label: "名字", type: "input" },
              { key: "background", label: "背景经历", type: "textarea" },
              { key: "values", label: "核心价值观", type: "textarea" },
              { key: "personality", label: "性格特质", type: "textarea" },
              { key: "life_goals", label: "人生目标", type: "textarea" },
              { key: "habits", label: "生活习惯", type: "textarea" },
            ].map(({ key, label, type }) => (
              <div key={key} className="mb-3">
                <label className="text-[12px] font-semibold text-[#8e8e93] uppercase mb-1 block tracking-[.3px]">
                  {label}
                </label>
                {type === "input" ? (
                  <input
                    value={(profileForm as any)[key]}
                    onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8e8ed] text-sm outline-none focus:border-[#007aff] bg-white"
                    placeholder={label}
                  />
                ) : (
                  <textarea
                    value={(profileForm as any)[key]}
                    onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8e8ed] text-sm outline-none focus:border-[#007aff] bg-white resize-vertical min-h-[60px]"
                    placeholder={`你的${label}…`}
                  />
                )}
              </div>
            ))}
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="w-full py-3 rounded-xl bg-[#007aff] text-white text-[15px] font-semibold border-none cursor-pointer mb-4 disabled:opacity-50"
            >
              {profileSaving ? "保存中…" : "保存档案"}
            </button>
          </div>
        </>
      )}

      {/* ── MENTORS TAB ── */}
      {activeTab === "mentors" && (
        <>
          <div className="px-5 pt-6 pb-1">
            <h1 className="text-[26px] font-bold tracking-tight bg-gradient-to-r from-[#1d1d1f] to-[#555] bg-clip-text text-transparent">
              导师人设
            </h1>
            <p className="text-[13px] text-[#8e8e93] mt-1">定制每位导师的对话风格</p>
          </div>
          <MentorSettingsView />
        </>
      )}

      {/* ── BACKUP TAB ── */}
      {activeTab === "backup" && (
        <div className="px-5 pt-6 pb-2 flex-1 flex flex-col">
          <h1 className="text-[26px] font-bold tracking-tight bg-gradient-to-r from-[#1d1d1f] to-[#555] bg-clip-text text-transparent">
            数据备份
          </h1>
          <p className="text-[13px] text-[#8e8e93] mt-1 mb-4">所有数据安全存储在你的设备上</p>

          <div className="bg-[#f8f9fb] rounded-2xl p-5 mb-5">
            <h3 className="text-[15px] font-semibold mb-2 text-[#1d1d1f]">备份说明</h3>
            <p className="text-[13px] text-[#555] leading-relaxed">
              点击下方下载按钮，将你的全部数据（对话、联系人、记忆、档案）打包为一个 ZIP 文件。
              建议定期备份以防数据丢失。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { num: backupStats.conversations, label: "对话数" },
              { num: backupStats.persons, label: "联系人数" },
              { num: backupStats.memories, label: "记忆条数" },
              { num: 0, label: "备份次数" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-3.5 text-center shadow-sm">
                <div className="text-xl font-bold text-[#1d1d1f]">{s.num}</div>
                <div className="text-[11px] text-[#8e8e93] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <button onClick={handleDownload} className="w-full py-3.5 rounded-xl bg-[#1d1d1f] text-white text-base font-semibold border-none cursor-pointer flex items-center justify-center gap-2 mb-4">
            <Download size={20} />
            下载完整备份
          </button>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {deleteTarget !== null && (
        <>
          <div className="fixed inset-0 bg-black/40 z-20" onClick={handleDeleteCancel} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white w-[280px] rounded-2xl p-6 shadow-lg z-25">
            <h3 className="text-[17px] font-bold mb-1.5 text-[#1d1d1f]">删除对话</h3>
            <p className="text-[13px] text-[#8e8e93] leading-relaxed mb-1">
              删除后对话内容将不可见。注意：
            </p>
            <div className="my-2 mb-4 space-y-1">
              {["联系人不受影响", "记忆不受影响", "用户档案不受影响"].map((t) => (
                <div key={t} className="text-[13px] text-[#555] flex items-center gap-1.5">
                  <Check size={14} className="text-[#34c759] flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button onClick={handleDeleteCancel} className="flex-1 py-3 rounded-xl bg-[#f2f3f5] text-[#1d1d1f] text-[15px] font-semibold border-none cursor-pointer">
                取消
              </button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-[#ff3b30] text-white text-[15px] font-semibold border-none cursor-pointer">
                删除
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md text-white px-4 py-3 rounded-xl text-sm z-30 whitespace-nowrap max-w-[88%] toast">
          {toastMsg}
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function getMentorName(category: string): string {
  const names: Record<string, string> = {
    life_manager: "总管家", workplace: "职场军师", romance: "情场顾问",
    family: "家庭调解师", photography: "摄影导师", growth: "成长教练",
  };
  return names[category] || "";
}
