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
  description: string | undefined,
  token: string
): Promise<Conversation> => {
  const res = await api.post<Conversation>(
    "/api/conversations/group",
    { name, participantIds, description },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export interface GroupUpdatePayload {
  name?: string;
  description?: string;
  addParticipants?: string[];
  removeParticipants?: string[];
  onlyAdminsCanMessage?: boolean;
  disappearingMessagesSeconds?: number;
  avatar?: File;
}

export const updateGroupConversation = async (
  conversationId: string,
  updates: GroupUpdatePayload,
  token: string
): Promise<Conversation> => {
  const hasAvatar = !!updates.avatar;
  if (hasAvatar) {
    const formData = new FormData();
    if (updates.name !== undefined) formData.append("name", updates.name);
    if (updates.description !== undefined) formData.append("description", updates.description);
    if (updates.addParticipants) formData.append("addParticipants", JSON.stringify(updates.addParticipants));
    if (updates.removeParticipants) formData.append("removeParticipants", JSON.stringify(updates.removeParticipants));
    if (updates.onlyAdminsCanMessage !== undefined) {
      formData.append("onlyAdminsCanMessage", String(updates.onlyAdminsCanMessage));
    }
    if (updates.disappearingMessagesSeconds !== undefined) {
      formData.append("disappearingMessagesSeconds", String(updates.disappearingMessagesSeconds));
    }
    formData.append("avatar", updates.avatar as File);
    const res = await api.put<Conversation>(`/api/conversations/${conversationId}`, formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    });
    return res.data;
  }
  const res = await api.put<Conversation>(`/api/conversations/${conversationId}`, updates, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const deleteGroupConversation = async (
  conversationId: string,
  token: string
): Promise<void> => {
  await api.delete(`/api/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const muteGroupConversation = async (
  conversationId: string,
  durationHours: number | null,
  token: string
): Promise<{ muted: boolean; until?: string }> => {
  const res = await api.post<{ muted: boolean; until?: string }>(
    `/api/conversations/${conversationId}/mute`,
    { durationHours },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const promoteAdmin = async (
  conversationId: string,
  userId: string,
  token: string
): Promise<Conversation> => {
  const res = await api.post<Conversation>(
    `/api/conversations/${conversationId}/admins/${userId}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const demoteAdmin = async (
  conversationId: string,
  userId: string,
  token: string
): Promise<Conversation> => {
  const res = await api.delete<Conversation>(
    `/api/conversations/${conversationId}/admins/${userId}`,
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
