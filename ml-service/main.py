"""
ML Microservice — FastAPI v2.0
POST /predict  — retention prediction (XGBoost primary, RF fallback)
GET  /models   — which models are loaded + training metrics
GET  /health   — health check
"""

import os
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional

from prediction.predictor import predict_retention, get_model_info

app = FastAPI(
    title="KnowDecay ML Service",
    description="XGBoost + Random Forest retention predictor with Duolingo dataset support",
    version="2.0.0",
)


class PredictRequest(BaseModel):
    time_since_last_review: float = Field(gt=0,   description="Hours since last review")
    quiz_score:             float = Field(ge=0, le=100)
    difficulty:             int   = Field(ge=0, le=2, description="0=easy 1=medium 2=hard")
    review_count:           int   = Field(ge=0)
    study_duration:         int   = Field(ge=1,   description="Study time in minutes")


class PredictResponse(BaseModel):
    retention_rule_based:  float
    retention_rf:          Optional[float]
    retention_xgb:         Optional[float]
    retention_probability: float
    will_forget_in_7_days: Optional[bool]
    model_used:            str
    dataset_used:          str


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    result = predict_retention(
        time_since_last_review=body.time_since_last_review,
        quiz_score=body.quiz_score,
        difficulty=body.difficulty,
        review_count=body.review_count,
        study_duration=body.study_duration,
    )
    return PredictResponse(**result)


@app.get("/models")
def model_info():
    """Returns which models are loaded and their training metrics."""
    return get_model_info()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service", "version": "2.0.0"}
