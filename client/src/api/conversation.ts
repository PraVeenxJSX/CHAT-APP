import api from "./axios";
import type { Conversation, Message } from "../types";

export const fetchConversations = async (token: string): Promise<Conversation[]> => {
  const res = await api.get<Conversation[]>("/api/conversations", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getOrCreateDirectConversation = async (
  partnerId: string,
  token: string
): Promise<Conversation> => {
  const res = await api.post<Conversation>(
    "/api/conversations/direct",
    { partnerId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const createGroupConversation = async (
  name: string,
  participantIds: string[],
  token: string
): Promise<Conversation> => {
  const res = await api.post<Conversation>(
    "/api/conversations/group",
    { name, participantIds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const updateGroupConversation = async (
  conversationId: string,
  updates: { name?: string; addParticipants?: string[]; removeParticipants?: string[] },
  token: string
): Promise<Conversation> => {
  const res = await api.put<Conversation>(
    `/api/conversations/${conversationId}`,
    updates,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const getConversationMessages = async (
  conversationId: string,
  token: string
): Promise<Message[]> => {
  const res = await api.get<Message[]>(
    `/api/conversations/${conversationId}/messages`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const leaveGroup = async (
  conversationId: string,
  token: string
): Promise<void> => {
  await api.post(
    `/api/conversations/${conversationId}/leave`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
