import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import AdminLoginPage from "../pages/AdminLogin";
import Admin from "../pages/Admin";

function ProtectedAdmin({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-white/60 font-mono-data text-sm">Authenticating…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white/70">
        Admin access required.
      </div>
    );
  }
  return children;
}

function AdminLoginRoute() {
  const { user } = useAuth();
  if (user && user.role === "admin") return <Navigate to="/" replace />;
  return <AdminLoginPage />;
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AdminLoginRoute />} />
          <Route path="/" element={<ProtectedAdmin><Admin /></ProtectedAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
