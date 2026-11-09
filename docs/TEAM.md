# Team split (3 people)

Each person runs Claude Code in their own area. Stay in your folders; ask the owner for anything else.

| Person | Area | Folders | Tracks you carry |
|---|---|---|---|
| **P1: Search and data** | Elasticsearch, seed data, organizer gaps, review tooling | `api/app/es/`, `data/`, `.gitar/`, `.github/workflows/` | Elasticsearch, Gitar |
| **P2: Backend and platform** | API routers, telemetry, SSE/Q&A/exports, deploy | `api/app/routers/`, `api/app/telemetry.py`, `api/app/llm.py`, `api/app/schemas.py`, `deploy/` | Dash0, Radar |
| **P3: Frontend and quality** | UI, accessibility, VoiceOver, README, evidence, demo | `web/`, `README.md`, `docs/evidence/` | Merge Forward, Best Overall |

## Build order by person
Steps from the project brief: 0 bootstrap, 1 telemetry, 2 data, 3 search, 4 web shell, 5 deploy, 6 exports, 7 session companion, 8 written Q&A, 9 organizer dashboard, 10 health/incidents, 11 freeze at 5:00 pm.

**P1**: Step 2 (mappings, `data/generate.py` ~25 talks, 3-4 canned transcripts, idempotent seed) -> Step 3 (hybrid search with RRF, filters, boosts, `why`, tests) -> Step 9 aggregations -> Gitar instructions/rules tuning and CI auto-fix on, keep PRs small and frequent all day. Verify Elastic `semantic_text`/retriever syntax from Elastic docs first.
**P2**: Step 1 telemetry (first hour) and `schemas.py` -> Step 5 deploy by 3:00 pm (Radar starter conventions, GHCR, Argo CD) -> Step 6 exports -> Step 7 stream/catch-up + latency metric -> Step 8 Q&A -> Step 10 SLOs, Dash0 dashboard, Agent0/MCP investigation, Radar AI investigation. Connect the Dash0 MCP and Radar MCP (`claude mcp add radar-cloud --scope user --transport http https://api.radarhq.io/mcp`).
**P3**: Step 4 shell + 30-second skippable profile onboarding + results page against mock data -> Step 6 export buttons -> Step 7 companion UI (multi-line transcript, pause, jump back 30 s, live-region toggle) -> Step 8 Q&A and presenter console -> Step 9 dashboard page -> axe in CI, VoiceOver pass before freeze -> README, evidence index, demo rehearsal x2.

## Working rules for the team
- Merge to `main` only after Gitar review and one teammate's approval. Pull `main` often.
- Everyone reviews at least one teammate's PR so all three can explain the whole system.
- Put evidence in `docs/evidence/` the moment it exists (screenshot, trace link, PR link).
- **Deadline: submit by 5:15 pm MST. Aim to submit by 4:45 pm** and update only if time remains. Before submitting: repo public, README complete, no secrets, evidence folder populated, every track entered plus Merge Forward, all three agree on IP ownership.
- 3:30 pm check: behind? Cut "catch me up", then dashboard polish. 5:00 pm: freeze.
- Demo (3 min): keyboard/screen-reader search + export; captions user rewinds and asks a written question; low-sensory demotion; organizer gaps; 30 s on how it was built.
