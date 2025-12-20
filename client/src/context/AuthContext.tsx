import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";


interface User {
  _id: string;
  name: string;
  email: string;
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  /* ------------------ RESTORE SESSION ------------------ */
  useEffect(() => {
    const savedToken = localStorage.getItem("token");

    if (savedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(savedToken);

        setToken(savedToken);
        setUser({
          _id: decoded.id,
          name: decoded.name,
          email: decoded.email,
        });
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, []);

  /* ------------------ LOGIN ------------------ */
  const login = (token: string) => {
    const decoded = jwtDecode<DecodedToken>(token);

    localStorage.setItem("token", token);
    setToken(token);
    setUser({
      _id: decoded.id,
      name: decoded.name,
      email: decoded.email,
    });
  };

  /* ------------------ LOGOUT ------------------ */
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
export default AuthContext;