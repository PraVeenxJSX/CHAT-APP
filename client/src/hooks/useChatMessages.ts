import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { fetchChatHistory } from "../api/message";
import type { Message, User } from "../types";

export const useChatMessages = (selectedUser: User | null) => {
  const { token, user } = useAuth();
  const { addMessageListener, markSeen } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedUserRef = useRef(selectedUser);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Fetch history when selected user changes
  useEffect(() => {
    if (!selectedUser || !token) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setMessages([]);

    fetchChatHistory(selectedUser._id, token)
      .then((data) => setMessages(data))
      .finally(() => setLoading(false));

    markSeen(selectedUser._id);
  }, [selectedUser?._id, token, markSeen]);

  // Listen for new messages
  useEffect(() => {
    const unsub = addMessageListener((msg: Message) => {
      const currentSelected = selectedUserRef.current;
      if (!currentSelected || !user) return;

      const isSender = msg.sender._id === user._id && msg.receiver._id === currentSelected._id;
      const isReceiver = msg.sender._id === currentSelected._id && msg.receiver._id === user._id;

      if (isSender || isReceiver) {
        setMessages((prev) => [...prev, msg]);
        if (isReceiver) {
          markSeen(currentSelected._id);
        }
      }
    });

    return unsub;
  }, [addMessageListener, user, markSeen]);

  const addOptimisticMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  return { messages, loading, setMessages, addOptimisticMessage };
};
