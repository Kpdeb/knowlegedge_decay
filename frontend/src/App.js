import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout       from "./components/Layout";
import Dashboard    from "./pages/Dashboard";
import Topics       from "./pages/Topics";
import Quiz         from "./pages/Quiz";
import Planner      from "./pages/Planner";
import Predict      from "./pages/Predict";
import Login        from "./pages/Login";

import "./index.css";

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  });

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/topics"   element={<Topics />} />
          <Route path="/quiz"     element={<Quiz />} />
          <Route path="/planner"  element={<Planner />} />
          <Route path="/predict"  element={<Predict />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
