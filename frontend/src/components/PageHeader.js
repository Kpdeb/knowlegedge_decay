import React from "react";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      background: "var(--bg2)",
      borderBottom: "1px solid var(--border)",
      padding: "14px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
