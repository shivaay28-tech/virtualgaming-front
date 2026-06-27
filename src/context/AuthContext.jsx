import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError, isBackendUnreachable } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  // null = checking, false = anon, object = user
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");

  const refresh = useCallback(async () => {
    setAuthStatus("checking");
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      setAuthStatus("authenticated");
      return data;
    } catch (e) {
      if (isBackendUnreachable(e)) {
        setAuthStatus("unavailable");
        return null;
      }
      setUser(false);
      setAuthStatus("anonymous");
      return null;
    }
  }, []);

  const retryAuth = useCallback(() => refresh(), [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (identifier, password) => {
    try {
      const { data } = await api.post("/auth/login", { identifier, password });
      setUser(data.user);
      setAuthStatus("authenticated");
      return { ok: true, user: data.user };
    } catch (e) {
      if (isBackendUnreachable(e)) {
        setAuthStatus("unavailable");
        return { ok: false, error: "Cannot reach the server. Please try again shortly." };
      }
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const { data } = await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setUser(data.user);
      setAuthStatus("authenticated");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  };

  const loginDemo = async () => {
    try {
      const { data } = await api.post("/auth/demo");
      setUser(data.user);
      setAuthStatus("authenticated");
      return { ok: true };
    } catch (e) {
      if (isBackendUnreachable(e)) {
        setAuthStatus("unavailable");
        return { ok: false, error: "Cannot reach the server. Please try again shortly." };
      }
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setUser(false);
    setAuthStatus("anonymous");
  };

  const setBalance = (b) => {
    setUser((u) => (u && typeof u === "object" ? { ...u, balance: b } : u));
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        authStatus,
        login,
        loginDemo,
        changePassword,
        logout,
        refresh,
        retryAuth,
        setBalance,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
