import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { fetchChatHistory } from "../api/message";
import { getConversationMessages } from "../api/conversation";
import type { Message, Conversation } from "../types";

export const useChatMessages = (selectedConversation: Conversation | null) => {
  const { token, user } = useAuth();
  const { addMessageListener, markSeen } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedConvRef = useRef(selectedConversation);

  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  // Fetch history when selected conversation changes
  useEffect(() => {
    if (!selectedConversation || !token || !user) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setMessages([]);

    if (selectedConversation.type === "group") {
      // Group: fetch via conversation endpoint
      getConversationMessages(selectedConversation._id, token)
        .then((data) => setMessages(data))
        .finally(() => setLoading(false));
    } else {
      // Direct: find partner and fetch via existing message endpoint
      const partner = selectedConversation.participants.find(
        (p) => p._id !== user._id
      );
      if (partner) {
        fetchChatHistory(partner._id, token)
          .then((data) => setMessages(data))
          .finally(() => setLoading(false));
        markSeen(partner._id);
      } else {
        setLoading(false);
      }
    }
  }, [selectedConversation?._id, token, markSeen, user]);

  // Listen for new messages
  useEffect(() => {
    const unsub = addMessageListener((msg: Message) => {
      const currentConv = selectedConvRef.current;
      if (!currentConv || !user) return;

      if (currentConv.type === "group") {
        // Group: match by conversationId
        if (msg.conversationId === currentConv._id) {
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        }
      } else {
        // Direct: match by sender/receiver
        const partner = currentConv.participants.find(
          (p) => p._id !== user._id
        );
        if (!partner) return;

        const isSender =
          msg.sender._id === user._id && msg.receiver?._id === partner._id;
        const isReceiver =
          msg.sender._id === partner._id && msg.receiver?._id === user._id;

        if (isSender || isReceiver) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          if (isReceiver) {
            markSeen(partner._id);
          }
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
