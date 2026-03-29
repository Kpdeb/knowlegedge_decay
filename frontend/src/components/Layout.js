import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { path: "/",        label: "Dashboard",  icon: "⊞" },
  { path: "/topics",  label: "Topics",     icon: "≡" },
  { path: "/quiz",    label: "Quiz",       icon: "?" },
  { path: "/planner", label: "Planner",    icon: "📅" },
  { path: "/predict", label: "Predict",    icon: "~" },
];

export default function Layout({ user, onLogout, children }) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: 200, minWidth: 200,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        padding: "16px 0",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 16px 16px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)", letterSpacing: ".05em", textTransform: "uppercase" }}>
            KnowDecay
          </div>
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>AI Retention Predictor</div>
        </div>

        {/* Nav */}
        {navItems.map(({ path, label, icon }) => {
          const active = pathname === path;
          return (
            <div key={path} onClick={() => navigate(path)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 16px", cursor: "pointer",
              color: active ? "var(--accent2)" : "var(--text2)",
              background: active ? "rgba(108,92,231,.12)" : "transparent",
              borderLeft: `2px solid ${active ? "var(--accent)" : "transparent"}`,
              fontSize: 13, transition: "all .15s",
            }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </div>
          );
        })}

        {/* User */}
        <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
          <button className="btn-ghost" onClick={onLogout} style={{ width: "100%", justifyContent: "center", padding: "6px", fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
