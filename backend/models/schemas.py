"""Pydantic request/response schemas."""

from __future__ import annotations
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: UUID
    email: str
    name: str
    created_at: datetime
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Topics ────────────────────────────────────────────────────────────────────

class TopicCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    description: Optional[str] = None
    tags: Optional[List[str]] = []

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    difficulty: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class TopicOut(BaseModel):
    id: UUID
    name: str
    difficulty: str
    description: Optional[str]
    tags: Optional[List[str]]
    created_at: datetime
    class Config: from_attributes = True


# ── Study Session ──────────────────────────────────────────────────────────────

class StudySessionCreate(BaseModel):
    topic_id: UUID
    study_duration: int = Field(gt=0, description="Study time in minutes")
    notes: Optional[str] = None

class StudySessionOut(BaseModel):
    id: UUID
    topic_id: UUID
    study_duration: int
    session_date: datetime
    class Config: from_attributes = True


# ── Quiz ─────────────────────────────────────────────────────────────────────

class QuizSubmit(BaseModel):
    topic_id: UUID
    score: int = Field(ge=0, le=100)
    total_questions: int = Field(default=10, ge=1)
    time_taken: Optional[int] = None   # seconds

class QuizResultOut(BaseModel):
    id: UUID
    topic_id: UUID
    score: int
    total_questions: int
    attempt_number: int
    created_at: datetime
    class Config: from_attributes = True


# ── Predictions ───────────────────────────────────────────────────────────────

class PredictionOut(BaseModel):
    topic_id: UUID
    topic_name: str
    retention_rule_based: float
    retention_xgb: Optional[float]        # XGBoost model result
    retention_rf: Optional[float]         # Random Forest model result
    retention_ml: Optional[float]         # Best ML model result (xgb > rf)
    will_forget_in_7_days: Optional[bool] # XGBoost classifier result
    model_used: str                        # which model produced retention_ml
    dataset_used: str                      # what data it was trained on
    recommendation: str
    next_review_days: int
    hours_since_review: float


# ── Schedule ──────────────────────────────────────────────────────────────────

class ScheduleRequest(BaseModel):
    topic_ids: Optional[List[UUID]] = None   # None = all user topics

class RevisionItem(BaseModel):
    topic_id: UUID
    topic_name: str
    next_review: datetime
    days_until: int
    retention: float
    priority: str   # critical / soon / ok

class ScheduleOut(BaseModel):
    overdue: List[RevisionItem]
    today:   List[RevisionItem]
    this_week: List[RevisionItem]
    later:   List[RevisionItem]


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardOut(BaseModel):
    total_topics: int
    avg_retention: float
    critical_count: int
    due_today: int
    topics: List[dict]
