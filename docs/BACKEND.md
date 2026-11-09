# Backend (api/)

FastAPI + Pydantic, in-memory venue state, no database needed to run. The contract is `api/app/schemas.py`.

## Run
```bash
cd api && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
uvicorn app.main:app --port 8000        # http://localhost:8000/docs
ruff check . && pytest -q
```
Web app against it (live mode; off by default, so the demo and e2e tests still run on the device alone):
```bash
cd web && NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_API_MODE=live npm run dev
# end-to-end check (start the API fresh first): LIVE_E2E=1 NEXT_PUBLIC_API_URL=http://localhost:8000 npx playwright test e2e/live.spec.ts
```

## How a change reaches a phone
1. `/organizer` > Elevator down > Announce change -> `POST /api/changes` (saved, pushed to every open app over `GET /api/changes/stream`).
2. Each phone (`components/ApiSync.tsx`) sends its own profile and plan to `POST /api/replan`, gets `{affected, alert}`, shows the alert in its alert style (`ChangeWatcher`), and posts an anonymous `POST /api/changes/{id}/ack {affected, replan_ms}`.
3. The dashboard polls `GET /api/organizer/summary` for the anonymous counts. Nobody's needs are stored.

## Endpoints
| Route | Notes |
|---|---|
| `GET /api/venue`, `GET /api/talks[/{id}]` | public venue state and sample talks |
| `POST /api/search {q}` | keyword search with a `why`; only the query text, never stored or traced |
| `POST /api/route`, `POST /api/plan` | step-free routing (never stairs, never a down connector); day plan with one backup per slot and leave-by |
| `POST /api/replan` | `{profile, plan, change_id? , personal?}` -> `{affected, alert{what_changed, what_stays, do_now}, plan, options[]}` |
| `POST /api/changes`, `/{id}/fix`, `GET /api/changes`, `GET /api/changes/stream`, `POST /api/changes/{id}/ack` | organizer actions (lockable with `ORGANIZER_KEY`), SSE with a 15 s heartbeat, anonymous acks |
| `POST /api/reports` | 2 matching reports from different `device_token`s within 10 min announce a change (elevator down, floor path blocked); loud rooms / missing captions go to staff only |
| `GET /api/organizer/summary` | venue, changes, report groups, ack counts, access gaps |
| `GET /api/sessions/{id}/transcript\|stream\|catchup`, `GET/POST .../questions`, `POST .../questions/{qid}/read` | canned transcripts replayed over SSE; "Catch me up" is the no-LLM fallback (last 3 lines of the past minute) |

Change types: `elevator_down`, `elevator_fixed`, `path_blocked` (a floor path or an elevator), `path_cleared`, `room_full`, `talk_moved` (`details: {start: "HH:MM", room_id}`). Personal: `late` (5/10/15), `missed`, `break_now`.

## Privacy, enforced by tests
The profile is a request body only. No table, log line or span attribute holds it (`tests/test_privacy_and_misc.py`). Acks accept two numbers and nothing else (extra fields are a 422). Reports carry a random device token, no name or needs. The web client sends only the planner's fields (no pronouns, approach or display settings) and only the query text to search.

## Honest limits
- State is in memory and resets on restart; run one worker. The Elasticsearch indices, Jina `semantic_text`, Agent Builder and Workflow from `docs/PLAN.md` are **not wired**: search is keyword matching and `ES_*` settings are unused.
- Data is the same four demo talks and the invented venue as the web fixtures (`api/app/data/`), not the ~30 generated talks in `docs/DATA.md`; the web app maps API ids onto its own fixtures.
- The server holds elevator status and floor-path blocks; the web graph only models elevators, so a blocked floor path affects API routes and alerts but not the routes the web app draws on its own.
- Organizer routes are open unless `ORGANIZER_KEY` is set. That is fine locally and not for a public deployment.
- The browser holds the SSE connection to the API directly, so a reverse proxy must not buffer `/api/changes/stream`.
- `api/pyproject.toml`: line length 120, `fastapi.Depends/Query/Header` allowed as defaults, `E501` off for `app/data/`.
