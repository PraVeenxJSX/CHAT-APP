import type { User } from "../types";

interface ChatListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  onlineUsers: string[];
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  unreadCounts?: Record<string, number>;
}

const ChatList = ({
  users,
  selectedUser,
  onSelectUser,
  onlineUsers,
  onLogout,
  searchQuery,
  onSearchChange,
  unreadCounts = {},
}: ChatListProps) => {
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-cyber-surface/95 backdrop-blur-xl">
      {/* Header */}
      <div className="p-4 border-b border-cyber-border">
        <h2 className="text-lg font-bold text-center mb-3 text-cyber-cyan font-cyber tracking-widest uppercase neon-text-cyan">
          CHATS
        </h2>
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-text-dim"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-cyber-bg border border-cyber-border rounded-lg pl-9 pr-3 py-2 text-sm text-cyber-text placeholder-cyber-text-dim outline-none focus:border-cyber-cyan focus:shadow-neon-cyan transition-all duration-300"
          />
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredUsers.map((u) => {
          const isOnline = onlineUsers.includes(u._id);
          const isSelected = selectedUser?._id === u._id;
          const unreadCount = unreadCounts[u._id] || 0;

          return (
            <div
              key={u._id}
              onClick={() => onSelectUser(u)}
              className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-300 border ${
                isSelected
                  ? "bg-cyber-surface-light border-cyber-cyan/40 shadow-neon-cyan"
                  : "border-transparent hover:bg-cyber-surface-light/50 hover:border-cyber-cyan/20"
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                    isSelected
                      ? "border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan"
                      : "border-cyber-border bg-cyber-surface-light text-cyber-text"
                  }`}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-cyber-surface transition-all ${
                    isOnline
                      ? "bg-cyber-lime shadow-neon-lime"
                      : "bg-cyber-text-dim"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isSelected ? "text-cyber-cyan" : "text-cyber-text"}`}>
                  {u.name}
                </p>
                <p className={`text-xs ${isOnline ? "text-cyber-lime" : "text-cyber-text-dim"}`}>
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>

              {/* Unread badge */}
              {unreadCount > 0 && !isSelected && (
                <div className="flex-shrink-0 min-w-[1.5rem] h-6 px-2 rounded-full bg-cyber-magenta/20 border border-cyber-magenta/50 shadow-neon-magenta flex items-center justify-center">
                  <span className="text-xs font-bold text-cyber-magenta">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <p className="text-center text-cyber-text-dim text-sm py-4">
            No users found
          </p>
        )}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-cyber-border">
        <button
          onClick={onLogout}
          className="w-full bg-cyber-magenta/10 text-cyber-magenta py-2.5 rounded-xl border border-cyber-magenta/30 hover:bg-cyber-magenta/20 hover:shadow-neon-magenta transition-all duration-300 font-cyber tracking-wider text-sm"
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
};

export default ChatList;
