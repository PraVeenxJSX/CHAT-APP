import { Search, LogOut, MessageSquare, Plus, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { User, Conversation } from "../types";

interface ChatListProps {
  users: User[];
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectUser: (user: User) => void;
  onSelectConversation: (conv: Conversation) => void;
  onlineUsers: string[];
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unreadCounts?: Record<string, number>;
  onCreateGroup: () => void;
}

const gradientFor = (name: string) => {
  const palettes = [
    ["#5865F2", "#a855f7"],
    ["#06b6d4", "#3b82f6"],
    ["#ec4899", "#8b5cf6"],
    ["#10b981", "#06b6d4"],
    ["#f59e0b", "#ef4444"],
    ["#6366f1", "#ec4899"],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = palettes[hash % palettes.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

const ChatList = ({
  users,
  conversations,
  selectedConversation,
  onSelectUser,
  onSelectConversation,
  onlineUsers,
  onLogout,
  searchQuery,
  onSearchChange,
  unreadCounts = {},
  onCreateGroup,
}: ChatListProps) => {
  const { user } = useAuth();

  // Separate group and direct conversations
  const groupConversations = conversations.filter((c) => c.type === "group");
  const directConversations = conversations.filter((c) => c.type === "direct");

  // For direct conversations, find the partner user
  const getPartner = (conv: Conversation): User | undefined => {
    if (!user) return undefined;
    const partner = conv.participants.find((p) => p._id !== user._id);
    return partner;
  };

  // Filter conversations based on search
  const filteredGroups = groupConversations.filter((c) =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDirects = directConversations.filter((c) => {
    const partner = getPartner(c);
    return partner?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Also filter users not yet in any conversation (for starting new chats)
  const usersInConversations = new Set(
    directConversations.map((c) => getPartner(c)?._id).filter(Boolean)
  );
  const newUsers = users.filter(
    (u) =>
      u._id !== user?._id &&
      !usersInConversations.has(u._id) &&
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = users.filter((u) => onlineUsers.includes(u._id)).length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white/[0.035] via-white/[0.015] to-transparent backdrop-blur-xl border-r border-white/[0.08]">
      {/* Brand */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#a855f7] shadow-lg shadow-indigo-500/40 ring-1 ring-white/15">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-white">Pulse</div>
            <div className="text-[10px] text-emerald-300/80 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]" />
              {onlineCount} online
            </div>
          </div>
        </div>
        <button
          onClick={onCreateGroup}
          className="h-9 w-9 grid place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition"
          title="Create group"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search people & groups"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-400/40 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(88,101,242,0.12)] transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {/* Groups section */}
        {filteredGroups.length > 0 && (
          <>
            <div className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-white/40 font-medium">
              Groups
            </div>
            <div className="space-y-0.5">
              {filteredGroups.map((conv) => {
                const isSelected = selectedConversation?._id === conv._id;
                const unreadCount = unreadCounts[conv._id] || 0;

                return (
                  <button
                    key={conv._id}
                    onClick={() => onSelectConversation(conv)}
                    className={`group relative w-full text-left px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-200 ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "border border-transparent hover:bg-white/[0.04] hover:translate-x-[1px]"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-gradient-to-b from-[#8b93ff] to-[#a855f7] shadow-[0_0_10px_rgba(139,147,255,0.7)]" />
                    )}
                    <div className="relative shrink-0">
                      <div
                        className="h-10 w-10 rounded-full grid place-items-center text-sm font-semibold text-white"
                        style={{ background: gradientFor(conv.name || "Group") }}
                      >
                        <Users className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`truncate text-sm ${
                          isSelected ? "text-white font-medium" : "text-white/85"
                        }`}
                      >
                        {conv.name || "Group"}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {conv.participants.length} members
                      </p>
                    </div>

                    {unreadCount > 0 && !isSelected && (
                      <div className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#6b78ff] to-[#5865F2] grid place-items-center shadow-[0_2px_8px_rgba(88,101,242,0.5)]">
                        <span className="text-[10px] font-semibold text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Direct messages section */}
        {(filteredDirects.length > 0 || newUsers.length > 0) && (
          <>
            <div className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-white/40 font-medium">
              Direct Messages
            </div>
            <div className="space-y-0.5">
              {/* Existing direct conversations */}
              {filteredDirects.map((conv) => {
                const partner = getPartner(conv);
                if (!partner) return null;
                const isOnline = onlineUsers.includes(partner._id);
                const isSelected = selectedConversation?._id === conv._id;
                const unreadCount = unreadCounts[conv._id] || 0;

                return (
                  <button
                    key={conv._id}
                    onClick={() => onSelectConversation(conv)}
                    className={`group relative w-full text-left px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-200 ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-500/15 via-white/[0.05] to-transparent border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "border border-transparent hover:bg-white/[0.04] hover:translate-x-[1px]"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-gradient-to-b from-[#8b93ff] to-[#a855f7] shadow-[0_0_10px_rgba(139,147,255,0.7)]" />
                    )}
                    <div className="relative shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full grid place-items-center text-sm font-semibold text-white transition ${
                          isOnline ? "ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-transparent" : ""
                        }`}
                        style={{ background: gradientFor(partner.name) }}
                      >
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#07080c] ${
                          isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]" : "bg-white/25"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`truncate text-sm ${
                          isSelected ? "text-white font-medium" : "text-white/85"
                        }`}
                      >
                        {partner.name}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {isOnline ? "Active now" : "Offline"}
                      </p>
                    </div>

                    {unreadCount > 0 && !isSelected && (
                      <div className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#6b78ff] to-[#5865F2] grid place-items-center shadow-[0_2px_8px_rgba(88,101,242,0.5)]">
                        <span className="text-[10px] font-semibold text-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Users not yet in any conversation */}
              {newUsers.map((u) => {
                const isOnline = onlineUsers.includes(u._id);

                return (
                  <button
                    key={u._id}
                    onClick={() => onSelectUser(u)}
                    className="group relative w-full text-left px-3 py-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-200 border border-transparent hover:bg-white/[0.04] hover:translate-x-[1px]"
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`h-10 w-10 rounded-full grid place-items-center text-sm font-semibold text-white transition ${
                          isOnline ? "ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-transparent" : ""
                        }`}
                        style={{ background: gradientFor(u.name) }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#07080c] ${
                          isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]" : "bg-white/25"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-white/85">{u.name}</p>
                      <p className="text-xs text-white/40 truncate">
                        {isOnline ? "Active now" : "Offline"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {filteredGroups.length === 0 && filteredDirects.length === 0 && newUsers.length === 0 && (
          <p className="text-center text-white/40 text-sm py-6">No people found</p>
        )}
      </div>

      {/* Current user + logout */}
      <div className="p-3 border-t border-white/10 flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full grid place-items-center text-sm font-semibold text-white shrink-0"
          style={{ background: user?.name ? gradientFor(user.name) : "linear-gradient(135deg,#5865F2,#a855f7)" }}
        >
          {(user?.name || "U").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white/90 truncate">{user?.name || "You"}</div>
          <div className="text-[11px] text-emerald-400/90 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </div>
        </div>
        <button
          onClick={onLogout}
          className="h-9 w-9 grid place-items-center rounded-xl text-white/50 hover:text-red-300 hover:bg-red-500/10 transition"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatList;
