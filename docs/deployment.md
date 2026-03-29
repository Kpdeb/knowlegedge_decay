# 🚀 Deployment Guide — Vercel + Render

This gives you a **fully live public URL** for free.

---

## Overview

| Service | Platform | URL (example) |
|---------|----------|---------------|
| Frontend (React) | Vercel | `https://knowdecay.vercel.app` |
| Backend (FastAPI) | Render | `https://knowdecay-backend.onrender.com` |
| ML Service (sklearn) | Render | `https://knowdecay-ml.onrender.com` |
| Database (PostgreSQL) | Render | (internal connection string) |

---

## Step 1 — Push to GitHub

```bash
cd knowledge-decay-predictor
git init
git add .
git commit -m "initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/knowledge-decay-predictor.git
git push -u origin main
```

---

## Step 2 — Deploy Backend + ML + DB on Render

1. Go to **https://render.com** → sign up (free)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` and creates all 3 services + the database
5. Wait ~5 minutes for the first deploy
6. Note the backend URL: `https://knowdecay-backend.onrender.com`

### Manual setup (if Blueprint doesn't work)

**Database:**
- New → PostgreSQL → Name: `knowdecay-db` → Free plan → Create

**Backend:**
- New → Web Service → Connect repo
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  ```
  DATABASE_URL    = <copy from Render DB dashboard>
  ML_SERVICE_URL  = https://knowdecay-ml.onrender.com
  SECRET_KEY      = <click "Generate">
  CORS_ORIGINS    = https://YOUR-APP.vercel.app
  ```

**ML Service:**
- New → Web Service → Connect repo
- Root Directory: `ml-service`
- Build Command: `pip install -r requirements.txt && python training/train.py`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Add a Disk: mount path `/app/models/saved`, size 1 GB

---

## Step 3 — Deploy Frontend on Vercel

1. Go to **https://vercel.com** → sign up with GitHub (free)
2. Click **"Add New Project"** → import your GitHub repo
3. Set:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
4. Add environment variable:
   ```
   REACT_APP_API_URL = https://knowdecay-backend.onrender.com
   ```
5. Click **Deploy** — live in ~2 minutes

---

## Step 4 — Initialize the Database

After Render deploys the backend, run the schema:

```bash
# Get your DB connection string from Render dashboard, then:
psql "postgres://..." -f database/schema.sql
```

Or use Render's shell:
- Render dashboard → your backend service → Shell tab
- The backend auto-creates tables via SQLAlchemy on first startup

---

## Step 5 — Update CORS

Once you have your Vercel URL (e.g. `https://knowdecay-abc123.vercel.app`):

1. Go to Render → Backend service → Environment
2. Update `CORS_ORIGINS` to your exact Vercel URL
3. Redeploy backend

---

## Demo Mode (Frontend Only)

If you only deploy the frontend to Vercel **without** setting `REACT_APP_API_URL`, the app runs in **demo mode** automatically:
- All data is stored in `localStorage`
- No backend required
- Fully functional for demos and hackathons
- Login: `demo@knowdecay.ai` / `demo1234`

---

## Free Tier Limits

| Service | Limit | Notes |
|---------|-------|-------|
| Vercel  | Unlimited deploys, 100GB bandwidth | Perfect for frontend |
| Render Web | 750 hrs/month, sleeps after 15min idle | Wakes in ~30s |
| Render DB | 90 days free, 1GB storage | Upgrade for production |

**Tip for hackathon demo:** Deploy frontend to Vercel in demo mode — no backend needed, instant loading, works offline.

---

## Custom Domain (optional)

**Vercel:** Project settings → Domains → add your domain  
**Render:** Service settings → Custom Domains → add your domain

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error | Update `CORS_ORIGINS` on Render to match your exact Vercel URL |
| 502 on first request | Render free tier sleeps — wait 30s for cold start |
| ML service returns null | Check Render ML service logs; it trains on first deploy |
| Login fails | Make sure `DATABASE_URL` is set and schema is applied |
| Blank frontend | Check browser console for `REACT_APP_API_URL` being undefined |
