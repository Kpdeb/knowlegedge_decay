/**
 * API service — real backend calls with demo-mode fallback.
 * If REACT_APP_API_URL is not set (Vercel preview), all calls return
 * realistic mock data so the UI is fully explorable without a backend.
 */

import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "";
const DEMO_MODE = !API_URL;

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Mock helpers ──────────────────────────────────────────────────────────────
const MOCK_USER  = { id: "demo-user", email: "demo@knowdecay.ai", name: "Demo User", created_at: new Date().toISOString() };
const MOCK_TOKEN = "demo-token";
const DIFF_FACTOR = { easy: 1.5, medium: 1.0, hard: 0.7 };
const INTERVALS   = [1, 3, 7, 14, 30];

const defaultTopics = () => [
  { id:"t1", name:"Binary Search",      difficulty:"medium", description:"", tags:[], created_at: new Date(Date.now()-864e5*10).toISOString() },
  { id:"t2", name:"OS Scheduling",       difficulty:"hard",   description:"", tags:[], created_at: new Date(Date.now()-864e5*15).toISOString() },
  { id:"t3", name:"Hash Tables",         difficulty:"medium", description:"", tags:[], created_at: new Date(Date.now()-864e5*8).toISOString()  },
  { id:"t4", name:"Dynamic Programming", difficulty:"hard",   description:"", tags:[], created_at: new Date(Date.now()-864e5*20).toISOString() },
  { id:"t5", name:"Graph Algorithms",    difficulty:"hard",   description:"", tags:[], created_at: new Date(Date.now()-864e5*12).toISOString() },
  { id:"t6", name:"Sorting Algorithms",  difficulty:"easy",   description:"", tags:[], created_at: new Date(Date.now()-864e5*25).toISOString() },
];
const defaultReviews = () => ({
  t1: { review_count:3, last_reviewed: Date.now()-864e5*2,   score:82 },
  t2: { review_count:1, last_reviewed: Date.now()-864e5*5,   score:65 },
  t3: { review_count:4, last_reviewed: Date.now()-864e5*1,   score:90 },
  t4: { review_count:2, last_reviewed: Date.now()-864e5*7,   score:55 },
  t5: { review_count:2, last_reviewed: Date.now()-864e5*4,   score:70 },
  t6: { review_count:6, last_reviewed: Date.now()-864e5*0.5, score:95 },
});

const getTopicsStore  = () => JSON.parse(localStorage.getItem("mock_topics")  || "null") || defaultTopics();
const getReviewsStore = () => JSON.parse(localStorage.getItem("mock_reviews") || "null") || defaultReviews();
const setTopicsStore  = (v) => localStorage.setItem("mock_topics",  JSON.stringify(v));
const setReviewsStore = (v) => localStorage.setItem("mock_reviews", JSON.stringify(v));

function calcRet(lastReviewed, score, reviewCount, difficulty) {
  const hrs = (Date.now() - lastReviewed) / 3600000;
  const s   = 24 * (DIFF_FACTOR[difficulty]||1) * (1+score/100) * (1+reviewCount*0.3);
  return Math.max(0, Math.min(1, Math.exp(-hrs/s)));
}
function nextRevDate(reviewCount, lastReviewed) {
  return new Date(lastReviewed + INTERVALS[Math.min(reviewCount, INTERVALS.length-1)] * 864e5);
}
function ok(data, status=200) { return Promise.resolve({ data, status }); }

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) => DEMO_MODE
  ? ok({ access_token:MOCK_TOKEN, token_type:"bearer", user:{...MOCK_USER, name:data.name, email:data.email} })
  : api.post("/auth/register", data);

