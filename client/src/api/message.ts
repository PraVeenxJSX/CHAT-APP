import api from "./axios";
import type { Message, User } from "../types";

export const fetchChatHistory = async (
  userId: string,
  token: string
): Promise<Message[]> => {
  const res = await api.get<Message[]>(`/api/messages/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const fetchUsers = async (token: string): Promise<User[]> => {
  const res = await api.get<User[]>("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const uploadFile = async (
  file: File,
  token: string
): Promise<{ fileUrl: string; fileType: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/upload", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const fetchReplySuggestions = async (
  message: string,
  token: string
): Promise<string[]> => {
  const res = await api.post(
    "/api/ai/reply-suggestions",
    { message },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const searchMessages = async (
  query: string,
  token: string,
  conversationId?: string
): Promise<Message[]> => {
  const params = new URLSearchParams({ q: query });
  if (conversationId) params.append("conversationId", conversationId);
  const res = await api.get<Message[]>(`/api/messages/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
