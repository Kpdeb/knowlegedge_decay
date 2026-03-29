"""
Core Knowledge Decay / Forgetting Curve service.

Rule-based model: R = exp(-t / S)
  t = hours since last review
  S = memory strength = f(score, review_count, difficulty, study_duration)

ML models: delegates to the ml-service via HTTP.
  Primary:   XGBoost Regressor  (best accuracy)
  Secondary: Random Forest       (fallback)
  Classifier: XGBoost Classifier (will_forget in 7 days?)
"""

import math
import httpx
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")

INTERVALS = [1, 3, 7, 14, 30]
DIFFICULTY_FACTOR = {"easy": 1.5, "medium": 1.0, "hard": 0.7}


def memory_strength(score: float, review_count: int,
                    difficulty: str, study_duration: int = 30) -> float:
    diff_factor    = DIFFICULTY_FACTOR.get(difficulty, 1.0)
    score_factor   = 1 + (score / 100)
    review_factor  = 1 + (review_count * 0.3)
    duration_factor = 1 + (study_duration / 200)
    return 24 * diff_factor * score_factor * review_factor * duration_factor


def rule_based_retention(last_reviewed: datetime, score: float,
                         review_count: int, difficulty: str,
                         study_duration: int = 30) -> float:
    """Ebbinghaus forgetting curve: R = e^(-t/S)."""
    now = datetime.now(timezone.utc)
    if last_reviewed.tzinfo is None:
        last_reviewed = last_reviewed.replace(tzinfo=timezone.utc)
    hours_elapsed = (now - last_reviewed).total_seconds() / 3600
    s = memory_strength(score, review_count, difficulty, study_duration)
    return round(max(0.0, min(1.0, math.exp(-hours_elapsed / s))), 4)


def next_review_date(review_count: int, last_reviewed: datetime) -> datetime:
    idx = min(review_count, len(INTERVALS) - 1)
    days = INTERVALS[idx]
    if last_reviewed.tzinfo is None:
        last_reviewed = last_reviewed.replace(tzinfo=timezone.utc)
    return last_reviewed + timedelta(days=days)


def retention_label(retention: float) -> str:
    if retention >= 0.75:
        return "strong"
    elif retention >= 0.5:
        return "fading"
    return "critical"


def revision_recommendation(retention: float, days_until: int) -> str:
    if retention < 0.5:
        return "Review immediately — retention is critically low."
    elif retention < 0.75:
        return f"Review within {days_until} day(s) to avoid forgetting."
    return f"Memory is strong. Next review in {days_until} day(s)."


async def ml_prediction(
    time_since_last_review_hours: float,
    quiz_score: float,
    difficulty: str,
    review_count: int,
    study_duration: int,
) -> dict:
    """
    Calls the ML microservice.
    Returns full prediction dict including XGBoost, RF, classifier results.
    Returns empty dict if ML service is unavailable (graceful fallback).
    """
    diff_map = {"easy": 0, "medium": 1, "hard": 2}
    payload = {
        "time_since_last_review": time_since_last_review_hours,
        "quiz_score":             quiz_score,
        "difficulty":             diff_map.get(difficulty, 1),
        "review_count":           review_count,
        "study_duration":         study_duration,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(f"{ML_SERVICE_URL}/predict", json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return {}
