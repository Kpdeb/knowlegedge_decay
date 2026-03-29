"""Retention prediction endpoint — rule-based + XGBoost + Random Forest."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models.db_models import Topic, Review, QuizResult, User, Prediction
from models.schemas import PredictionOut
from services.auth_service import get_current_user
from services.decay_service import (
    rule_based_retention, ml_prediction, next_review_date,
    revision_recommendation, retention_label
)

router = APIRouter()


@router.get("/{topic_id}", response_model=PredictionOut)
async def get_prediction(
    topic_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = db.query(Topic).filter(
        Topic.id == topic_id, Topic.user_id == current_user.id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    review = db.query(Review).filter(
        Review.topic_id == topic_id, Review.user_id == current_user.id
    ).first()
    latest_quiz = db.query(QuizResult).filter(
        QuizResult.topic_id == topic_id, QuizResult.user_id == current_user.id
    ).order_by(QuizResult.created_at.desc()).first()

    now           = datetime.now(timezone.utc)
    last_reviewed = review.last_reviewed if review else topic.created_at
    if last_reviewed.tzinfo is None:
        last_reviewed = last_reviewed.replace(tzinfo=timezone.utc)

    review_count = review.review_count if review else 0
    quiz_score   = latest_quiz.score   if latest_quiz else 50
    hours_since  = (now - last_reviewed).total_seconds() / 3600

    # Rule-based (always runs)
    rule_ret = rule_based_retention(
        last_reviewed, quiz_score, review_count, topic.difficulty
    )

    # ML prediction (XGBoost primary, RF fallback, {} if service down)
    ml_result = await ml_prediction(
        hours_since, quiz_score, topic.difficulty, review_count, 30
    )

    # Extract individual model results
    retention_xgb  = ml_result.get("retention_xgb")
    retention_rf   = ml_result.get("retention_rf")
    best_ml        = ml_result.get("retention_probability")
    will_forget    = ml_result.get("will_forget_in_7_days")
    model_used     = ml_result.get("model_used", "rule_based")
    dataset_used   = ml_result.get("dataset_used", "unknown")

    # Next review
    nr         = next_review_date(review_count, last_reviewed)
    days_until = max(0, int((nr - now).total_seconds() / 86400))

    # Save best prediction to DB
    pred = Prediction(
        topic_id=topic_id,
        user_id=current_user.id,
        retention_rule_based=rule_ret,
        retention_ml=best_ml,
    )
    db.add(pred)
    db.commit()

    return PredictionOut(
        topic_id=topic_id,
        topic_name=topic.name,
        retention_rule_based=rule_ret,
        retention_xgb=retention_xgb,
        retention_rf=retention_rf,
        retention_ml=best_ml,
        will_forget_in_7_days=will_forget,
        model_used=model_used,
        dataset_used=dataset_used,
        recommendation=revision_recommendation(rule_ret, days_until),
        next_review_days=days_until,
        hours_since_review=round(hours_since, 1),
    )
