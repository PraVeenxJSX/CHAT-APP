import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import type { Message, SendMessagePayload, Reaction } from "../types";

interface ReactionUpdate {
  messageId: string;
  reactions: Reaction[];
}

interface SocketContextType {
  onlineUsers: string[];
  typingUsers: Record<string, boolean>;
  sendMessage: (payload: SendMessagePayload) => void;
  emitTyping: (receiverId: string) => void;
  emitStopTyping: (receiverId: string) => void;
  markSeen: (senderId: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  addMessageListener: (cb: (msg: Message) => void) => () => void;
  addSeenListener: (cb: (data: { receiverId: string }) => void) => () => void;
  addDeliveredListener: (cb: (data: { messageId: string }) => void) => () => void;
  addReactionListener: (cb: (data: ReactionUpdate) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const messageListeners = useRef<Set<(msg: Message) => void>>(new Set());
  const seenListeners = useRef<Set<(data: { receiverId: string }) => void>>(new Set());
  const deliveredListeners = useRef<Set<(data: { messageId: string }) => void>>(new Set());
  const reactionListeners = useRef<Set<(data: ReactionUpdate) => void>>(new Set());

  useEffect(() => {
    if (!token || !user?._id) return;

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      query: { token },
    });
    socketRef.current = socket;

    socket.on("onlineUsers", (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on("receiveMessage", (msg: Message) => {
      messageListeners.current.forEach((cb) => cb(msg));
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[msg.sender._id];
        return next;
      });
    });

    socket.on("typing", ({ sender }: { sender: string }) => {
      setTypingUsers((prev) => ({ ...prev, [sender]: true }));
    });

    socket.on("stopTyping", ({ sender }: { sender: string }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[sender];
        return next;
      });
    });

    socket.on("messagesSeen", (data: { receiverId: string }) => {
      seenListeners.current.forEach((cb) => cb(data));
    });

    socket.on("messageDelivered", (data: { messageId: string }) => {
      deliveredListeners.current.forEach((cb) => cb(data));
    });

    socket.on("reactionUpdate", (data: ReactionUpdate) => {
      reactionListeners.current.forEach((cb) => cb(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?._id]);

  const sendMessage = useCallback((payload: SendMessagePayload) => {
    socketRef.current?.emit("sendMessage", payload);
  }, []);

  const emitTyping = useCallback((receiverId: string) => {
    socketRef.current?.emit("typing", { receiver: receiverId });
  }, []);

  const emitStopTyping = useCallback((receiverId: string) => {
    socketRef.current?.emit("stopTyping", { receiver: receiverId });
  }, []);

  const markSeen = useCallback((senderId: string) => {
    socketRef.current?.emit("markSeen", { senderId });
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit("addReaction", { messageId, emoji });
  }, []);

  const addMessageListener = useCallback((cb: (msg: Message) => void) => {
    messageListeners.current.add(cb);
    return () => {
      messageListeners.current.delete(cb);
    };
  }, []);

  const addSeenListener = useCallback(
    (cb: (data: { receiverId: string }) => void) => {
      seenListeners.current.add(cb);
      return () => {
        seenListeners.current.delete(cb);
      };
    },
    []
  );

  const addDeliveredListener = useCallback(
    (cb: (data: { messageId: string }) => void) => {
      deliveredListeners.current.add(cb);
      return () => {
        deliveredListeners.current.delete(cb);
      };
    },
    []
  );

  const addReactionListener = useCallback(
    (cb: (data: ReactionUpdate) => void) => {
      reactionListeners.current.add(cb);
      return () => {
        reactionListeners.current.delete(cb);
      };
    },
    []
  );

  return (
    <SocketContext.Provider
      value={{
        onlineUsers,
        typingUsers,
        sendMessage,
        emitTyping,
        emitStopTyping,
        markSeen,
        addReaction,
        addMessageListener,
        addSeenListener,
        addDeliveredListener,
        addReactionListener,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside SocketProvider");
  return ctx;
};

export default SocketContext;
