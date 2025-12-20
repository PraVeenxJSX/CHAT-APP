import api from "./axios";

export interface AuthResponse {
  _id: string;
  name: string;
  email: string;
  token: string;
}

export const loginUser = async (email: string, password: string) => {
  const res = await api.post<AuthResponse>("/api/auth/login", {
    email,
    password,
  });
  return res.data;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  const res = await api.post<AuthResponse>("/api/auth/register", {
    name,
    email,
    password,
  });
  return res.data;
};
