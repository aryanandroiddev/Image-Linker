import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl, setAuthToken } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface AuthUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "pixeldrop_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setAuthToken(storedToken);

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      }
    } catch (e) {
      await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/login", baseUrl);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
    }
    setUser({ id: data.id, username: data.username, email: data.email, createdAt: data.createdAt });
  }

  async function register(username: string, email: string, password: string) {
    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/register", baseUrl);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
    }
    setUser({ id: data.id, username: data.username, email: data.email, createdAt: data.createdAt });
  }

  async function forgotPassword(email: string): Promise<string> {
    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/forgot-password", baseUrl);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      throw new Error("Failed");
    }

    const data = await res.json();
    return data.message;
  }

  async function logout() {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/logout", baseUrl);
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      await fetch(url.toString(), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {}
    await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    setAuthToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, isLoading, login, register, forgotPassword, logout }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
