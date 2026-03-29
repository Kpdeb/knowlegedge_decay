# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│          React Frontend (port 3000)                 │
│  Dashboard │ Topics │ Quiz │ Planner │ Predict      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST (Axios)
                       ▼
┌─────────────────────────────────────────────────────┐
│           FastAPI Backend (port 8000)               │
│                                                     │
│  /auth      /topics    /quiz                        │
│  /prediction /schedule  /users                      │
│                                                     │
│  SQLAlchemy ORM   │   JWT Auth                      │
└──────────┬────────┴──────────────┬──────────────────┘
           │                       │ HTTP (httpx)
           ▼                       ▼
┌──────────────────┐   ┌───────────────────────────── ┐
│  PostgreSQL 15   │   │   ML Service (port 8001)     │
│                  │   │                              │
│  users           │   │  POST /predict               │
│  topics          │   │                              │
│  study_sessions  │   │  RandomForestRegressor       │
│  quiz_results    │   │  LogisticRegression          │
│  reviews         │   │  StandardScaler              │
│  predictions     │   │                              │
└──────────────────┘   └──────────────────────────────┘
```

## Component Responsibilities

### Frontend (React 18)
- Single-page application with React Router v6
- State management via `useState` / `useEffect` (no Redux needed at this scale)
- API calls centralised in `src/services/api.js`
- Charts: Recharts
- Auth: JWT stored in `localStorage`

### Backend (FastAPI)
- RESTful API with automatic OpenAPI docs at `/docs`
- JWT authentication via `python-jose` + `passlib`
- ORM: SQLAlchemy 2.0 (async-compatible)
- Calls ML service asynchronously via `httpx`; gracefully falls back to rule-based if ML is down

### ML Service (Python)
- Completely independent microservice
- Trains on startup from synthetic data if no saved model found
- Primary model: `RandomForestRegressor` (retention probability 0–1)
- Secondary model: `LogisticRegression` (binary: will forget within 7 days?)
- Falls back to Ebbinghaus formula if models not loaded

### Database (PostgreSQL 15)
- UUID primary keys throughout
- Cascading deletes: deleting a user removes all their data
- `reviews` table has a UNIQUE constraint on `(topic_id, user_id)` — one review record per topic per user, updated on each review

## Data Flow: Quiz Submission

```
1. User submits quiz answers (frontend)
2. POST /quiz  →  backend calculates attempt number
3. Backend updates review record:
   - increment review_count
   - set last_reviewed = now
   - compute next_review (spaced repetition)
   - compute retention_score (rule-based)
4. Backend returns QuizResultOut
5. Frontend shows score + confirmation
```

## Data Flow: Retention Prediction

```
1. GET /prediction/{topic_id}
2. Backend fetches topic + latest quiz + review record
3. Calls rule_based_retention() synchronously
4. Calls ML service via httpx (async, 3s timeout)
5. Saves prediction to predictions table
6. Returns both estimates + recommendation + next_review_days
```

## Forgetting Curve Model

```
R = exp(-t / S)

where:
  t = hours elapsed since last review
  S = memory strength (hours)
    = 24 × difficulty_factor
         × (1 + score/100)
         × (1 + review_count × 0.3)
         × (1 + study_duration/200)

difficulty_factor: easy=1.5, medium=1.0, hard=0.7
```

Memory strength S grows with:
- Higher quiz scores
- More review repetitions (spaced practice effect)
- Longer initial study sessions

## Spaced Repetition Schedule

| Review # | Interval | Rationale |
|----------|----------|-----------|
| 0→1 | 1 day | Consolidate same-day learning |
| 1→2 | 3 days | Short-term retention check |
| 2→3 | 7 days | Weekly reinforcement |
| 3→4 | 14 days | Bi-weekly long-term check |
| 4+ | 30 days | Monthly maintenance |

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- JWT expiry: 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- All topic/quiz/prediction endpoints are scoped to `current_user` — users cannot access each other's data
- CORS configured via `CORS_ORIGINS` env variable
- Change `SECRET_KEY` in production — use `openssl rand -hex 32`
