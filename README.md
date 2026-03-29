# 🧠 KnowDecay — AI Knowledge Decay Predictor

Predicts when you'll forget a concept using **Ebbinghaus Forgetting Curve + XGBoost + Random Forest**, then schedules optimal revision using spaced repetition.

---

## 🚀 Quick Start

### Option A — Vercel (frontend only, 2 minutes, free)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR_NAME/knowledge-decay-predictor.git
git push -u origin main

# 2. Go to vercel.com → New Project → import repo
#    Root Directory: frontend
#    Leave REACT_APP_API_URL empty (auto demo mode)
#    Deploy → live in 90 seconds

# Demo login: demo@knowdecay.ai / demo1234
```

### Option B — Docker (full stack, local)

```bash
cp .env.example .env
docker-compose up --build

# Frontend:  http://localhost:3000
# API docs:  http://localhost:8000/docs
# ML health: http://localhost:8001/health
```

> ML model trains automatically on first startup (~2 minutes for 500k synthetic rows)

### Option C — Render (full cloud deployment)

```bash
# 1. Push to GitHub (same as Option A step 1)
# 2. Go to render.com → New → Blueprint → connect repo
#    Render reads render.yaml and creates: DB + Backend + ML Service
# 3. Set REACT_APP_API_URL on Vercel to your Render backend URL
```

---

## 📂 Project Structure

```
knowledge-decay-predictor/
├── frontend/                    React 18 app
│   ├── src/pages/               Dashboard, Topics, Quiz, Planner, Predict, Login
│   ├── src/components/          Layout, PageHeader, RetentionBadge
│   ├── src/services/api.js      All API calls + demo mode fallback
│   ├── nginx.conf               Production SPA routing
│   └── Dockerfile               Multi-stage: build → nginx
│
├── backend/                     FastAPI Python backend
│   ├── main.py                  App factory + CORS + router registration
│   ├── database.py              SQLAlchemy engine + session
│   ├── models/
│   │   ├── db_models.py         ORM: User, Topic, QuizResult, Review, Prediction
│   │   └── schemas.py           Pydantic request/response schemas
│   ├── routes/
│   │   ├── auth.py              POST /auth/register, /auth/login
│   │   ├── topics.py            CRUD /topics
│   │   ├── quiz.py              POST /quiz, GET /quiz/{id}/history
│   │   ├── predictions.py       GET /prediction/{id} — all 3 models
│   │   ├── schedule.py          POST /schedule — spaced repetition planner
│   │   └── users.py             GET /users/me, /users/me/dashboard
│   └── services/
│       ├── decay_service.py     Ebbinghaus formula + ML service client
│       └── auth_service.py      JWT + bcrypt helpers
│
├── ml-service/                  Python ML microservice
│   ├── training/train.py        Trains RF + XGBoost (real data or synthetic)
│   ├── prediction/predictor.py  Loads models, runs inference
│   ├── main.py                  FastAPI: POST /predict, GET /models
│   └── data/                    Place Duolingo CSV here for real training
│       └── README.md            Download instructions
│
├── database/schema.sql          PostgreSQL DDL + demo seed user
├── docker-compose.yml           Full local stack
├── render.yaml                  Render cloud blueprint
├── vercel.json                  Vercel SPA routing
├── .env.example                 All required environment variables
├── KnowDecay_Training_Colab.ipynb  Ready-to-run Colab notebook
└── docs/
    ├── architecture.md          System diagram + data flows
    ├── api.md                   Full REST API reference
    └── deployment.md            Step-by-step Vercel + Render guide
```

---

## 🤖 ML Models

| Model | Task | Accuracy | File |
|-------|------|----------|------|
| **XGBoost Regressor** | Retention score (0–1) | MAE ~0.02 | `xgboost_regressor.joblib` |
| **Random Forest** | Retention score (0–1) | MAE ~0.04 | `random_forest.joblib` |
| **XGBoost Classifier** | Will forget in 7 days? | ~96% | `xgboost_classifier.joblib` |
| **Ebbinghaus formula** | Fallback — always runs | Rule-based | `decay_service.py` |

**Priority:** XGBoost → Random Forest → Ebbinghaus (never fails)

### Train with real Duolingo data

```bash
# Download: kaggle.com/datasets/aravinii/duolingo-spaced-repetition-data
cp ~/Downloads/duolingo_data.csv ml-service/data/

cd ml-service
pip install -r requirements.txt
python training/train.py --rows 500000
# Models saved to models/saved/ — drop them in and restart
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, get JWT |
| GET | `/users/me/dashboard` | Dashboard summary |
| POST | `/topics` | Add topic |
| GET | `/topics` | List topics |
| DELETE | `/topics/{id}` | Delete topic |
| POST | `/quiz` | Submit quiz + update retention |
| GET | `/prediction/{id}` | XGBoost + RF + formula results |
| POST | `/schedule` | Spaced repetition schedule |
| GET | `/health` | Health check |
| GET | `/docs` | Interactive Swagger docs |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Recharts |
| Backend | FastAPI, SQLAlchemy, Pydantic, JWT |
| Database | PostgreSQL 15 |
| ML | XGBoost 2.0, scikit-learn, joblib |
| Auth | python-jose + passlib (bcrypt) |
| Containers | Docker + Docker Compose |
| Deploy | Vercel (frontend) + Render (backend + ML + DB) |

---

## 🔐 Demo Credentials

```
Email:    demo@knowdecay.ai
Password: demo1234
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (backend) | PostgreSQL connection string |
| `SECRET_KEY` | Yes (backend) | JWT signing key (use `openssl rand -hex 32`) |
| `ML_SERVICE_URL` | Yes (backend) | ML microservice URL |
| `CORS_ORIGINS` | Yes (backend) | Allowed frontend origins |
| `REACT_APP_API_URL` | Optional (frontend) | Backend URL — empty = demo mode |

---

## 📊 Spaced Repetition Intervals

Day 1 → Day 3 → Day 7 → Day 14 → Day 30

Formula: **R = e^(−t/S)** where S = memory strength (score × reviews × difficulty × duration)
