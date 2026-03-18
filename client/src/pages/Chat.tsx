import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useChatMessages } from "../hooks/useChatMessages";
import { useNotifications } from "../hooks/useNotifications";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { fetchUsers } from "../api/message";
import ChatList from "../components/ChatList";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import AISuggestions from "../components/AISuggestions";
import SearchPanel from "../components/SearchPanel";
import type { User, SendMessagePayload, Message } from "../types";

const Chat = () => {
  const { logout, token, user } = useAuth();
  const { onlineUsers, typingUsers, sendMessage, emitTyping, emitStopTyping, addMessageListener } =
    useSocket();
  const { requestPermission, showNotification } = useNotifications();
  const { incrementUnread, clearUnread, getUnreadCount } = useUnreadCounts();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { messages, loading, setMessages } = useChatMessages(selectedUser);

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!token) return;
    fetchUsers(token).then(setUsers);
  }, [token]);

  // Listen for incoming messages for notifications
  useEffect(() => {
    const unsub = addMessageListener((msg: Message) => {
      // If message is from someone other than selected user, increment unread
      if (msg.sender._id !== user?._id && msg.sender._id !== selectedUser?._id) {
        incrementUnread(msg.sender._id);
        const senderName = users.find((u) => u._id === msg.sender._id)?.name || "Someone";
        showNotification(
          senderName,
          msg.content || "[Media message]"
        );
      }
    });
    return unsub;
  }, [addMessageListener, user, selectedUser, incrementUnread, showNotification, users]);

  const handleSelectUser = useCallback((u: User) => {
    setSelectedUser(u);
    setSidebarOpen(false);
    clearUnread(u._id);
  }, [clearUnread]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !selectedUser) return;

    sendMessage({
      receiver: selectedUser._id,
      content: newMessage,
      type: "text",
    });

    if (selectedUser) {
      emitStopTyping(selectedUser._id);
    }

    setNewMessage("");
  }, [newMessage, selectedUser, sendMessage, emitStopTyping]);

  const handleSendMedia = useCallback(
    (payload: Omit<SendMessagePayload, "receiver">) => {
      if (!selectedUser) return;
      sendMessage({
        receiver: selectedUser._id,
        ...payload,
      });
    },
    [selectedUser, sendMessage]
  );

  const handleTyping = useCallback(() => {
    if (selectedUser) emitTyping(selectedUser._id);
  }, [selectedUser, emitTyping]);

  const handleStopTyping = useCallback(() => {
    if (selectedUser) emitStopTyping(selectedUser._id);
  }, [selectedUser, emitStopTyping]);

  const handleAISuggestion = useCallback((text: string) => {
    setNewMessage(text);
  }, []);

  const typingUser =
    selectedUser && typingUsers[selectedUser._id] ? selectedUser._id : null;

  // Get last received message for AI suggestions
  const lastReceivedMessage = useMemo(() => {
    if (!messages.length || !user) return null;
    const received = messages.filter((m) => m.sender._id !== user._id);
    return received[received.length - 1] || null;
  }, [messages, user]);

  return (
    <div className="h-screen flex bg-cyber-bg cyber-grid-bg text-cyber-text relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="absolute inset-0 cyber-scanline pointer-events-none z-40" />

      {/* Search panel */}
      {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}

      {/* Hamburger button - mobile only */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-4 left-4 z-30 p-2.5 bg-cyber-surface border border-cyber-border rounded-lg md:hidden hover:border-cyber-cyan hover:shadow-neon-cyan transition-all duration-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-cyber-cyan"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Backdrop - mobile only */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-20 md:hidden animate-[fade-in_0.2s_ease-out]"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-30 top-0 left-0 h-full w-72 transition-transform duration-300 ease-out md:relative md:translate-x-0 md:w-80 md:border-r md:border-cyber-border ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ChatList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          onlineUsers={onlineUsers}
          onLogout={logout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          unreadCounts={Object.fromEntries(users.map((u) => [u._id, getUnreadCount(u._id)]))}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 bg-cyber-surface/80 backdrop-blur-sm border-b border-cyber-border flex items-center gap-3">
          <div className="flex-1 flex items-center justify-center gap-3">
            {selectedUser ? (
              <>
                {/* Avatar in header */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    onlineUsers.includes(selectedUser._id)
                      ? "border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan"
                      : "border-cyber-border bg-cyber-surface-light text-cyber-text-dim"
                  }`}
                >
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <span className="font-semibold text-cyber-text">
                    {selectedUser.name}
                  </span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        onlineUsers.includes(selectedUser._id)
                          ? "bg-cyber-lime shadow-neon-lime"
                          : "bg-cyber-text-dim"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        onlineUsers.includes(selectedUser._id)
                          ? "text-cyber-lime"
                          : "text-cyber-text-dim"
                      }`}
                    >
                      {onlineUsers.includes(selectedUser._id)
                        ? "Online"
                        : "Offline"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <span className="text-cyber-text-dim font-cyber tracking-wider text-sm">
                SELECT A CHAT
              </span>
            )}
          </div>

          {/* Search button */}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-cyber-text-dim hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded-lg transition-all duration-300"
            title="Search messages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {selectedUser && user ? (
          <>
            <MessageList
              messages={messages}
              currentUserId={user._id}
              typingUser={typingUser}
              selectedUserName={selectedUser.name}
              loading={loading}
              onMessagesUpdate={setMessages}
            />
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-cyber-text-dim">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 mx-auto mb-4 opacity-30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg font-cyber tracking-wider neon-text-cyan text-cyber-cyan/50">
                NEONCHAT
              </p>
              <p className="text-sm mt-2">
                Select a conversation from the sidebar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
