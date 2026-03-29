"""Revision schedule endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models.db_models import Topic, Review, QuizResult, User
from models.schemas import ScheduleOut, RevisionItem, ScheduleRequest
from services.auth_service import get_current_user
from services.decay_service import rule_based_retention, next_review_date, retention_label

router = APIRouter()


@router.post("", response_model=ScheduleOut)
def generate_schedule(
    body: ScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Topic).filter(Topic.user_id == current_user.id)
    if body.topic_ids:
        query = query.filter(Topic.id.in_(body.topic_ids))
    topics = query.all()

    now = datetime.now(timezone.utc)
    overdue, today, this_week, later = [], [], [], []

    for topic in topics:
        review = next((r for r in (db.query(Review).filter(Review.topic_id == topic.id).first(),) if r), None)
        latest_quiz = db.query(QuizResult).filter(QuizResult.topic_id == topic.id).order_by(QuizResult.created_at.desc()).first()

        last_reviewed = review.last_reviewed if review else topic.created_at
        if last_reviewed.tzinfo is None:
            last_reviewed = last_reviewed.replace(tzinfo=timezone.utc)

        review_count = review.review_count if review else 0
        quiz_score = latest_quiz.score if latest_quiz else 50

        retention = rule_based_retention(last_reviewed, quiz_score, review_count, topic.difficulty)
        nr = next_review_date(review_count, last_reviewed)
        days_until = int((nr - now).total_seconds() / 86400)
        label = retention_label(retention)

        item = RevisionItem(
            topic_id=topic.id,
            topic_name=topic.name,
            next_review=nr,
            days_until=days_until,
            retention=retention,
            priority=label,
        )

        if days_until < 0:
            overdue.append(item)
        elif days_until == 0:
            today.append(item)
        elif days_until <= 7:
            this_week.append(item)
        else:
            later.append(item)

    return ScheduleOut(overdue=overdue, today=today, this_week=this_week, later=later)
