import React, { useEffect, useState } from "react";
import { getTopics, submitQuiz } from "../services/api";
import PageHeader from "../components/PageHeader";

// Local quiz question bank (in a real app, these come from the backend / LLM)
const QUESTIONS = {
  default: [
    { q: "What is the time complexity of binary search?", opts: ["O(n)", "O(log n)", "O(n²)", "O(1)"], ans: 1 },
    { q: "Which data structure uses LIFO ordering?", opts: ["Queue", "Stack", "Heap", "Graph"], ans: 1 },
    { q: "What is a hash collision?", opts: ["When two keys map to the same index", "When a key is not found", "When a hash is empty", "When a loop runs too long"], ans: 0 },
    { q: "Dynamic programming solves problems by:", opts: ["Recursion only", "Brute force", "Overlapping subproblems + memoisation", "Sorting first"], ans: 2 },
  ],
};

export default function Quiz() {
  const [topics, setTopics]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [qi, setQi]             = useState(0);
  const [score, setScore]       = useState(0);
  const [answered, setAnswered] = useState(null);
  const [done, setDone]         = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { getTopics().then(r => setTopics(r.data)); }, []);

  const qs = QUESTIONS[selected?.name] || QUESTIONS.default;

  const startQuiz = (t) => {
    setSelected(t); setQi(0); setScore(0); setAnswered(null); setDone(false);
  };

  const answer = (i) => {
    if (answered !== null) return;
    setAnswered(i);
    if (i === qs[qi].ans) setScore(s => s + 1);
  };

  const next = () => {
    if (qi + 1 >= qs.length) {
      const pct = Math.round((score + (answered === qs[qi].ans ? 1 : 0)) / qs.length * 100);
      setDone(true);
      setSubmitting(true);
      submitQuiz({ topic_id: selected.id, score: pct, total_questions: qs.length })
        .finally(() => setSubmitting(false));
    } else {
      setQi(q => q + 1);
      setAnswered(null);
    }
  };

  const finalScore = Math.round(score / qs.length * 100);

  return (
    <>
      <PageHeader title="Quiz Engine" subtitle="Test your knowledge and update your retention score" />
      <div style={{ padding: "20px 24px" }}>
        <div className="grid-2">
          {/* Topic selector */}
          <div>
            <div className="section-title">Choose a Topic</div>
            {topics.map(t => (
              <div key={t.id} onClick={() => startQuiz(t)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: selected?.id === t.id ? "rgba(108,92,231,.08)" : "var(--bg3)",
                border: `1px solid ${selected?.id === t.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--r)", cursor: "pointer", marginBottom: 6, transition: "all .15s",
              }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                <span className={`badge badge-${t.difficulty === "easy" ? "green" : t.difficulty === "hard" ? "red" : "amber"}`}>{t.difficulty}</span>
              </div>
            ))}
            {topics.length === 0 && <div style={{ color: "var(--text3)", fontSize: 13 }}>Add topics first to take a quiz.</div>}
          </div>

          {/* Quiz panel */}
          <div>
            {!selected && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
                Select a topic to start the quiz
              </div>
            )}

            {selected && !done && (
              <div className="card">
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>Question {qi + 1} / {qs.length}</span>
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>{selected.name}</span>
                </div>
                <div style={{ padding: "12px 14px", background: "var(--bg3)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--r)", fontSize: 14, fontWeight: 500, lineHeight: 1.5, marginBottom: 16 }}>
                  {qs[qi].q}
                </div>
                {qs[qi].opts.map((opt, i) => {
                  let bg = "var(--bg3)", border = "var(--border)", color = "var(--text)";
                  if (answered !== null) {
                    if (i === qs[qi].ans)  { bg = "rgba(0,184,148,.12)"; border = "var(--green)"; color = "var(--green)"; }
                    else if (i === answered){ bg = "rgba(225,112,85,.12)"; border = "var(--red)";   color = "var(--red)"; }
                  }
                  return (
                    <div key={i} onClick={() => answer(i)} style={{
                      padding: "9px 12px", border: `1px solid ${border}`, borderRadius: "var(--r)",
                      cursor: answered === null ? "pointer" : "default", fontSize: 13, marginBottom: 6,
                      background: bg, color, transition: "all .15s",
                    }}>
                      {opt}
                    </div>
                  );
                })}
                {answered !== null && (
                  <button className="btn-primary" onClick={next} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
                    {qi + 1 >= qs.length ? "Finish" : "Next →"}
                  </button>
                )}
              </div>
            )}

            {selected && done && (
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{finalScore >= 70 ? "🎉" : "📚"}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: finalScore >= 70 ? "var(--green)" : "var(--red)", marginBottom: 4 }}>
                  {finalScore}%
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
                  {score} / {qs.length} correct
                </div>
                {submitting
                  ? <div style={{ fontSize: 12, color: "var(--text3)" }}>Saving results…</div>
                  : <div style={{ fontSize: 12, color: "var(--green)" }}>✓ Retention score updated for <strong>{selected.name}</strong></div>
                }
                <button className="btn-primary" onClick={() => startQuiz(selected)} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
                  Retake Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
