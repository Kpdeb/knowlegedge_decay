import React, { useEffect, useState } from "react";
import { getSchedule } from "../services/api";
import PageHeader from "../components/PageHeader";
import RetentionBadge from "../components/RetentionBadge";

const INTERVALS = [
  { day: 1,  label: "1st review",  desc: "Same day or next day" },
  { day: 3,  label: "2nd review",  desc: "After 3 days" },
  { day: 7,  label: "3rd review",  desc: "After 1 week" },
  { day: 14, label: "4th review",  desc: "After 2 weeks" },
  { day: 30, label: "5th review",  desc: "After 1 month" },
];

function RevItem({ item }) {
  const d = new Date(item.next_review);
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r)", marginBottom: 6 }}>
      <div style={{ width: 44, height: 44, borderRadius: "var(--r)", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.1, flexShrink: 0 }}>
        {day}<span style={{ fontSize: 10, opacity: .7 }}>{mon}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.topic_name}</div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
          {item.days_until <= 0 ? "Overdue" : item.days_until === 1 ? "Tomorrow" : `In ${item.days_until} days`}
        </div>
      </div>
      <RetentionBadge value={item.retention} />
    </div>
  );
}

export default function Planner() {
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    getSchedule().then(r => setSchedule(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <PageHeader title="Revision Planner" subtitle="Spaced repetition schedule based on the Ebbinghaus curve" />
      <div style={{ padding: "20px 24px" }}>
        <div className="grid-2">
          <div>
            {schedule?.overdue?.length > 0 && (
              <>
                <div className="section-title" style={{ color: "var(--red)" }}>⚠ Overdue ({schedule.overdue.length})</div>
                {schedule.overdue.map(i => <RevItem key={i.topic_id} item={i} />)}
              </>
            )}
            <div className="section-title" style={{ marginTop: schedule?.overdue?.length ? 14 : 0 }}>
              Due Today ({schedule?.today?.length ?? 0})
            </div>
            {schedule?.today?.length
              ? schedule.today.map(i => <RevItem key={i.topic_id} item={i} />)
              : <div style={{ fontSize: 12, color: "var(--text3)", padding: "6px 0 12px" }}>Nothing due today 🎉</div>
            }
            <div className="section-title" style={{ marginTop: 14 }}>This Week ({schedule?.this_week?.length ?? 0})</div>
            {schedule?.this_week?.map(i => <RevItem key={i.topic_id} item={i} />)}
          </div>

          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title">Spaced Repetition Intervals</div>
              {INTERVALS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--accent2)", flexShrink: 0 }}>
                    d{s.day}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.desc}</div>
                  </div>
                  <div className="progress-bar" style={{ width: 80 }}>
                    <div className="progress-fill" style={{ width: `${100 - i * 18}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-title">Ebbinghaus Formula</div>
              <div style={{ background: "var(--bg3)", borderRadius: "var(--r)", padding: "12px 14px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--accent2)", marginBottom: 10 }}>
                R = e<sup>-t/S</sup>
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.8 }}>
                <div><strong style={{ color: "var(--text)" }}>R</strong> = retention probability</div>
                <div><strong style={{ color: "var(--text)" }}>t</strong> = time elapsed since last review (hours)</div>
                <div><strong style={{ color: "var(--text)" }}>S</strong> = memory strength = f(score, reviews, difficulty)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
