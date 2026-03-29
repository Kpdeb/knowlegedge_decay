import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getDashboard } from "../services/api";
import PageHeader from "../components/PageHeader";
import RetentionBadge, { retentionColor } from "../components/RetentionBadge";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24, color: "var(--text3)" }}>Loading…</div>;
  if (!data)   return <div style={{ padding: 24, color: "var(--text3)" }}>Could not load dashboard — is the API running?</div>;

  const chartData = data.topics.map(t => ({
    name: t.name.length > 12 ? t.name.slice(0, 12) + "…" : t.name,
    retention: Math.round(t.retention * 100),
    raw: t.retention,
  }));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your knowledge health overview" />
      <div style={{ padding: "20px 24px" }}>

        {/* Stat cards */}
        <div className="grid-4 mb-16">
          {[
            { label: "Avg Retention", val: `${Math.round(data.avg_retention * 100)}%`, sub: `${data.total_topics} topics`, color: "var(--accent2)" },
            { label: "Total Topics",  val: data.total_topics,   sub: "being tracked",       color: "var(--text)" },
            { label: "Critical",      val: data.critical_count, sub: "retention < 50%",     color: "var(--red)" },
            { label: "Due Today",     val: data.due_today,      sub: "scheduled revisions", color: "var(--amber)" },
          ].map(s => (
            <div key={s.label} className="card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          {/* Bar chart */}
          <div className="card">
            <div className="section-title">Retention by Topic</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 20, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: "var(--text3)", fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--text3)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Retention"]}
                />
                <Bar dataKey="retention" radius={[4,4,0,0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={retentionColor(d.raw)} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Topic health list */}
          <div className="card" style={{ overflow: "auto", maxHeight: 310 }}>
            <div className="section-title">Topic Health</div>
            {data.topics.map(t => (
              <div key={t.id} style={{ marginBottom: 10 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</span>
                  <RetentionBadge value={t.retention} />
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.round(t.retention * 100)}%`, background: retentionColor(t.retention) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
