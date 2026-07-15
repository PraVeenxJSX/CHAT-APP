import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useCall } from "../hooks/useCall";
import { useChatMessages } from "../hooks/useChatMessages";
import { useNotifications } from "../hooks/useNotifications";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { fetchUsers } from "../api/message";
import {
  fetchConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  updateGroupConversation,
  deleteGroupConversation,
  muteGroupConversation,
  promoteAdmin,
  demoteAdmin,
  leaveGroup,
} from "../api/conversation";
import ChatList from "../components/ChatList";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import AISuggestions from "../components/AISuggestions";
import SearchPanel from "../components/SearchPanel";
import CreateGroupDialog from "../components/CreateGroupDialog";
import GroupInfoPanel, { type GroupUpdateInfo } from "../components/GroupInfoPanel";
import SettingsPanel from "../components/UserProfilePanel";
import {
  Menu,
  Search,
  Settings as SettingsIcon,
  Phone,
  Video,
  MessageSquare,
  Users,
  MoreVertical,
} from "lucide-react";
import type { User, SendMessagePayload, Message, Conversation } from "../types";

const Chat = () => {
  const { token, user, logout } = useAuth();
  const { onlineUsers, typingUsers, sendMessage, emitTyping, emitStopTyping, addMessageListener } =
    useSocket();
  const { startCall, active: activeCall } = useCall();
  const { requestPermission, showNotification } = useNotifications();
  const { incrementUnread, clearUnread, getUnreadCount } = useUnreadCounts();

  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { messages, loading, setMessages } = useChatMessages(selectedConversation);

  // Derived: get the "partner" user for a direct conversation
  const selectedPartner = useMemo(() => {
    if (!selectedConversation || selectedConversation.type !== "direct" || !user) return null;
    return selectedConversation.participants.find((p) => p._id !== user._id) || null;
  }, [selectedConversation, user]);

  // Lock page scroll
  useEffect(() => {
    window.scrollTo(0, 0);
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevHtmlHeight = document.documentElement.style.height;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.height = prevHtmlHeight;
      document.body.style.height = prevBodyHeight;
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Fetch users and conversations
  useEffect(() => {
    if (!token) return;
    fetchUsers(token).then(setUsers);
    fetchConversations(token).then(setConversations);
  }, [token]);

  // Listen for incoming messages for notifications + unread counts
  useEffect(() => {
    const unsub = addMessageListener((msg: Message) => {
      if (!user) return;
      if (msg.sender._id === user._id) return;

      // Check if this message belongs to the currently selected conversation
      const isCurrentConversation =
        selectedConversation &&
        (msg.conversationId === selectedConversation._id ||
          (selectedConversation.type === "direct" &&
            msg.sender._id === selectedConversation.participants.find((p) => p._id !== user._id)?._id));

      if (!isCurrentConversation) {
        // Increment unread for the conversation or sender
        const unreadKey = msg.conversationId || msg.sender._id;
        incrementUnread(unreadKey);
        const senderName = users.find((u) => u._id === msg.sender._id)?.name || "Someone";
        showNotification(senderName, msg.content || "[Media message]");
      }
    });
    return unsub;
  }, [addMessageListener, user, selectedConversation, incrementUnread, showNotification, users]);

  // Refresh conversations when conversations might have changed
  const refreshConversations = useCallback(async () => {
    if (!token) return;
    const convs = await fetchConversations(token);
    setConversations(convs);
  }, [token]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation(conv);
      setSidebarOpen(false);
      setShowGroupInfo(false);
      clearUnread(conv._id);
    },
    [clearUnread]
  );

  // Handle selecting a user (for new direct chats)
  const handleSelectUser = useCallback(
    async (u: User) => {
      if (!token) return;
      try {
        const conv = await getOrCreateDirectConversation(u._id, token);
        setSelectedConversation(conv);
        setSidebarOpen(false);
        // Add to conversations list if not already there
        setConversations((prev) => {
          if (prev.some((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });
      } catch (err) {
        console.error("Failed to create direct conversation", err);
      }
    },
    [token]
  );

  // Handle creating a group
  const handleCreateGroup = useCallback(
    async (name: string, participantIds: string[]) => {
      if (!token) return;
      try {
        const conv = await createGroupConversation(name, participantIds, undefined, token);
        setShowCreateGroup(false);
        setConversations((prev) => [conv, ...prev]);
        setSelectedConversation(conv);
      } catch (err) {
        console.error("Failed to create group", err);
      }
    },
    [token]
  );

  // Handle sending a message
  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !selectedConversation) return;

    if (selectedConversation.type === "group") {
      sendMessage({
        conversationId: selectedConversation._id,
        content: newMessage,
        type: "text",
      });
    } else if (selectedPartner) {
      sendMessage({
        receiver: selectedPartner._id,
        content: newMessage,
        type: "text",
      });
      emitStopTyping(selectedPartner._id);
    }

    setNewMessage("");
  }, [newMessage, selectedConversation, selectedPartner, sendMessage, emitStopTyping]);

  const handleSendMedia = useCallback(
    (payload: Omit<SendMessagePayload, "receiver">) => {
      if (!selectedConversation) return;

      if (selectedConversation.type === "group") {
        sendMessage({
          conversationId: selectedConversation._id,
          ...payload,
        });
      } else if (selectedPartner) {
        sendMessage({
          receiver: selectedPartner._id,
          ...payload,
        });
      }
    },
    [selectedConversation, selectedPartner, sendMessage]
  );

  const handleStartCall = useCallback(
    (type: "audio" | "video") => {
      if (!selectedConversation || !user) return;
      if (selectedConversation.type === "direct") {
        const partner = selectedPartner;
        if (partner) {
          startCall(
            { kind: "direct", partnerId: partner._id },
            type,
            { _id: partner._id, name: partner.name, avatar: partner.avatar }
          );
        }
      } else {
        startCall(
          { kind: "group", conversationId: selectedConversation._id },
          type,
          undefined,
          selectedConversation.name
        );
      }
    },
    [selectedConversation, selectedPartner, user, startCall]
  );

  const handleTyping = useCallback(() => {
    if (selectedConversation?.type === "group") {
      // For groups, we could emit typing with conversationId
      // but the current socket handles it
    } else if (selectedPartner) {
      emitTyping(selectedPartner._id);
    }
  }, [selectedConversation, selectedPartner, emitTyping]);

  const handleStopTyping = useCallback(() => {
    if (selectedPartner) emitStopTyping(selectedPartner._id);
  }, [selectedPartner, emitStopTyping]);

  const handleAISuggestion = useCallback((text: string) => {
    setNewMessage(text);
  }, []);

  // Handle group operations
  const handleUpdateGroup = useCallback(
    async (updates: GroupUpdateInfo) => {
      if (!token || !selectedConversation) return;
      try {
        const payload: Parameters<typeof updateGroupConversation>[1] = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.onlyAdminsCanMessage !== undefined)
          payload.onlyAdminsCanMessage = updates.onlyAdminsCanMessage;
        if (updates.disappearingMessagesSeconds !== undefined)
          payload.disappearingMessagesSeconds = updates.disappearingMessagesSeconds;
        if (updates.avatarFile) payload.avatar = updates.avatarFile;

        const updated = await updateGroupConversation(
          selectedConversation._id,
          payload,
          token
        );
        setSelectedConversation(updated);
        refreshConversations();
      } catch (err) {
        console.error("Failed to update group", err);
      }
    },
    [token, selectedConversation, refreshConversations]
  );

  const handleAddParticipants = useCallback(
    async (userIds: string[]) => {
      if (!token || !selectedConversation) return;
      try {
        const updated = await updateGroupConversation(
          selectedConversation._id,
          { addParticipants: userIds },
          token
        );
        setSelectedConversation(updated);
        refreshConversations();
      } catch (err) {
        console.error("Failed to add participants", err);
      }
    },
    [token, selectedConversation, refreshConversations]
  );

  const handleRemoveParticipant = useCallback(
    async (userId: string) => {
      if (!token || !selectedConversation) return;
      try {
        const updated = await updateGroupConversation(
          selectedConversation._id,
          { removeParticipants: [userId] },
          token
        );
        setSelectedConversation(updated);
        refreshConversations();
      } catch (err) {
        console.error("Failed to remove participant", err);
      }
    },
    [token, selectedConversation, refreshConversations]
  );

  const handlePromoteAdmin = useCallback(
    async (userId: string) => {
      if (!token || !selectedConversation) return;
      try {
        const updated = await promoteAdmin(selectedConversation._id, userId, token);
        setSelectedConversation(updated);
        refreshConversations();
      } catch (err) {
        console.error("Failed to promote admin", err);
      }
    },
    [token, selectedConversation, refreshConversations]
  );

  const handleDemoteAdmin = useCallback(
    async (userId: string) => {
      if (!token || !selectedConversation) return;
      try {
        const updated = await demoteAdmin(selectedConversation._id, userId, token);
        setSelectedConversation(updated);
        refreshConversations();
      } catch (err) {
        console.error("Failed to demote admin", err);
      }
    },
    [token, selectedConversation, refreshConversations]
  );

  const handleMuteGroup = useCallback(
    async (durationHours: number | null) => {
      if (!token || !selectedConversation) return;
      try {
        const result = await muteGroupConversation(
          selectedConversation._id,
          durationHours,
          token
        );
        if (selectedConversation) {
          const others = selectedConversation.mutedMembers?.filter(
            (m) => m.userId !== user?._id
          ) || [];
          if (result.muted && result.until) {
            others.push({ userId: user!._id, until: result.until });
          }
          setSelectedConversation({
            ...selectedConversation,
            mutedMembers: others,
          });
        }
      } catch (err) {
        console.error("Failed to mute group", err);
      }
    },
    [token, selectedConversation, user?._id]
  );

  const handleDeleteGroup = useCallback(async () => {
    if (!token || !selectedConversation) return;
    try {
      await deleteGroupConversation(selectedConversation._id, token);
      setSelectedConversation(null);
      setShowGroupInfo(false);
      refreshConversations();
    } catch (err) {
      console.error("Failed to delete group", err);
    }
  }, [token, selectedConversation, refreshConversations]);

  const handleLeaveGroup = useCallback(async () => {
    if (!token || !selectedConversation) return;
    try {
      await leaveGroup(selectedConversation._id, token);
      setSelectedConversation(null);
      setShowGroupInfo(false);
      refreshConversations();
    } catch (err) {
      console.error("Failed to leave group", err);
    }
  }, [token, selectedConversation, refreshConversations]);

  // Determine typing state for current conversation
  const typingUser = useMemo(() => {
    if (!selectedConversation) return null;
    if (selectedConversation.type === "direct" && selectedPartner) {
      return typingUsers[selectedPartner._id] ? selectedPartner._id : null;
    }
    return null;
  }, [selectedConversation, selectedPartner, typingUsers]);

  // Header display name and status
  const headerInfo = useMemo(() => {
    if (!selectedConversation) return null;
    if (selectedConversation.type === "group") {
      return {
        name: selectedConversation.name || "Group",
        status: `${selectedConversation.participants.length} members`,
        isOnline: false,
        isGroup: true,
      };
    }
    if (selectedPartner) {
      const isOnline = onlineUsers.includes(selectedPartner._id);
      return {
        name: selectedPartner.name,
        status: typingUsers[selectedPartner._id]
          ? "typing…"
          : isOnline
          ? "Active now"
          : "Offline",
        isOnline,
        isTyping: !!typingUsers[selectedPartner._id],
        isGroup: false,
      };
    }
    return null;
  }, [selectedConversation, selectedPartner, onlineUsers, typingUsers]);

  // Get last received message for AI suggestions
  const lastReceivedMessage = useMemo(() => {
    if (!messages.length || !user) return null;
    const received = messages.filter((m) => m.sender._id !== user._id);
    return received[received.length - 1] || null;
  }, [messages, user]);

  // Other users for group creation (exclude self)
  const otherUsers = useMemo(() => {
    if (!user) return users;
    return users.filter((u) => u._id !== user._id);
  }, [users, user]);

  return (
    <div className="h-dvh w-full max-w-full flex bg-[#07080c] text-white relative overflow-hidden">
      {/* Ambient aurora */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-56 -left-40 h-[360px] w-[360px] sm:h-[560px] sm:w-[560px] rounded-full blur-3xl opacity-30 animate-[pulse_9s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle at center, #5865F2 0%, transparent 60%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 h-[420px] w-[420px] sm:h-[640px] sm:w-[640px] rounded-full blur-3xl opacity-25 animate-[pulse_11s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle at center, #a855f7 0%, transparent 60%)" }}
        />
        <div
          className="absolute -bottom-60 left-1/3 h-[340px] w-[340px] sm:h-[520px] sm:w-[520px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle at center, #06b6d4 0%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
      </div>

      {/* Search panel */}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}

      {/* Create group dialog */}
      {showCreateGroup && (
        <CreateGroupDialog
          users={otherUsers}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* Settings panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Group info panel */}
      {showGroupInfo && selectedConversation?.type === "group" && user && (
        <GroupInfoPanel
          conversation={selectedConversation}
          currentUserId={user._id}
          allUsers={users}
          onClose={() => setShowGroupInfo(false)}
          onUpdate={handleUpdateGroup}
          onAddParticipants={handleAddParticipants}
          onRemoveParticipant={handleRemoveParticipant}
          onPromoteAdmin={handlePromoteAdmin}
          onDemoteAdmin={handleDemoteAdmin}
          onMute={handleMuteGroup}
          onLeave={handleLeaveGroup}
          onDelete={handleDeleteGroup}
        />
      )}

      {/* Hamburger button - mobile only */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-4 left-4 z-30 h-9 w-9 grid place-items-center rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur md:hidden hover:bg-white/[0.1] transition"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4 text-white/80" />
      </button>

      {/* Backdrop - mobile only */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden animate-[fade-in_0.2s_ease-out]"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-30 top-0 left-0 h-full w-[85vw] max-w-[18rem] sm:w-80 transition-transform duration-300 ease-out md:relative md:translate-x-0 md:w-80 md:h-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <ChatList
          users={users}
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectUser={handleSelectUser}
          onSelectConversation={handleSelectConversation}
          onlineUsers={onlineUsers}
          onLogout={logout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadCounts={Object.fromEntries(
            conversations.map((c) => [c._id, getUnreadCount(c._id)])
          )}
          onCreateGroup={() => setShowCreateGroup(true)}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative z-[1]">
        {/* Header */}
        <div className="shrink-0 px-4 md:px-6 py-3 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl border-b border-white/[0.08] flex items-center gap-3 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]">
          <div className="w-9 md:hidden" />
          <div className="flex-1 flex items-center gap-3 min-w-0">
            {headerInfo ? (
              <>
                <div className="relative shrink-0">
                  <div
                    className="h-10 w-10 rounded-full grid place-items-center text-sm font-semibold text-white shadow-lg ring-1 ring-white/10"
                    style={{
                      background: `linear-gradient(135deg, #5865F2, #a855f7)`,
                      boxShadow: "0 6px 20px -8px rgba(120,90,255,0.55)",
                    }}
                  >
                    {headerInfo.isGroup ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      headerInfo.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {!headerInfo.isGroup && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#07080c] ${
                        headerInfo.isOnline
                          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                          : "bg-white/25"
                      }`}
                    />
                  )}
                </div>
                <div
                  className="min-w-0 cursor-pointer"
                  onClick={() => {
                    if (selectedConversation?.type === "group") {
                      setShowGroupInfo(true);
                    }
                  }}
                >
                  <div className="font-semibold tracking-tight text-white/95 truncate">
                    {headerInfo.name}
                  </div>
                  <div className="text-[11px] text-white/50 flex items-center gap-1.5">
                    {headerInfo.isOnline && !(headerInfo as any).isTyping && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    )}
                    {(headerInfo as any).isTyping ? (
                      <span className="text-indigo-300">typing…</span>
                    ) : (
                      headerInfo.status
                    )}
                  </div>
                </div>
              </>
            ) : (
              <span className="text-white/40 text-sm tracking-tight">Select a conversation</span>
            )}
          </div>

          {/* Header actions — always show call/video/settings; overflow rest into More menu on mobile */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Voice call — always visible */}
            <button
              className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-30 active:scale-95"
              title="Voice call"
              disabled={!selectedConversation || !!activeCall}
              onClick={() => handleStartCall("audio")}
            >
              <Phone className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            {/* Video call — always visible */}
            <button
              className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-30 active:scale-95"
              title="Video call"
              disabled={!selectedConversation || !!activeCall}
              onClick={() => handleStartCall("video")}
            >
              <Video className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            {/* Settings — always visible */}
            <button
              onClick={() => setShowSettings(true)}
              className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
              title="Settings"
            >
              <SettingsIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </button>
            {/* More menu — Search & Group info (on small screens) */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition"
                title="More"
              >
                <MoreVertical className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 rounded-xl bg-[#12141b]/95 backdrop-blur-2xl border border-white/10 shadow-xl min-w-[160px] overflow-hidden animate-[fade-in_0.15s_ease-out]">
                    <button
                      onClick={() => {
                        setShowSearch(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/85 hover:bg-white/[0.06] transition"
                    >
                      <Search className="h-4 w-4 shrink-0 text-white/60" />
                      <span>Search messages</span>
                    </button>
                    {selectedConversation?.type === "group" && (
                      <button
                        onClick={() => {
                          setShowGroupInfo(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/85 hover:bg-white/[0.06] transition"
                      >
                        <Users className="h-4 w-4 shrink-0 text-white/60" />
                        <span>Group info</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Search & Group info — visible on sm+ screens */}
            <div className="flex items-center gap-1 hidden sm:flex">
              <button
                onClick={() => setShowSearch(true)}
                className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition"
                title="Search messages"
              >
                <Search className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => {
                  if (selectedConversation?.type === "group") {
                    setShowGroupInfo(true);
                  }
                }}
                className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition disabled:opacity-30 disabled:cursor-not-allowed"
                title="Group info"
                disabled={selectedConversation?.type !== "group"}
              >
                <Users className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>

        {selectedConversation && user ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MessageList
                messages={messages}
                currentUserId={user._id}
                typingUser={typingUser}
                selectedUserName={
                  selectedConversation.type === "group"
                    ? selectedConversation.name || "Group"
                    : selectedPartner?.name || ""
                }
                loading={loading}
                onMessagesUpdate={setMessages}
              />
            </div>
            <div className="shrink-0">
              <AISuggestions
                lastReceivedMessage={lastReceivedMessage}
                onSelectSuggestion={handleAISuggestion}
              />
              <MessageInput
                value={newMessage}
                onChange={setNewMessage}
                onSend={handleSend}
                onSendMedia={handleSendMedia}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <div className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#a855f7] shadow-lg shadow-indigo-500/30 mb-5">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-white">Your messages</h3>
              <p className="text-sm text-white/50 mt-2">
                Pick a conversation from the sidebar to start chatting, or create a new group.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;