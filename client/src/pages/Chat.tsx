import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { connectSocket, disconnectSocket, getSocket } from "../socket";
import { useAuth } from "../context/AuthContext";

/* ------------------ TYPES ------------------ */
interface User {
  _id: string;
  name: string;
  email: string;
}

interface Message {
  _id: string;
  sender: { _id: string; name: string };
  receiver: { _id: string; name: string };
  content: string;
  status: "sent" | "delivered" | "seen";
  createdAt: string;
  type?: "text" | "image" | "file" | "audio" | "sticker";
  fileUrl?: string;
  fileType?: string;
}

/* ------------------ COMPONENT ------------------ */
const Chat = () => {
  const { logout, token, user } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------ USERS ------------------ */
  useEffect(() => {
    if (!token) return;

    api
      .get<User[]>("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data));
  }, [token]);

  /* ------------------ CHAT HISTORY ------------------ */
  useEffect(() => {
    if (!selectedUser || !token) return;

    setMessages([]);
    setAiReplies([]);

    api
      .get<Message[]>(`/api/messages/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMessages(res.data));

    getSocket()?.emit("markSeen", { senderId: selectedUser._id });
    setSidebarOpen(false);
  }, [selectedUser, token]);

  /* ------------------ SOCKET ------------------ */
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    // join room for this user so server can target this socket by user id
    if (user?._id) {
      socket.emit("join", { userId: user._id });
    }

    socket.on("receiveMessage", async (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTypingUser(null);
    });

    socket.on("onlineUsers", (users: string[]) => {
      console.log("🟢 Online users:", users);
      setOnlineUsers(users);
    });

    socket.on("typing", ({ sender }: { sender: string }) => {
      setTypingUser(sender);
    });

    socket.on("stopTyping", ({ sender }: { sender: string }) => {
      setTypingUser((curr) => (curr === sender ? null : curr));
    });

    return () => disconnectSocket();
  }, [token, user?._id]);

  /* ------------------ AUTO SCROLL ------------------ */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  /* ------------------ TYPING ------------------ */
  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (!selectedUser) return;

    const socket = getSocket();
    socket?.emit("typing", { receiver: selectedUser._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stopTyping", { receiver: selectedUser._id });
    }, 800);
  };

  /* ------------------ SEND ------------------ */
  const handleSend = () => {
    if (!newMessage.trim() || !selectedUser) return;

    getSocket()?.emit("sendMessage", {
      receiver: selectedUser._id,
      content: newMessage,
      type: "text",
    });

    getSocket()?.emit("stopTyping", { receiver: selectedUser._id });

    setNewMessage("");
    setAiReplies([]);
  };

  /* ------------------ UI ------------------ */
  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative">
      {/* 🍔 BURGER */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="absolute top-4 left-4 z-30 p-2 bg-white/10 rounded-lg"
      >
        ☰
      </button>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-20"
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed z-30 top-0 left-0 h-full w-72 p-4 bg-slate-900/95 backdrop-blur-xl transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h2 className="text-xl font-bold mb-4 text-center">💬 Chats</h2>

        {users.map((u) => {
          const isOnline = onlineUsers.includes(u._id);

          return (
            <div
              key={u._id}
              onClick={() => setSelectedUser(u)}
              className="p-3 rounded-xl cursor-pointer flex items-center gap-3 hover:bg-white/10"
            >
              {/* ✅ ONLINE DOT */}
              <span
                className={`h-3 w-3 rounded-full ${
                  isOnline ? "bg-green-400" : "bg-gray-500"
                }`}
              />
              <span>{u.name}</span>
            </div>
          );
        })}

        <button
          onClick={logout}
          className="mt-4 w-full bg-red-500 py-2 rounded-xl"
        >
          Logout
        </button>
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">
        {/* ✅ HEADER WITH ONLINE STATUS */}
        <div className="p-4 text-center font-semibold">
          {selectedUser?.name || "Select a chat"}
          {selectedUser && (
            <span className="ml-2 text-sm text-gray-400">
              {onlineUsers.includes(selectedUser._id)
                ? "● Online"
                : "● Offline"}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.sender._id === user?._id;

            return (
              <div
                key={msg._id}
                className={`flex ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-xl ${
                    isMe ? "bg-blue-500/30" : "bg-white/10"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* ✅ TYPING INDICATOR */}
          {typingUser === selectedUser?._id && (
            <div className="flex items-center gap-2 px-2">
              <img
                src="/Circles-menu-3.gif"
                alt="typing"
                className="h-6 opacity-80"
              />
              <span className="text-sm text-gray-400">
                {selectedUser.name} is typing…
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="p-4 flex gap-3 bg-white/5">
          <input
            className="flex-1 bg-white/10 rounded-xl px-4"
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message…"
          />

          <button
            onClick={handleSend}
            className="bg-blue-600 px-4 rounded-xl"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
