"""Quiz submission and history endpoints."""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import QuizResult, Topic, Review, User
from models.schemas import QuizSubmit, QuizResultOut
from services.auth_service import get_current_user
from services.decay_service import next_review_date, rule_based_retention

router = APIRouter()


@router.post("", response_model=QuizResultOut)
def submit_quiz(
    body: QuizSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify topic ownership
    topic = db.query(Topic).filter(Topic.id == body.topic_id, Topic.user_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Count previous attempts for this topic
    attempt = db.query(QuizResult).filter(
        QuizResult.topic_id == body.topic_id,
        QuizResult.user_id == current_user.id,
    ).count() + 1

    quiz_result = QuizResult(
        topic_id=body.topic_id,
        user_id=current_user.id,
        score=body.score,
        total_questions=body.total_questions,
        time_taken=body.time_taken,
        attempt_number=attempt,
    )
    db.add(quiz_result)

    # Update or create review record
    review = db.query(Review).filter(
        Review.topic_id == body.topic_id,
        Review.user_id == current_user.id,
    ).first()

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    if review:
        review.review_count += 1
        review.last_reviewed = now
        review.next_review = next_review_date(review.review_count, now)
        review.retention_score = rule_based_retention(
            now, body.score, review.review_count, topic.difficulty
        )
    else:
        review = Review(
            topic_id=body.topic_id,
            user_id=current_user.id,
            review_count=1,
            last_reviewed=now,
            next_review=next_review_date(1, now),
            retention_score=rule_based_retention(now, body.score, 1, topic.difficulty),
        )
        db.add(review)

    db.commit()
    db.refresh(quiz_result)
    return quiz_result


@router.get("/{topic_id}/history", response_model=List[QuizResultOut])
def quiz_history(
    topic_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(QuizResult).filter(
        QuizResult.topic_id == topic_id,
        QuizResult.user_id == current_user.id,
    ).order_by(QuizResult.created_at.desc()).all()
