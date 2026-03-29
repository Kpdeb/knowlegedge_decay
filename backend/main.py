"""
KnowDecay Backend — FastAPI entry point.
All routers registered here. Tables auto-created on startup.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from database import engine, Base
from routes import topics, quiz, predictions, schedule, auth, users

# Auto-create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KnowDecay API",
    description="AI-powered knowledge retention predictor backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/auth",       tags=["Auth"])
app.include_router(users.router,       prefix="/users",      tags=["Users"])
app.include_router(topics.router,      prefix="/topics",     tags=["Topics"])
app.include_router(quiz.router,        prefix="/quiz",       tags=["Quiz"])
app.include_router(predictions.router, prefix="/prediction", tags=["Predictions"])
app.include_router(schedule.router,    prefix="/schedule",   tags=["Schedule"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "backend", "version": "2.0.0"}


@app.get("/", tags=["Health"])
def root():
    return {"message": "KnowDecay API running", "docs": "/docs"}
