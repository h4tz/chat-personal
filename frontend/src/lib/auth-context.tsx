"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { username?: string; bio?: string }) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) {
      setToken(saved);
      auth
        .me(saved)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await auth.login({ email, password });
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    try {
      const me = await auth.me(res.access_token);
      setUser(me);
    } catch {
      localStorage.removeItem("token");
      setToken(null);
      throw new Error("Failed to verify account");
    }
  };

  const register = async (username: string, email: string, password: string) => {
    await auth.register({ username, email, password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { username?: string; bio?: string }) => {
    if (!token) throw new Error("Not authenticated");
    const updated = await auth.updateProfile(data, token);
    setUser(updated);
  };

  const updateAvatar = async (file: File) => {
    if (!token) throw new Error("Not authenticated");
    const updated = await auth.uploadAvatar(file, token);
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateProfile, updateAvatar, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
