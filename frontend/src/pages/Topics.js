import React, { useEffect, useState } from "react";
import { getTopics, createTopic, deleteTopic, getPrediction } from "../services/api";
import PageHeader from "../components/PageHeader";
import RetentionBadge, { retentionColor } from "../components/RetentionBadge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Topics() {
  const [topics, setTopics]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm] = useState({ name: "", difficulty: "medium", description: "" });

  const load = () => getTopics().then(r => setTopics(r.data));
  useEffect(() => { load(); }, []);

  const selectTopic = (t) => {
    setSelected(t);
    setPrediction(null);
    getPrediction(t.id).then(r => setPrediction(r.data)).catch(() => {});
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createTopic(form);
    setShowModal(false);
    setForm({ name: "", difficulty: "medium", description: "" });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this topic?")) return;
    await deleteTopic(id);
    setSelected(null);
    load();
  };

  const decayCurve = prediction ? Array.from({ length: 15 }, (_, i) => {
    const r = prediction.retention_rule_based;
    const decay = r * Math.exp(-i * 0.08);
    return { day: `+${i}d`, retention: Math.round(Math.max(0, decay) * 100) };
  }) : [];

  // Model badge helper
  const modelBadge = (label, value, color) => (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 12px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
      {value != null
        ? <div style={{ fontSize: 20, fontWeight: 600, color }}>{Math.round(value * 100)}%</div>
        : <div style={{ fontSize: 13, color: "var(--text3)" }}>N/A</div>}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Topics"
        subtitle="Manage your study topics"
        action={<button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Topic</button>}
      />

      <div style={{ padding: "20px 24px" }}>
        <div className="grid-2">
          {/* List */}
          <div>
            <div className="section-title">All Topics ({topics.length})</div>
            {topics.map(t => (
              <div key={t.id} onClick={() => selectTopic(t)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: selected?.id === t.id ? "rgba(108,92,231,.08)" : "var(--bg3)",
                border: `1px solid ${selected?.id === t.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--r)", cursor: "pointer", marginBottom: 6, transition: "all .15s",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" }}>{t.difficulty}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                {prediction && selected?.id === t.id && <RetentionBadge value={prediction.retention_rule_based} />}
              </div>
            ))}
            {topics.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text3)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                No topics yet. Add one to get started!
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div>
            {!selected && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👆</div>
                Select a topic to view details
              </div>
            )}
            {selected && (
              <div className="card">
                {/* Header */}
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selected.name}</div>
                    <span className={`badge badge-${selected.difficulty === "easy" ? "green" : selected.difficulty === "hard" ? "red" : "amber"}`} style={{ marginTop: 6 }}>
                      {selected.difficulty}
                    </span>
                  </div>
                  <button className="btn-danger" onClick={() => handleDelete(selected.id)}>Delete</button>
                </div>

                {prediction ? (
                  <>
                    {/* Three model results side by side */}
                    <div className="section-title">Model Comparison</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      {modelBadge("Ebbinghaus", prediction.retention_rule_based, retentionColor(prediction.retention_rule_based))}
                      {modelBadge("Random Forest", prediction.retention_rf, prediction.retention_rf ? retentionColor(prediction.retention_rf) : "var(--text3)")}
                      {modelBadge("XGBoost", prediction.retention_xgb, prediction.retention_xgb ? retentionColor(prediction.retention_xgb) : "var(--text3)")}
                    </div>

                    {/* Model & dataset info */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(108,92,231,.15)", color: "var(--accent2)" }}>
                        Active model: {prediction.model_used || "rule_based"}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "var(--bg3)", color: "var(--text2)" }}>
                        Trained on: {prediction.dataset_used || "synthetic"}
                      </span>
                      {prediction.will_forget_in_7_days != null && (
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20,
                          background: prediction.will_forget_in_7_days ? "rgba(225,112,85,.15)" : "rgba(0,184,148,.15)",
                          color: prediction.will_forget_in_7_days ? "var(--red)" : "var(--green)" }}>
                          {prediction.will_forget_in_7_days ? "⚠ Will forget in 7d" : "✓ Safe for 7+ days"}
                        </span>
                      )}
                    </div>

                    {/* Next review */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <div className="card-sm" style={{ flex: 1 }}>
                        <div className="stat-label">Next Review</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>{prediction.next_review_days}d</div>
                      </div>
                      <div className="card-sm" style={{ flex: 1 }}>
                        <div className="stat-label">Hours Since Review</div>
                        <div style={{ fontSize: 18, fontWeight: 600 }}>{prediction.hours_since_review}h</div>
                      </div>
                    </div>

                    {/* Decay curve */}
                    <div className="section-title">Decay Curve (15 days)</div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={decayCurve} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <XAxis dataKey="day" tick={{ fill: "var(--text3)", fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "var(--text3)", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}%`]} />
                        <Line type="monotone" dataKey="retention" stroke="var(--accent)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Recommendation */}
                    <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg3)", borderRadius: "var(--r)", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                      {prediction.recommendation}
                    </div>
                  </>
                ) : (
                  <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading prediction…</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: 360, borderRadius: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Add New Topic</div>
            <div className="form-group"><label>Topic Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Binary Search Trees" />
            </div>
            <div className="form-group"><label>Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-group"><label>Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
            </div>
            <div className="flex gap-8" style={{ justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate}>Add Topic</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
