# TheTrendCatcher SaaS Hub

This repository contains the complete production-ready source code for **TheTrendCatcher**, an automated, self-running SaaS and affiliate marketing engine.

## Directory Structure
- `backend/`: FastAPI (Python) backend running the Trend Scoring Engine, AI Pipeline, and Scrapers (Port 3000).
- `frontend/`: React + TypeScript + Vite + Tailwind CSS frontend dashboard for subscribers and creators (Port 3000).
- `trendcatcher-blog/`: Node.js / Express automated niche site blog server running on Port 5000 with the Cloaked Affiliate Link Router.
- `legacy/the-mom-drop/`: Legacy coupon/alerts application (unrelated, preserved for history).

## Domain Configuration
- Official Host: `thetrendcatcher.com`

## Core Services
1. **Autonomous Scheduler Daemon**: Runs in background `app/scheduler.py` to scrape social metrics (TikTok, Pinterest, Reddit, Instagram), calculate the Composite Virality Score (CVS) and Purchase Intent Ratio (PIR), and trigger automated blog and board scheduling.
2. **AI Copywriter & Webhook Publisher**: Generates high-converting affiliate assets and auto-publishes them to the connected niche sites.
3. **SaaS Auth & Tiering Gating**: REST authentication endpoints with mock Bearer tokens to support Free Trial, Basic, and Pro tiers.

## License
Confidential and proprietary. Copyright © 2026 TheTrendCatcher. All rights reserved.