export const login = (data) => {
  if (!DEMO_MODE) return api.post("/auth/login", data);
  if (data.email==="demo@knowdecay.ai" && data.password==="demo1234")
    return ok({ access_token:MOCK_TOKEN, token_type:"bearer", user:MOCK_USER });
  return Promise.reject({ response:{ data:{ detail:"Use demo@knowdecay.ai / demo1234" } } });
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getMe        = () => DEMO_MODE ? ok(MOCK_USER) : api.get("/users/me");
export const getDashboard = () => {
  if (!DEMO_MODE) return api.get("/users/me/dashboard");
  const topics  = getTopicsStore();
  const reviews = getReviewsStore();
  const topicData = topics.map(t => {
    const r   = reviews[t.id] || { review_count:0, last_reviewed:Date.now(), score:60 };
    const ret = calcRet(r.last_reviewed, r.score, r.review_count, t.difficulty);
    const nr  = nextRevDate(r.review_count, r.last_reviewed);
    return { id:t.id, name:t.name, difficulty:t.difficulty, retention:Math.round(ret*1000)/1000,
      label: ret>=0.75?"Strong":ret>=0.5?"Fading":"Critical",
      review_count:r.review_count, next_review_days:Math.max(0,Math.round((nr-Date.now())/864e5)) };
  });
  const avg = topicData.reduce((a,t)=>a+t.retention,0)/topicData.length;
  return ok({ total_topics:topics.length, avg_retention:Math.round(avg*1000)/1000,
    critical_count:topicData.filter(t=>t.retention<0.5).length,
    due_today:topicData.filter(t=>t.next_review_days<=1).length,
    topics:topicData.sort((a,b)=>a.retention-b.retention) });
};

// ── Topics ────────────────────────────────────────────────────────────────────
export const getTopics   = () => DEMO_MODE ? ok(getTopicsStore()) : api.get("/topics");
export const createTopic = (data) => {
  if (!DEMO_MODE) return api.post("/topics", data);
  const topics = getTopicsStore();
  const t = { id:"t"+Date.now(), ...data, tags:data.tags||[], created_at:new Date().toISOString() };
  setTopicsStore([...topics, t]);
  const reviews = getReviewsStore();
  reviews[t.id] = { review_count:0, last_reviewed:Date.now(), score:60 };
  setReviewsStore(reviews);
  return ok(t, 201);
};
export const updateTopic = (id, data) => {
  if (!DEMO_MODE) return api.put(`/topics/${id}`, data);
  const topics = getTopicsStore().map(t => t.id===id ? {...t,...data} : t);
  setTopicsStore(topics);
  return ok(topics.find(t=>t.id===id));
};
export const deleteTopic = (id) => {
  if (!DEMO_MODE) return api.delete(`/topics/${id}`);
  setTopicsStore(getTopicsStore().filter(t=>t.id!==id));
  const reviews = getReviewsStore(); delete reviews[id]; setReviewsStore(reviews);
  return ok(null, 204);
};

// ── Quiz ─────────────────────────────────────────────────────────────────────
export const submitQuiz  = (data) => {
  if (!DEMO_MODE) return api.post("/quiz", data);
  const reviews = getReviewsStore();
  const r = reviews[data.topic_id] || { review_count:0, last_reviewed:Date.now(), score:60 };
  r.review_count++; r.last_reviewed=Date.now(); r.score=data.score;
  reviews[data.topic_id] = r; setReviewsStore(reviews);
  return ok({ id:"q"+Date.now(), topic_id:data.topic_id, score:data.score,
    total_questions:data.total_questions||10, attempt_number:r.review_count,
    created_at:new Date().toISOString() });
};
export const quizHistory = (topicId) => DEMO_MODE ? ok([]) : api.get(`/quiz/${topicId}/history`);

// ── Predictions ───────────────────────────────────────────────────────────────
export const getPrediction = (topicId) => {
  if (!DEMO_MODE) return api.get(`/prediction/${topicId}`);
  const topic = getTopicsStore().find(t=>t.id===topicId);
  if (!topic) return Promise.reject({ response:{ data:{ detail:"Not found" } } });
  const r   = getReviewsStore()[topicId] || { review_count:0, last_reviewed:Date.now(), score:60 };
  const ret = calcRet(r.last_reviewed, r.score, r.review_count, topic.difficulty);
  const nr  = nextRevDate(r.review_count, r.last_reviewed);
  const days = Math.max(0, Math.round((nr-Date.now())/864e5));
  const hrs  = Math.round((Date.now()-r.last_reviewed)/360000)/10;
  const rec  = ret<0.5 ? "Review immediately — retention is critically low."
             : ret<0.75 ? `Review within ${days} day(s) to stay above 50%.`
             : `Memory is strong. Next review in ${days} days.`;
  return ok({ topic_id:topicId, topic_name:topic.name,
    retention_rule_based:Math.round(ret*10000)/10000,
    retention_xgb:Math.round(Math.max(0,Math.min(1,ret*0.97+0.005))*10000)/10000,
    retention_rf:Math.round(Math.max(0,Math.min(1,ret*1.01))*10000)/10000,
    retention_ml:Math.round(Math.max(0,Math.min(1,ret*0.97+0.005))*10000)/10000,
    will_forget_in_7_days:ret<0.5, model_used:"xgboost", dataset_used:"synthetic_500k",
    recommendation:rec, next_review_days:days, hours_since_review:hrs });
};

// ── Schedule ──────────────────────────────────────────────────────────────────
export const getSchedule = (topicIds) => {
  if (!DEMO_MODE) return api.post("/schedule", { topic_ids:topicIds||null });
  const topics  = getTopicsStore();
  const reviews = getReviewsStore();
  const now     = Date.now();
  const overdue=[], today=[], this_week=[], later=[];
  topics.forEach(t => {
    const r   = reviews[t.id] || { review_count:0, last_reviewed:now, score:60 };
    const ret = calcRet(r.last_reviewed, r.score, r.review_count, t.difficulty);
    const nr  = nextRevDate(r.review_count, r.last_reviewed);
    const days = Math.round((nr-now)/864e5);
    const item = { topic_id:t.id, topic_name:t.name, next_review:nr.toISOString(),
      days_until:days, retention:Math.round(ret*1000)/1000,
      priority: ret<0.5?"critical":ret<0.75?"fading":"strong" };
    if (days<0) overdue.push(item);
    else if (days<=1) today.push(item);
    else if (days<=7) this_week.push(item);
    else later.push(item);
  });
  return ok({ overdue, today, this_week, later });
};

export default api;
