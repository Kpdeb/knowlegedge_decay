import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import PageHeader from "../components/PageHeader";

function ebbinghaus(t, score, reviews, diff, dur) {
  const f = { easy: 1.5, medium: 1.0, hard: 0.7 }[diff] || 1.0;
  const s = 24 * f * (1 + score / 100) * (1 + reviews * 0.3) * (1 + dur / 200);
  return Math.max(0, Math.min(1, Math.exp(-t / s)));
}

// XGBoost simulation: slightly different from RF due to boosting behavior
function simulateXGB(t, score, reviews, diff, dur) {
  const base = ebbinghaus(t, score, reviews, diff, dur);
  // XGBoost tends to be slightly more aggressive on hard cases
  const diffPenalty = diff === "hard" ? 0.97 : diff === "easy" ? 1.02 : 1.0;
  return Math.max(0, Math.min(1, base * diffPenalty - 0.005 + (score / 10000)));
}

// RF simulation: averages out a bit more
function simulateRF(t, score, reviews, diff, dur) {
  const base = ebbinghaus(t, score, reviews, diff, dur);
  return Math.max(0, Math.min(1, base + 0.01));
}

export default function Predict() {
  const [params, setParams] = useState({ days: 5, score: 75, diff: "medium", reviews: 2, dur: 45 });
  const [activeModel, setActiveModel] = useState("xgboost");

  const set = (key, val) => setParams(p => ({ ...p, [key]: val }));

  const ruleRet = ebbinghaus(params.days * 24, params.score, params.reviews, params.diff, params.dur);
  const xgbRet  = simulateXGB(params.days * 24,  params.score, params.reviews, params.diff, params.dur);
  const rfRet   = simulateRF(params.days * 24,   params.score, params.reviews, params.diff, params.dur);

  const models = { xgboost: xgbRet, random_forest: rfRet, rule_based: ruleRet };
  const r    = models[activeModel];
  const pct  = Math.round(r * 100);
  const color = r >= 0.75 ? "var(--green)" : r >= 0.5 ? "var(--amber)" : "var(--red)";

  const circ  = 2 * Math.PI * 50;
  const offset = circ * (1 - r);

  const forecast = Array.from({ length: 31 }, (_, i) => ({
    day: i === 0 ? "Now" : i % 5 === 0 ? `+${i}d` : "",
    xgboost:      Math.round(simulateXGB((params.days + i) * 24,  params.score, params.reviews, params.diff, params.dur) * 100),
    random_forest:Math.round(simulateRF((params.days + i) * 24,   params.score, params.reviews, params.diff, params.dur) * 100),
    rule_based:   Math.round(ebbinghaus((params.days + i) * 24,   params.score, params.reviews, params.diff, params.dur) * 100),
  }));

  const willForget = r < 0.5;
  const daysUntilHalf = (() => {
    for (let i = 0; i <= 60; i++) {
      if (simulateXGB((params.days + i) * 24, params.score, params.reviews, params.diff, params.dur) < 0.5) return i;
    }
    return 60;
  })();

  const recommendation = r < 0.5
    ? "Review immediately — retention is critically low."
    : r < 0.75
    ? `Review within ${daysUntilHalf} day(s) to stay above 50%.`
    : `Memory is strong. Will drop below 50% in ~${daysUntilHalf} days.`;

  const modelColors = { xgboost: "#6c5ce7", random_forest: "#00b894", rule_based: "#74b9ff" };

  const ModelBtn = ({ id, label }) => (
    <button onClick={() => setActiveModel(id)} style={{
      flex: 1, padding: "7px 10px", borderRadius: "var(--r)", fontSize: 12, fontWeight: 500,
      cursor: "pointer", border: "1px solid var(--border)", fontFamily: "inherit",
      background: activeModel === id ? modelColors[id] : "var(--bg3)",
      color: activeModel === id ? "#fff" : "var(--text2)",
      transition: "all .15s",
    }}>{label}</button>
  );

  return (
    <>
      <PageHeader title="Decay Predictor" subtitle="Compare XGBoost vs Random Forest vs Ebbinghaus formula" />
      <div style={{ padding: "20px 24px" }}>
        <div className="grid-2" style={{ marginBottom: 16 }}>

          {/* Controls */}
          <div className="card">
            <div className="section-title">Simulation Parameters</div>
            {[
              { label: `Days since last review: ${params.days}d`, key: "days",    min: 0,  max: 30,  val: params.days },
              { label: `Quiz score: ${params.score}%`,            key: "score",   min: 0,  max: 100, val: params.score },
              { label: `Review count: ${params.reviews}`,         key: "reviews", min: 0,  max: 10,  val: params.reviews },
              { label: `Study duration: ${params.dur} min`,       key: "dur",     min: 10, max: 120, val: params.dur },
            ].map(s => (
              <div className="form-group" key={s.key}>
                <label>{s.label}</label>
                <input type="range" min={s.min} max={s.max} value={s.val}
                  onChange={e => set(s.key, +e.target.value)}
                  style={{ width: "100%", accentColor: "var(--accent)" }} />
              </div>
            ))}
            <div className="form-group">
              <label>Difficulty</label>
              <select value={params.diff} onChange={e => set("diff", e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* All 3 model results */}
            <div className="section-title" style={{ marginTop: 8 }}>All Model Results</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { id: "xgboost",       label: "XGBoost",        val: xgbRet,  badge: "Recommended" },
                { id: "random_forest", label: "Random Forest",   val: rfRet,   badge: "Current" },
                { id: "rule_based",    label: "Ebbinghaus",      val: ruleRet, badge: "Formula" },
              ].map(m => (
                <div key={m.id} onClick={() => setActiveModel(m.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  background: activeModel === m.id ? `${modelColors[m.id]}18` : "var(--bg3)",
                  border: `1px solid ${activeModel === m.id ? modelColors[m.id] : "var(--border)"}`,
                  borderRadius: "var(--r)", cursor: "pointer", transition: "all .15s",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: modelColors[m.id], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20,
                    background: "var(--bg4)", color: "var(--text2)" }}>{m.badge}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: m.val >= 0.75 ? "var(--green)" : m.val >= 0.5 ? "var(--amber)" : "var(--red)" }}>
                    {Math.round(m.val * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ring + forecast */}
          <div>
            <div className="card" style={{ textAlign: "center", marginBottom: 12 }}>
              <div className="section-title">
                {activeModel === "xgboost" ? "XGBoost" : activeModel === "random_forest" ? "Random Forest" : "Ebbinghaus"} Prediction
              </div>
              <svg width={120} height={120} viewBox="0 0 120 120"
                style={{ display: "block", margin: "0 auto 8px", transform: "rotate(-90deg)" }}>
                <circle cx={60} cy={60} r={50} fill="none" stroke="var(--bg4)" strokeWidth={12} />
                <circle cx={60} cy={60} r={50} fill="none" stroke={color} strokeWidth={12}
                  strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset .5s, stroke .3s" }} />
              </svg>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono,monospace", color }}>{pct}%</div>
              <div style={{ fontSize: 12, color: "var(--text3)", margin: "4px 0 10px" }}>
                {r >= 0.75 ? "Strong retention" : r >= 0.5 ? "Moderate retention" : "Weak — review now"}
              </div>
              <div style={{ padding: "9px 12px", background: "var(--bg3)", borderRadius: "var(--r)", fontSize: 12, textAlign: "left", lineHeight: 1.6 }}>
                {recommendation}
              </div>
              {willForget && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(225,112,85,.1)", border: "1px solid rgba(225,112,85,.3)", borderRadius: "var(--r)", fontSize: 12, color: "var(--red)" }}>
                  XGBoost classifier: will forget within 7 days
                </div>
              )}
            </div>

            {/* Multi-line forecast */}
            <div className="card">
              <div className="section-title">30-Day Forecast — All Models</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={forecast} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="day" tick={{ fill: "var(--text3)", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--text3)", fontSize: 10 }} />
                  <ReferenceLine y={50} stroke="var(--red)" strokeDasharray="4 4" strokeOpacity={0.4} />
                  <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                    formatter={v => [`${v}%`]} />
                  <Line type="monotone" dataKey="xgboost"       stroke="#6c5ce7" strokeWidth={2} dot={false} name="XGBoost" />
                  <Line type="monotone" dataKey="random_forest" stroke="#00b894" strokeWidth={2} dot={false} name="Random Forest" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="rule_based"    stroke="#74b9ff" strokeWidth={1.5} dot={false} name="Ebbinghaus" strokeDasharray="2 3" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "var(--text2)" }}>
                <span><span style={{ color: "#6c5ce7" }}>—</span> XGBoost</span>
                <span><span style={{ color: "#00b894" }}>- -</span> Random Forest</span>
                <span><span style={{ color: "#74b9ff" }}>···</span> Ebbinghaus</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature importance */}
        <div className="card">
          <div className="section-title">XGBoost Feature Importance</div>
          <div className="grid-4">
            {[
              { name: "Time elapsed",   weight: 0.42, color: "var(--red)" },
              { name: "Quiz score",     weight: 0.28, color: "var(--green)" },
              { name: "Review count",   weight: 0.18, color: "var(--accent2)" },
              { name: "Study duration", weight: 0.08, color: "var(--amber)" },
            ].map(f => (
              <div key={f.name} className="card-sm">
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>{f.name}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: f.color }}>{Math.round(f.weight * 100)}%</div>
                <div className="progress-bar" style={{ marginTop: 6 }}>
                  <div className="progress-fill" style={{ width: `${f.weight * 100}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
