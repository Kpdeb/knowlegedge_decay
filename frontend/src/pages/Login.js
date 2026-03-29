import React, { useState } from "react";
import { login, register } from "../services/api";

export default function Login({ onLogin }) {
  const [mode, setMode]       = useState("login"); // "login" | "register"
  const [form, setForm]       = useState({ email: "", password: "", name: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const fn = mode === "login" ? login : register;
      const { data } = await fn(form);
      onLogin(data.user, data.access_token);
    } catch (e) {
      setError(e?.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      <div style={{ width: 380, padding: "32px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16 }}>
        {/* Logo */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent2)", letterSpacing: ".05em", textTransform: "uppercase" }}>KnowDecay</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>AI Knowledge Retention Predictor</div>
        </div>

        {/* Tab */}
        <div style={{ display: "flex", background: "var(--bg3)", borderRadius: "var(--r)", padding: 4, marginBottom: 20 }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "7px", borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: mode === m ? "var(--bg2)" : "transparent",
              color: mode === m ? "var(--text)" : "var(--text2)",
              border: mode === m ? "1px solid var(--border)" : "none",
              cursor: "pointer", transition: "all .15s",
            }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Full Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Doe" />
          </div>
        )}
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Email</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="demo@knowdecay.ai" />
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 5 }}>Password</label>
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
            placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} />
        </div>

        {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 12, padding: "8px 12px", background: "rgba(225,112,85,.08)", borderRadius: "var(--r)" }}>{error}</div>}

        <button className="btn-primary" onClick={submit} disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 14 }}>
          {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--bg3)", borderRadius: "var(--r)", fontSize: 12, color: "var(--text3)" }}>
          Demo: <span style={{ color: "var(--accent2)" }}>demo@knowdecay.ai</span> / <span style={{ color: "var(--accent2)" }}>demo1234</span>
        </div>
      </div>
    </div>
  );
}
