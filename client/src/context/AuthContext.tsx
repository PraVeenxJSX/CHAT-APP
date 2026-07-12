import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";

interface User {
  _id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  statusMessage?: string;
  dob?: string;
  showDob?: boolean;
  showOnlineStatus?: boolean;
}

interface DecodedToken {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  setUser: (u: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;
    try {
      const res = await api.get<User>("/api/users/profile", {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      setUser(res.data);
    } catch {
      const decoded = jwtDecode<DecodedToken>(savedToken);
      setUser({
        _id: decoded.id,
        name: decoded.name,
        email: decoded.email,
      });
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;
    try {
      const decoded = jwtDecode<DecodedToken>(savedToken);
      setToken(savedToken);
      setUser({
        _id: decoded.id,
        name: decoded.name,
        email: decoded.email,
      });
      refreshUser();
    } catch {
      localStorage.removeItem("token");
    }
  }, [refreshUser]);

  const login = (token: string) => {
    const decoded = jwtDecode<DecodedToken>(token);
    localStorage.setItem("token", token);
    setToken(token);
    setUser({ _id: decoded.id, name: decoded.name, email: decoded.email });
    refreshUser();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
export default AuthContext;
