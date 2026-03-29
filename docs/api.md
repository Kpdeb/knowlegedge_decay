# API Reference

Base URL: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Auth

### POST /auth/register
Create a new account.

**Body**
```json
{ "email": "user@example.com", "name": "Jane", "password": "secret123" }
```

**Response 201**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "uuid", "email": "user@example.com", "name": "Jane", "created_at": "..." }
}
```

---

### POST /auth/login
**Body**
```json
{ "email": "user@example.com", "password": "secret123" }
```
**Response 200** — same shape as register.

---

## Users

### GET /users/me
Returns current user profile.

### GET /users/me/dashboard
Returns retention summary across all topics.

**Response**
```json
{
  "total_topics": 6,
  "avg_retention": 0.71,
  "critical_count": 2,
  "due_today": 1,
  "topics": [
    { "id": "...", "name": "Binary Search", "difficulty": "medium",
      "retention": 0.82, "label": "Strong", "review_count": 3, "next_review_days": 5 }
  ]
}
```

---

## Topics

### POST /topics
```json
{ "name": "Binary Search Trees", "difficulty": "medium", "description": "BST ops", "tags": ["dsa","trees"] }
```

### GET /topics
Returns array of user's topics.

### GET /topics/{id}

### PUT /topics/{id}
Partial update — send only fields to change.

### DELETE /topics/{id}
Cascades: removes all related sessions, quizzes, reviews, predictions.

---

## Quiz

### POST /quiz
Submit a quiz result. Updates the review record and spaced-repetition schedule.

```json
{
  "topic_id": "uuid",
  "score": 85,
  "total_questions": 10,
  "time_taken": 120
}
```

**Response**
```json
{
  "id": "uuid", "topic_id": "uuid",
  "score": 85, "total_questions": 10,
  "attempt_number": 3, "created_at": "..."
}
```

### GET /quiz/{topic_id}/history
Returns all quiz attempts for a topic, newest first.

---

## Predictions

### GET /prediction/{topic_id}
Computes retention using both rule-based and ML models.

**Response**
```json
{
  "topic_id": "uuid",
  "topic_name": "Hash Tables",
  "retention_rule_based": 0.74,
  "retention_ml": 0.71,
  "recommendation": "Review within 3 day(s) to stay above 50%.",
  "next_review_days": 3,
  "hours_since_review": 48.2
}
```

---

## Schedule

### POST /schedule
Generate a full revision schedule. Pass `topic_ids: null` for all topics.

```json
{ "topic_ids": null }
```

**Response**
```json
{
  "overdue": [],
  "today": [
    { "topic_id": "...", "topic_name": "OS Scheduling", "next_review": "...",
      "days_until": 0, "retention": 0.45, "priority": "critical" }
  ],
  "this_week": [ ... ],
  "later": [ ... ]
}
```

---

## ML Service (port 8001)

### POST /predict
Called internally by the backend. Can also be called directly.

```json
{
  "time_since_last_review": 72.0,
  "quiz_score": 75.0,
  "difficulty": 1,
  "review_count": 2,
  "study_duration": 45
}
```

**Response**
```json
{
  "retention_rule_based": 0.6812,
  "retention_ml": 0.6540,
  "retention_probability": 0.6540,
  "will_forget_in_7_days": false,
  "model_used": "random_forest"
}
```

**difficulty encoding:** `0=easy, 1=medium, 2=hard`

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request / validation error |
| 401 | Missing or invalid JWT |
| 404 | Resource not found |
| 422 | Unprocessable entity (Pydantic validation) |
| 500 | Server error |
