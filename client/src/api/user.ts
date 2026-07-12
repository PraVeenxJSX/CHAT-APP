import api from "./axios";
import type { User } from "../types";

export interface ProfileUpdatePayload {
  name?: string;
  username?: string;
  statusMessage?: string;
  dob?: string;
  showDob?: boolean;
  showOnlineStatus?: boolean;
  avatar?: File;
}

export const fetchUsers = async (token: string): Promise<User[]> => {
  const res = await api.get<User[]>("/api/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const checkUsername = async (
  username: string,
  token: string
): Promise<{ available: boolean; reason?: string; suggestions?: string[] }> => {
  const res = await api.get<{ available: boolean; reason?: string; suggestions?: string[] }>(
    "/api/users/check-username",
    {
      params: { username },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
};

export const updateMyProfile = async (
  updates: ProfileUpdatePayload,
  token: string
): Promise<User> => {
  const formData = new FormData();
  if (updates.name !== undefined) formData.append("name", updates.name);
  if (updates.username !== undefined) formData.append("username", updates.username);
  if (updates.statusMessage !== undefined) formData.append("statusMessage", updates.statusMessage);
  if (updates.dob !== undefined) formData.append("dob", updates.dob);
  if (updates.showDob !== undefined) formData.append("showDob", String(updates.showDob));
  if (updates.showOnlineStatus !== undefined) {
    formData.append("showOnlineStatus", String(updates.showOnlineStatus));
  }
  if (updates.avatar) formData.append("avatar", updates.avatar);

  const res = await api.put<User>("/api/users/profile", formData, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const getUserById = async (userId: string, token: string): Promise<User> => {
  const res = await api.get<User>(`/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
