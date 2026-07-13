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
import type {
  Message,
  SendMessagePayload,
  Reaction,
  CallInvitePayload,
  CallAcceptedPayload,
  CallRejectedPayload,
  CallBusyPayload,
  CallCanceledPayload,
  CallOfferPayload,
  CallAnswerPayload,
  CallIcePayload,
  CallTogglePayload,
  CallHangupPayload,
  CallTarget,
} from "../types";

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

  /* Call signaling */
  callInvite: (payload: {
    callId: string;
    type: "audio" | "video";
    target: CallTarget;
    caller: { _id: string; name: string; avatar?: string };
  }) => Promise<{ ok: boolean; recipients: string[] }>;
  callCancel: (callId: string, recipients: string[]) => void;
  callAccept: (callId: string, conversationId: string | undefined, to: string | undefined, acceptedBy: { _id: string; name: string; avatar?: string }) => void;
  callReject: (callId: string, to: string, reason?: string) => void;
  callBusy: (callId: string, to: string) => void;
  callOffer: (p: { callId: string; to: string; from: string; sdp: RTCSessionDescriptionInit }) => void;
  callAnswer: (p: { callId: string; to: string; from: string; sdp: RTCSessionDescriptionInit }) => void;
  callIce: (p: { callId: string; to: string; from: string; candidate: RTCIceCandidateInit }) => void;
  callToggle: (p: { callId: string; kind: "mic" | "cam"; enabled: boolean; to?: string; conversationId?: string }) => void;
  callHangup: (p: { callId: string; to?: string; conversationId?: string }) => void;

  addCallInviteListener: (cb: (data: CallInvitePayload) => void) => () => void;
  addCallAcceptedListener: (cb: (data: CallAcceptedPayload) => void) => () => void;
  addCallRejectedListener: (cb: (data: CallRejectedPayload) => void) => () => void;
  addCallBusyListener: (cb: (data: CallBusyPayload) => void) => () => void;
  addCallCanceledListener: (cb: (data: CallCanceledPayload) => void) => () => void;
  addCallOfferListener: (cb: (data: CallOfferPayload) => void) => () => void;
  addCallAnswerListener: (cb: (data: CallAnswerPayload) => void) => () => void;
  addCallIceListener: (cb: (data: CallIcePayload) => void) => () => void;
  addCallToggleListener: (cb: (data: CallTogglePayload) => void) => () => void;
  addCallHangupListener: (cb: (data: CallHangupPayload) => void) => () => void;
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

  const callInviteListeners = useRef<Set<(data: CallInvitePayload) => void>>(new Set());
  const callAcceptedListeners = useRef<Set<(data: CallAcceptedPayload) => void>>(new Set());
  const callRejectedListeners = useRef<Set<(data: CallRejectedPayload) => void>>(new Set());
  const callBusyListeners = useRef<Set<(data: CallBusyPayload) => void>>(new Set());
  const callCanceledListeners = useRef<Set<(data: CallCanceledPayload) => void>>(new Set());
  const callOfferListeners = useRef<Set<(data: CallOfferPayload) => void>>(new Set());
  const callAnswerListeners = useRef<Set<(data: CallAnswerPayload) => void>>(new Set());
  const callIceListeners = useRef<Set<(data: CallIcePayload) => void>>(new Set());
  const callToggleListeners = useRef<Set<(data: CallTogglePayload) => void>>(new Set());
  const callHangupListeners = useRef<Set<(data: CallHangupPayload) => void>>(new Set());

  useEffect(() => {
    if (!token || !user?._id) return;

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      query: { token },
    });
    socketRef.current = socket;

    socket.on("onlineUsers", (users: string[]) => setOnlineUsers(users));

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

    /* Call events */
    socket.on("call:invite", (data: CallInvitePayload) => {
      callInviteListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:accept", (data: CallAcceptedPayload) => {
      callAcceptedListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:reject", (data: CallRejectedPayload) => {
      callRejectedListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:busy", (data: CallBusyPayload) => {
      callBusyListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:cancel", (data: CallCanceledPayload) => {
      callCanceledListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:offer", (data: CallOfferPayload) => {
      callOfferListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:answer", (data: CallAnswerPayload) => {
      callAnswerListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:ice", (data: CallIcePayload) => {
      callIceListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:toggle", (data: CallTogglePayload) => {
      callToggleListeners.current.forEach((cb) => cb(data));
    });
    socket.on("call:hangup", (data: CallHangupPayload) => {
      callHangupListeners.current.forEach((cb) => cb(data));
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

  const emitAck = <T,>(event: string, payload: unknown): Promise<T> =>
    new Promise((resolve) => {
      const s = socketRef.current;
      if (!s) {
        resolve(undefined as unknown as T);
        return;
      }
      s.emit(event, payload, (response: T) => resolve(response));
      setTimeout(() => resolve(undefined as unknown as T), 10000);
    });

  const callInvite: SocketContextType["callInvite"] = useCallback(
    (payload) => emitAck<{ ok: boolean; recipients: string[] }>("call:invite", payload),
    []
  );

  const callCancel = useCallback((callId: string, recipients: string[]) => {
    socketRef.current?.emit("call:cancel", { callId, recipients });
  }, []);

  const callAccept = useCallback(
    (
      callId: string,
      conversationId: string | undefined,
      to: string | undefined,
      acceptedBy: { _id: string; name: string; avatar?: string }
    ) => {
      socketRef.current?.emit("call:accept", { callId, conversationId, to, acceptedBy });
    },
    []
  );

  const callReject = useCallback((callId: string, to: string, reason?: string) => {
    socketRef.current?.emit("call:reject", { callId, to, reason });
  }, []);

  const callBusy = useCallback((callId: string, to: string) => {
    socketRef.current?.emit("call:busy", { callId, to });
  }, []);

  const callOffer = useCallback(
    (p: { callId: string; to: string; from: string; sdp: RTCSessionDescriptionInit }) => {
      socketRef.current?.emit("call:offer", p);
    },
    []
  );

  const callAnswer = useCallback(
    (p: { callId: string; to: string; from: string; sdp: RTCSessionDescriptionInit }) => {
      socketRef.current?.emit("call:answer", p);
    },
    []
  );

  const callIce = useCallback(
    (p: { callId: string; to: string; from: string; candidate: RTCIceCandidateInit }) => {
      socketRef.current?.emit("call:ice", p);
    },
    []
  );

  const callToggle = useCallback(
    (p: { callId: string; kind: "mic" | "cam"; enabled: boolean; to?: string; conversationId?: string }) => {
      socketRef.current?.emit("call:toggle", p);
    },
    []
  );

  const callHangup = useCallback(
    (p: { callId: string; to?: string; conversationId?: string }) => {
      socketRef.current?.emit("call:hangup", p);
    },
    []
  );

  const addMessageListener = useCallback((cb: (msg: Message) => void) => {
    messageListeners.current.add(cb);
    return () => {
      messageListeners.current.delete(cb);
    };
  }, []);

  const addSeenListener = useCallback(
    (cb: (data: { receiverId: string }) => void) => {
      seenListeners.current.add(cb);
      return () => seenListeners.current.delete(cb);
    },
    []
  );

  const addDeliveredListener = useCallback(
    (cb: (data: { messageId: string }) => void) => {
      deliveredListeners.current.add(cb);
      return () => deliveredListeners.current.delete(cb);
    },
    []
  );

  const addReactionListener = useCallback(
    (cb: (data: ReactionUpdate) => void) => {
      reactionListeners.current.add(cb);
      return () => reactionListeners.current.delete(cb);
    },
    []
  );

  const addCallInviteListener = useCallback((cb: (data: CallInvitePayload) => void) => {
    callInviteListeners.current.add(cb);
    return () => callInviteListeners.current.delete(cb);
  }, []);

  const addCallAcceptedListener = useCallback(
    (cb: (data: CallAcceptedPayload) => void) => {
      callAcceptedListeners.current.add(cb);
      return () => callAcceptedListeners.current.delete(cb);
    },
    []
  );

  const addCallRejectedListener = useCallback(
    (cb: (data: CallRejectedPayload) => void) => {
      callRejectedListeners.current.add(cb);
      return () => callRejectedListeners.current.delete(cb);
    },
    []
  );

  const addCallBusyListener = useCallback((cb: (data: CallBusyPayload) => void) => {
    callBusyListeners.current.add(cb);
    return () => callBusyListeners.current.delete(cb);
  }, []);

  const addCallCanceledListener = useCallback(
    (cb: (data: CallCanceledPayload) => void) => {
      callCanceledListeners.current.add(cb);
      return () => callCanceledListeners.current.delete(cb);
    },
    []
  );

  const addCallOfferListener = useCallback((cb: (data: CallOfferPayload) => void) => {
    callOfferListeners.current.add(cb);
    return () => callOfferListeners.current.delete(cb);
  }, []);

  const addCallAnswerListener = useCallback((cb: (data: CallAnswerPayload) => void) => {
    callAnswerListeners.current.add(cb);
    return () => callAnswerListeners.current.delete(cb);
  }, []);

  const addCallIceListener = useCallback((cb: (data: CallIcePayload) => void) => {
    callIceListeners.current.add(cb);
    return () => callIceListeners.current.delete(cb);
  }, []);

  const addCallToggleListener = useCallback((cb: (data: CallTogglePayload) => void) => {
    callToggleListeners.current.add(cb);
    return () => callToggleListeners.current.delete(cb);
  }, []);

  const addCallHangupListener = useCallback((cb: (data: CallHangupPayload) => void) => {
    callHangupListeners.current.add(cb);
    return () => callHangupListeners.current.delete(cb);
  }, []);

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
        callInvite,
        callCancel,
        callAccept,
        callReject,
        callBusy,
        callOffer,
        callAnswer,
        callIce,
        callToggle,
        callHangup,
        addCallInviteListener,
        addCallAcceptedListener,
        addCallRejectedListener,
        addCallBusyListener,
        addCallCanceledListener,
        addCallOfferListener,
        addCallAnswerListener,
        addCallIceListener,
        addCallToggleListener,
        addCallHangupListener,
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
