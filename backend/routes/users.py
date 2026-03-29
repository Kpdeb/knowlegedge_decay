"""User profile and dashboard endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models.db_models import Topic, Review, QuizResult, User
from models.schemas import UserOut, DashboardOut
from services.auth_service import get_current_user
from services.decay_service import rule_based_retention, next_review_date, retention_label

router = APIRouter()


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/dashboard", response_model=DashboardOut)
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topics = db.query(Topic).filter(Topic.user_id == current_user.id).all()
    now = datetime.now(timezone.utc)
    topic_data = []
    retention_sum = 0.0
    critical_count = 0
    due_today = 0

    for topic in topics:
        review = db.query(Review).filter(Review.topic_id == topic.id).first()
        latest_quiz = db.query(QuizResult).filter(QuizResult.topic_id == topic.id).order_by(QuizResult.created_at.desc()).first()

        last_reviewed = review.last_reviewed if review else topic.created_at
        if last_reviewed.tzinfo is None:
            last_reviewed = last_reviewed.replace(tzinfo=timezone.utc)

        review_count = review.review_count if review else 0
        quiz_score = latest_quiz.score if latest_quiz else 50

        ret = rule_based_retention(last_reviewed, quiz_score, review_count, topic.difficulty)
        nr = next_review_date(review_count, last_reviewed)
        days_until = int((nr - now).total_seconds() / 86400)

        retention_sum += ret
        if ret < 0.5:
            critical_count += 1
        if days_until <= 1:
            due_today += 1

        topic_data.append({
            "id": str(topic.id),
            "name": topic.name,
            "difficulty": topic.difficulty,
            "retention": round(ret, 3),
            "label": retention_label(ret),
            "review_count": review_count,
            "next_review_days": days_until,
        })

    avg_ret = round(retention_sum / len(topics), 3) if topics else 0.0

    return DashboardOut(
        total_topics=len(topics),
        avg_retention=avg_ret,
        critical_count=critical_count,
        due_today=due_today,
        topics=sorted(topic_data, key=lambda x: x["retention"]),
    )
