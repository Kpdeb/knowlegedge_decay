import React from "react";

export function retentionColor(r) {
  if (r >= 0.75) return "var(--green)";
  if (r >= 0.50) return "var(--amber)";
  return "var(--red)";
}

export function retentionBadgeClass(r) {
  if (r >= 0.75) return "badge-green";
  if (r >= 0.50) return "badge-amber";
  return "badge-red";
}

export function retentionLabel(r) {
  if (r >= 0.75) return "Strong";
  if (r >= 0.50) return "Fading";
  return "Critical";
}

export default function RetentionBadge({ value }) {
  const pct = Math.round(value * 100);
  return (
    <span className={`badge ${retentionBadgeClass(value)}`}>{pct}%</span>
  );
}
