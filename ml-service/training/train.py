"""
ML Service — Training Script
============================
Models trained:
  1. Random Forest Regressor  — predicts retention probability (0–1)
  2. XGBoost Regressor        — predicts retention probability (0–1) [more accurate]
  3. XGBoost Classifier       — predicts will_forget in 7 days (True/False)

Dataset priority (auto-detected):
  1. Real Duolingo dataset  → data/learning_traces.13m.csv  (13M rows, best)
  2. Real Duolingo dataset  → data/duolingo_data.csv        (Kaggle version)
  3. Synthetic fallback     → 500k generated rows           (no file needed)

Usage:
  python training/train.py                        # auto-detect dataset
  python training/train.py --rows 500000          # limit rows loaded
  python training/train.py --synthetic            # force synthetic data
"""

import os
import sys
import math
import argparse
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, accuracy_score
from xgboost import XGBRegressor, XGBClassifier
import joblib

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR  = os.path.join(BASE_DIR, "..")
SAVE_DIR  = os.path.join(ROOT_DIR, "models", "saved")
DATA_DIR  = os.path.join(ROOT_DIR, "data")
os.makedirs(SAVE_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# ── Feature columns used by all models ────────────────────────────────────────
FEATURES = [
    "time_since_last_review",  # hours since last review
    "quiz_score",              # 0–100
    "difficulty",              # 0=easy 1=medium 2=hard
    "review_count",            # total reviews done
    "study_duration",          # minutes studied
]

DIFF_FACTOR = {0: 1.5, 1: 1.0, 2: 0.7}


# ── Ebbinghaus label formula (used for synthetic data + fallback label) ────────
def ebbinghaus_retention(t_hours, score, review_count, difficulty, study_duration):
    diff_factor = DIFF_FACTOR.get(int(difficulty), 1.0)
    s = 24 * diff_factor * (1 + score / 100) * (1 + review_count * 0.3) * (1 + study_duration / 200)
    return float(np.clip(math.exp(-t_hours / s), 0.0, 1.0))


# ── Dataset loaders ────────────────────────────────────────────────────────────

def load_duolingo(path: str, max_rows: int) -> pd.DataFrame:
    """
    Load and map the real Duolingo Half-Life Regression dataset.

    Duolingo columns we use:
      delta         → seconds since last practice  →  time_since_last_review (hours)
      p_recall      → recall probability 0–1       →  retention (label)
      history_seen  → times seen before            →  review_count
      history_correct → times correct before       →  proxy for quiz_score

    Download from:
      https://www.kaggle.com/datasets/aravinii/duolingo-spaced-repetition-data
      or: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/N8XJME
    """
    print(f"Loading Duolingo dataset from {path} (max {max_rows:,} rows)…")
    df_raw = pd.read_csv(path, nrows=max_rows)
    print(f"  Raw rows loaded: {len(df_raw):,}")
    print(f"  Columns found:   {df_raw.columns.tolist()}")

    # Detect column names — Kaggle and Harvard versions differ slightly
    delta_col   = "delta"          if "delta"           in df_raw.columns else "time"
    recall_col  = "p_recall"       if "p_recall"        in df_raw.columns else "p_recall"
    seen_col    = "history_seen"   if "history_seen"    in df_raw.columns else "history_seen"
    correct_col = "history_correct"if "history_correct" in df_raw.columns else "history_correct"

    df = pd.DataFrame({
        "time_since_last_review": df_raw[delta_col] / 3600.0,        # seconds → hours
        "quiz_score":             (df_raw[correct_col] /
                                   df_raw[seen_col].replace(0, 1)
                                   * 100).clip(0, 100),               # ratio → 0-100
        "difficulty":             1,                                   # Duolingo has no difficulty col; default medium
        "review_count":           df_raw[seen_col].clip(0, 20),
        "study_duration":         5,                                   # Duolingo sessions ~5 min average
        "retention":              df_raw[recall_col].clip(0.0, 1.0),
    })

    df = df.dropna()
    df = df[df["time_since_last_review"] > 0]
    print(f"  Clean rows:      {len(df):,}")
    return df


def generate_synthetic(n: int = 500_000, seed: int = 42) -> pd.DataFrame:
    """
    Generate realistic synthetic study sessions using Ebbinghaus + noise.
    Used when no real dataset is found.
    """
    print(f"Generating {n:,} synthetic rows (seed={seed})…")
    rng = np.random.default_rng(seed)

    time_since     = rng.exponential(scale=72,  size=n).clip(0.5, 720)
    quiz_score     = rng.beta(5, 2,             size=n) * 100
    difficulty     = rng.integers(0, 3,         size=n)
    review_count   = rng.integers(0, 11,        size=n)
    study_duration = rng.integers(10, 121,      size=n)

    # Add human-behaviour variation
    # 10% of students cram (long session but worse retention)
    cramming = rng.random(n) < 0.10
    study_duration = np.where(cramming, study_duration * 3, study_duration).clip(10, 360)

    # 5% of reviews happen very late (missed schedule)
    late_reviews = rng.random(n) < 0.05
    time_since = np.where(late_reviews, time_since * 3, time_since).clip(0.5, 720)

    retention = np.array([
        ebbinghaus_retention(t, s, r, d, dur)
        for t, s, r, d, dur in zip(time_since, quiz_score, difficulty, review_count, study_duration)
    ])

    # Add realistic noise
    noise = rng.normal(0, 0.025, size=n)
    retention = np.clip(retention + noise, 0.0, 1.0)

    df = pd.DataFrame({
        "time_since_last_review": time_since,
        "quiz_score":             quiz_score,
        "difficulty":             difficulty,
        "review_count":           review_count,
        "study_duration":         study_duration,
        "retention":              retention,
    })
    print(f"  Synthetic rows: {len(df):,}")
    return df


def find_dataset(force_synthetic: bool, max_rows: int = 500_000) -> tuple[pd.DataFrame, str]:
    """Auto-detect and load the best available dataset."""
    if not force_synthetic:
        # Priority 1: Full Duolingo dataset (Harvard / direct download)
        for fname in ["learning_traces.13m.csv", "duolingo_data.csv", "learning_traces.csv"]:
            path = os.path.join(DATA_DIR, fname)
            if os.path.exists(path):
                return load_duolingo(path, max_rows=max_rows), "duolingo_real"

        # Priority 2: Check current directory
        for fname in ["learning_traces.13m.csv", "duolingo_data.csv"]:
            if os.path.exists(fname):
                return load_duolingo(fname, max_rows=max_rows), "duolingo_real"

    # Fallback: synthetic
    print("No real dataset found — using synthetic data.")
    print("To use real data, place the Duolingo CSV at:")
    print(f"  {os.path.join(DATA_DIR, 'duolingo_data.csv')}")
    return generate_synthetic(n=500_000), "synthetic"


# ── Training ───────────────────────────────────────────────────────────────────

def train(df: pd.DataFrame, dataset_source: str) -> dict:
    print(f"\nDataset: {len(df):,} rows from [{dataset_source}]")
    print(f"Retention range: [{df['retention'].min():.3f}, {df['retention'].max():.3f}]")

    # Save a 5k sample for inspection
    sample_path = os.path.join(DATA_DIR, "training_sample.csv")
    df.sample(min(5000, len(df)), random_state=42).to_csv(sample_path, index=False)
    print(f"Sample saved → {sample_path}")

    X = df[FEATURES].values
    y = df["retention"].values
    y_binary = (y < 0.5).astype(int)   # label: 1 = will forget, 0 = will remember

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    _, _, yb_train, yb_test = train_test_split(
        X, y_binary, test_size=0.2, random_state=42
    )

    metrics = {}

    # ── 1. Random Forest Regressor ─────────────────────────────────────────────
    print("\n[1/3] Training Random Forest Regressor…")
    rf = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=5,
        n_jobs=-1,
        random_state=42,
    )
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_mae   = mean_absolute_error(y_test, rf_preds)
    rf_r2    = r2_score(y_test, rf_preds)
    print(f"  MAE: {rf_mae:.4f}   R²: {rf_r2:.4f}")
    metrics["rf_mae"] = round(rf_mae, 4)
    metrics["rf_r2"]  = round(rf_r2, 4)

    # ── 2. XGBoost Regressor (replaces Logistic Regression) ───────────────────
    print("\n[2/3] Training XGBoost Regressor…")
    xgb_reg = XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )
    xgb_reg.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    xgb_preds = xgb_reg.predict(X_test)
    xgb_mae   = mean_absolute_error(y_test, xgb_preds)
    xgb_r2    = r2_score(y_test, xgb_preds)
    print(f"  MAE: {xgb_mae:.4f}   R²: {xgb_r2:.4f}")
    metrics["xgb_mae"] = round(xgb_mae, 4)
    metrics["xgb_r2"]  = round(xgb_r2, 4)

    # ── 3. XGBoost Classifier (will forget in 7 days?) ────────────────────────
    print("\n[3/3] Training XGBoost Classifier (will forget in 7d?)…")
    xgb_clf = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
        eval_metric="logloss",
    )
    xgb_clf.fit(X_train, yb_train, verbose=False)
    clf_preds = xgb_clf.predict(X_test)
    clf_acc   = accuracy_score(yb_test, clf_preds)
    print(f"  Accuracy: {clf_acc:.4f}")
    metrics["clf_acc"] = round(clf_acc, 4)

    # ── Feature importance comparison ──────────────────────────────────────────
    print("\nFeature importances:")
    imp_df = pd.DataFrame({
        "feature":          FEATURES,
        "random_forest":    rf.feature_importances_,
        "xgboost":          xgb_reg.feature_importances_,
    }).sort_values("xgboost", ascending=False)
    print(imp_df.to_string(index=False))

    # ── Which model won? ───────────────────────────────────────────────────────
    best = "xgboost" if xgb_mae < rf_mae else "random_forest"
    print(f"\nBest regressor: {best.upper()} (lower MAE is better)")
    print(f"  Random Forest MAE : {rf_mae:.4f}")
    print(f"  XGBoost MAE       : {xgb_mae:.4f}")
    metrics["best_model"] = best

    # ── Save all models ────────────────────────────────────────────────────────
    joblib.dump(rf,      os.path.join(SAVE_DIR, "random_forest.joblib"))
    joblib.dump(xgb_reg, os.path.join(SAVE_DIR, "xgboost_regressor.joblib"))
    joblib.dump(xgb_clf, os.path.join(SAVE_DIR, "xgboost_classifier.joblib"))

    # Save metadata so predictor knows which model was best
    meta = {
        "best_model":    best,
        "dataset":       dataset_source,
        "n_rows":        len(df),
        "rf_mae":        rf_mae,
        "xgb_mae":       xgb_mae,
        "clf_acc":       clf_acc,
        "features":      FEATURES,
    }
    joblib.dump(meta, os.path.join(SAVE_DIR, "meta.joblib"))

    print(f"\nAll models saved to {SAVE_DIR}/")
    return metrics


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train KnowDecay ML models")
    parser.add_argument("--rows",      type=int,  default=500_000, help="Max rows to load from real dataset")
    parser.add_argument("--synthetic", action="store_true",         help="Force synthetic data generation")
    args = parser.parse_args()

    df, source = find_dataset(force_synthetic=args.synthetic, max_rows=args.rows)
    metrics    = train(df, source)
    print("\nTraining complete:", metrics)
