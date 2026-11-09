# Curb Cut

An accessibility-first conference companion, built for the Cloud Native Hackathon (WeMakeDevs), 9 Nov 2026.
A curb cut built for wheelchairs ends up helping everyone, so each feature serves its target group and improves the default experience for all attendees.

## Setup

Requirements: Python 3.12+, Node 20+ (developed on Node 24).

```bash
cp .env.example .env            # fill in values; never commit .env

# API
cd api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/ruff check . && .venv/bin/pytest -q
.venv/bin/uvicorn app.main:app --reload     # http://localhost:8000/healthz

# Web (new terminal)
cd web
npm ci
npx playwright install chromium
npm run lint && npm run typecheck && npm run test:e2e
npm run dev                                 # http://localhost:3000
```

## Architecture
Stub. FastAPI + Elasticsearch (api/), Next.js (web/), OpenTelemetry to Dash0, deployed to Kubernetes with Radar.

## Research sources
CNCF Deaf and Hard of Hearing conference best practices; CNCF best practices for blind and visually impaired attendees; Australian Psychological Society neuroinclusive event guidelines; KubeCon inclusion and accessibility page; PCMA and Ensono conference surveys.

## Evidence index
See `docs/evidence/` (to be filled as we build).

## AI assistance
We built this with Claude Code (Anthropic) for scaffolding and implementation, Gitar for AI pull-request review and CI fixes, Dash0 Agent0 and Radar's AI SRE for diagnosis. Every pull request was reviewed by a teammate, and the team can explain the architecture and each technical decision. AI-drafted alt text in the demo data is labelled `ai_draft`.
