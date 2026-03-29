"""SQLAlchemy ORM models — mirror of database/schema.sql."""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, ARRAY, ForeignKey, TIMESTAMP, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email         = Column(String(255), unique=True, nullable=False)
    name          = Column(String(255), nullable=False)
    password_hash = Column(Text, nullable=False)
    created_at    = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at    = Column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    topics = relationship("Topic", back_populates="user", cascade="all, delete")


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (
        CheckConstraint("difficulty IN ('easy','medium','hard')", name="ck_difficulty"),
    )

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=False)
    difficulty  = Column(String(10), nullable=False, default="medium")
    description = Column(Text)
    tags        = Column(ARRAY(Text))
    created_at  = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at  = Column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user           = relationship("User", back_populates="topics")
    study_sessions = relationship("StudySession", back_populates="topic", cascade="all, delete")
    quiz_results   = relationship("QuizResult",   back_populates="topic", cascade="all, delete")
    review         = relationship("Review",        back_populates="topic", uselist=False, cascade="all, delete")


class StudySession(Base):
    __tablename__ = "study_sessions"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id       = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    study_duration = Column(Integer, nullable=False)   # minutes
    notes          = Column(Text)
    session_date   = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    topic = relationship("Topic", back_populates="study_sessions")


class QuizResult(Base):
    __tablename__ = "quiz_results"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id        = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    score           = Column(Integer, nullable=False)
    total_questions = Column(Integer, default=10)
    time_taken      = Column(Integer)   # seconds
    attempt_number  = Column(Integer, default=1)
    created_at      = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    topic = relationship("Topic", back_populates="quiz_results")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("topic_id", "user_id"),)

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id        = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    review_count    = Column(Integer, default=0)
    last_reviewed   = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    next_review     = Column(TIMESTAMP(timezone=True))
    retention_score = Column(Float)
    created_at      = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at      = Column(TIMESTAMP(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    topic = relationship("Topic", back_populates="review")


class Prediction(Base):
    __tablename__ = "predictions"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id             = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    user_id              = Column(UUID(as_uuid=True), ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    retention_rule_based = Column(Float, nullable=False)
    retention_ml         = Column(Float)
    predicted_at         = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    model_version        = Column(String(50), default="v1.0")
