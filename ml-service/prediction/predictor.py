"""
Prediction module — loads trained models and runs inference.

Priority: XGBoost Regressor → Random Forest → Ebbinghaus formula (never fails)
Classifier: XGBoost Classifier → will_forget_in_7_days (True/False)
"""

import os
import math
import numpy as np
import joblib
from typing import Optional

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "saved")

_rf       = None
_xgb_reg  = None
_xgb_clf  = None
_meta     = None
_loaded   = False


def _try_load(path):
    try:
        return joblib.load(path) if os.path.exists(path) else None
    except Exception:
        return None


def _load_models() -> bool:
    global _rf, _xgb_reg, _xgb_clf, _meta, _loaded
    _rf      = _try_load(os.path.join(MODEL_DIR, "random_forest.joblib"))
    _xgb_reg = _try_load(os.path.join(MODEL_DIR, "xgboost_regressor.joblib"))
    _xgb_clf = _try_load(os.path.join(MODEL_DIR, "xgboost_classifier.joblib"))
    _meta    = _try_load(os.path.join(MODEL_DIR, "meta.joblib"))
    _loaded  = any(m is not None for m in [_rf, _xgb_reg])
    return _loaded


def _rule_based(t_hours: float, score: float, difficulty: int,
                review_count: int, study_duration: int) -> float:
    """Ebbinghaus forgetting curve: R = exp(-t / S) — always available."""
    diff_factor = {0: 1.5, 1: 1.0, 2: 0.7}.get(int(difficulty), 1.0)
    s = 24 * diff_factor * (1 + score / 100) * (1 + review_count * 0.3) * (1 + study_duration / 200)
    return float(np.clip(math.exp(-t_hours / s), 0.0, 1.0))


def predict_retention(
    time_since_last_review: float,
    quiz_score: float,
    difficulty: int,
    review_count: int,
    study_duration: int,
) -> dict:
    global _loaded
    if not _loaded:
        _load_models()

    features = np.array([[
        time_since_last_review, quiz_score,
        difficulty, review_count, study_duration,
    ]])

    rule_ret = _rule_based(time_since_last_review, quiz_score,
                           difficulty, review_count, study_duration)

    rf_ret: Optional[float] = None
    if _rf is not None:
        try:
            rf_ret = float(np.clip(_rf.predict(features)[0], 0.0, 1.0))
        except Exception:
            rf_ret = None

    xgb_ret: Optional[float] = None
    if _xgb_reg is not None:
        try:
            xgb_ret = float(np.clip(_xgb_reg.predict(features)[0], 0.0, 1.0))
        except Exception:
            xgb_ret = None

    will_forget: Optional[bool] = None
    if _xgb_clf is not None:
        try:
            will_forget = bool(_xgb_clf.predict(features)[0])
        except Exception:
            will_forget = None

    if xgb_ret is not None:
        best_ret, model_used = xgb_ret, "xgboost"
    elif rf_ret is not None:
        best_ret, model_used = rf_ret, "random_forest"
    else:
        best_ret, model_used = rule_ret, "rule_based"

    dataset_used = (_meta.get("dataset", "unknown") if _meta else "unknown")

    return {
        "retention_rule_based":  round(rule_ret, 4),
        "retention_rf":          round(rf_ret,   4) if rf_ret  is not None else None,
        "retention_xgb":         round(xgb_ret,  4) if xgb_ret is not None else None,
        "retention_probability": round(best_ret,  4),
        "will_forget_in_7_days": will_forget,
        "model_used":            model_used,
        "dataset_used":          dataset_used,
    }


def get_model_info() -> dict:
    """Returns model availability and training metadata."""
    if not _loaded:
        _load_models()
    return {
        "models_available": {
            "random_forest":      _rf is not None,
            "xgboost_regressor":  _xgb_reg is not None,
            "xgboost_classifier": _xgb_clf is not None,
        },
        "training_meta": _meta,
        "primary_model": (
            "xgboost" if _xgb_reg is not None else
            "random_forest" if _rf is not None else
            "rule_based"
        ),
    }
