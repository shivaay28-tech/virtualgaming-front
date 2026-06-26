import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "../App.css";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { GameProvider } from "../context/GameContext";
import Login from "../pages/Login";
import Game from "../pages/Game";
import AccountStatement from "../pages/AccountStatement";
import PnlReport from "../pages/PnlReport";
import ChangePassword from "../pages/ChangePassword";

function PasswordGate({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user?.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center felt-bg noise">
        <div className="text-white/60 font-mono-data text-sm">Authenticating…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <PasswordGate>{children}</PasswordGate>;
}

function AnonOnly({ children }) {
  const { user } = useAuth();
  if (user && typeof user === "object") {
    if (user.must_change_password) return <Navigate to="/change-password" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function PlayerApp() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AnonOnly><Login /></AnonOnly>} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/change-password" element={<Protected><ChangePassword /></Protected>} />
            <Route path="/" element={<Protected><GameProvider><Game /></GameProvider></Protected>} />
            <Route path="/statement" element={<Protected><AccountStatement /></Protected>} />
            <Route path="/pnl" element={<Protected><PnlReport /></Protected>} />
            <Route path="/table/*" element={<Navigate to="/" replace />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
