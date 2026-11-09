# Sravani: backend for Part A (after the design files are done)

Part A screens (Setup, Plan, Search, Talk details, Route, Settings) need these things from the backend. Build them in this order. The order matters: step B1 unblocks everyone, so merge it first.

Rules for every step (same loop as the frontend guide):
branch -> plan mode (Shift+Tab) -> paste the prompt -> run the tests -> commit -> push -> PR -> `@gitar please fix this` -> merge -> `/clear`.
Keep every PR small. No secrets in code (use `.env`, and make sure `.env` is in `.gitignore`). Never log or store a profile.

---

## What Part A needs from the server

| Screen | Calls | Backend piece |
|---|---|---|
| 2-4 Setup | nothing (profile stays in the browser) | none |
| 5a Plan | `POST /api/plan {profile}` | planner: slot filling + backup + route + leave_by |
| 5b Search | `POST /api/search {q, profile}` | Elasticsearch hybrid search + filters + `why` |
| 6 Talk details | `GET /api/talks/{id}`, `GET /api/schedule.ics\|.csv\|.txt?ids=` | talk lookup + exports |
| 7 Route | route is inside the plan/talk response | route finder on the venue graph |
| 5e Settings | nothing | none |

So the backend you own is: **schemas, fake conference data, Elasticsearch index + search, planner + route finder, talks/venue endpoints, exports.**

---

## Before you start (5 minutes)

1. `git pull`, then confirm the folders exist: `api/app/`, `data/`, `tests/`. If not, tell Claude Code to create them.
2. Make a `.env` (not committed) with:
   - `ELASTIC_URL` and `ELASTIC_API_KEY` (from the Elastic Serverless project Manasa set up. Ask her to paste them privately).
3. Open Claude Code in the repo and say:
   > Read CLAUDE.md and PLAN.md (sections 3, 5 and the API table). We are building the backend for Curb Cut: FastAPI, Pydantic, Elasticsearch Serverless. Do not write code yet. Summarise in 8 lines what the backend must do for search, plan, talk details and route.

---

## B1. `feat/b1-schemas` (merge FIRST, ~20 min)

This is the contract. The frontend mock data and the real API must use the same shapes.

> Plan first, then implement. Create `api/app/schemas.py` with Pydantic models matching PLAN.md section 3 and 5:
> - `Profile` (all fields in section 3, every field optional with safe defaults, `alert_mode` is one of vibrate_text / screen_reader / calm_text).
> - `Talk` (id, title, abstract, speaker, track, level, start, end, room, topics, and `access`: step_free_entry, captions: none|auto|live_human, interpreter, alt_text: none|ai_draft|verified, slides_available_ahead, sensory notes, quiet_room_nearby, front_seating).
> - `Route` (minutes, step_free, steps: list of strings, leave_by).
> - `PlanSlot` (slot, talk, backup, route, leave_by, why).
> - `SearchHit` (talk, why, score).
> - `Alert` (what_changed, what_stays, do_now, route, leave_by) and `ReplanResponse` (affected, alert, plan, options).
> - Request models: `SearchRequest {q, profile}`, `PlanRequest {profile}`, `ReplanRequest {profile, plan, change_id}`.
> Also write `docs/api-examples/*.json` with one realistic example per response, using the personas Marcus (step-free), Priya (captions, front seat), Sam (low sensory, calm alerts). Add a test that every example validates against its model.

Merge it and tell the group. Gauri's and Manasa's screens can now use the exact same JSON.

---

## B2. `feat/b2-data` (~25 min)

> Create `data/generate.py` that writes deterministic JSON (fixed random seed) to `data/talks.json` and `data/venue.json`:
> - About 30 original, fake talks between 11:00 and 17:00 in 3 time-slot columns, original abstracts only (never copy real conference text). Topics: security, observability, Kubernetes basics, platform engineering, AI on Kubernetes, accessibility. Include the 4 demo talks: "Securing Your Supply Chain Without Slowing Down" 2:00 PM Room 355, "Observability for Beginners" 3:00 PM Room 251, "Kubernetes RBAC in Plain English" 2:00 PM Ballroom E, "Supply Chain Security Q&A" 3:30 PM Room 251.
> - Venue: 3 floors, 12 rooms (floor, step_free_entry, quiet_room, capacity, front_seating) and connectors (id, kind: elevator|ramp|stairs|path, from, to, minutes, step_free, status ok|down). Elevators A, B and C, stairs, 2 ramps, a quiet room on each floor.
> - Each talk's `access` fields should vary so filtering matters: some rooms are only reachable by stairs, some talks have no captions, some have live human captions.
> Add a test that every talk's room exists and every room is reachable on the graph from the entrance when all connectors are ok.

---

## B3. `feat/b3-elastic-index` (~30 min)

> Create `api/app/es.py` (client from env vars) and `data/ingest.py`:
> - Create index `talks` with mappings: title text, abstract `semantic_text` (default Jina inference endpoint on Elasticsearch Serverless), speaker, track keyword, level keyword, start/end date, room keyword, topics keyword, and `access` fields as keyword/boolean.
> - Create index `venue` for rooms and connectors, plus empty `changes` and `reports` indices (mapping in PLAN.md section 5).
> - Ingest from data/*.json using the bulk helper. Make it idempotent (delete and recreate with a `--reset` flag).
> - Print the document counts at the end.
> Do not hard-code the URL or key.

Run it and check in the Elastic UI (Kibana, Discover) that 30 talks exist. **Tell Manasa/whoever owns the Elastic track**, because the Agent Builder agent will use these same indices.

---

## B4. `feat/b4-search` (~35 min)

> Implement `POST /api/search` in `api/app/routers/search.py`.
> - Hybrid search with Elasticsearch RRF: one BM25 retriever on title and abstract plus one semantic retriever on the `abstract` semantic_text field.
> - Hard needs from the profile become **filters** (step_free -> room step_free_entry true; captions_required -> captions not none; interpreter... etc.). Preferences become **boosts** (front_seat, low_sensory, topics).
> - Return `SearchHit` with a one-line `why` built from the actual matching reasons, e.g. "Matches your topic Security; room is step-free; live captions." Never invent reasons.
> - Query comes in plain English; empty query returns the best talks for the profile's topics.
> - Add an OpenTelemetry span named `search` on the route with attributes: result_count, latency_ms. Do NOT record the profile or the query text as attributes.
> - Write pytest tests with a mocked ES client, plus one test that a step_free profile never gets a stairs-only room.

Test by hand: `curl -X POST localhost:8000/api/search -H 'content-type: application/json' -d '{"q":"supply chain security","profile":{"step_free":true}}'`

---

## B5. `feat/b5-planner` (~45 min, the most important)

The planner is plain Python so it can be tested. It is the source of truth; the Elastic agent wraps it later.

> Create `api/app/planner/route.py` and `api/app/planner/plan.py`.
> **route.py:** `find_route(venue, from_room, to_room, profile) -> Route`.
> - Build a graph from connectors with status ok only. If `profile.step_free`, skip connectors where step_free is false. Use Dijkstra on `minutes`; if `extra_time`, multiply each minute by 1.5 (round up).
> - `steps` is a list of plain-English numbered steps ("Take Elevator C to floor 2", "Turn left, Room 251 is the third door"). Text first. No map needed.
> - If no route exists, return a clear result with `steps=["No step-free route is available right now"]` and a flag, never a route through a down connector.
> **plan.py:** `build_plan(talks, venue, profile) -> list[PlanSlot]`.
> - For each time slot choose the best talk by the profile's topics, filtered by hard needs.
> - If `spaced_sessions` or `quiet_breaks`, never schedule back-to-back: leave a gap slot with the nearest quiet room.
> - Add one backup per slot that also passes the hard needs.
> - Compute `leave_by` = start time minus route minutes minus 5 minute buffer.
> - Add a one-line `why` per slot.
> Expose `POST /api/plan`, `GET /api/talks/{id}` and `GET /api/venue` in routers. Add OTel spans `plan` and `route` (no profile data in attributes).
> **Tests:** (1) Marcus never gets a stairs-only route, (2) leave_by is always before the talk start, (3) a down elevator is never in any route, (4) run 100 random profiles x random down connectors and assert zero hard-need violations. That last test backs our SLO "0 step-free routes through a down connector".

Make the frontend api client (Step 6 of your frontend guide) call this once it is merged.

---

## B6. `feat/b6-exports` (~15 min)

> Implement `GET /api/schedule.ics`, `.csv` and `.txt` with `?ids=talk1,talk2`. The .ics must have correct DTSTART/DTEND with timezone America/Denver, a LOCATION with the room name, and a DESCRIPTION with the route steps if given. The .txt must be readable by a screen reader (one talk per paragraph, plain words). Test that the .ics parses with the `icalendar` library.

---

## B7. `feat/b7-health-and-docs` (~15 min)

> Add `GET /healthz` returning ok (needed for Kubernetes). Make sure `uvicorn app.main:app` starts with all routers. Add a short `api/README.md` listing every route you built, how to run the tests (`pytest`), and how to run `data/ingest.py --reset`. Check `.gitar/review/instructions.md` rules pass: OTel span on every route, no secrets, no personal data.

---

## Handoffs (tell people in the group chat)

- After **B1**: "schemas merged, use `docs/api-examples` for mock data" -> Gauri and Manasa.
- After **B3**: "talks/venue are in Elastic" -> Elastic track owner.
- After **B5**: "planner functions are `find_route`, `build_plan`" -> whoever builds `/api/replan` and the Agent Builder tools (`find_step_free_route`, `find_alternative_talk`, `get_affected_talks` call these directly).
- After **B7**: "api ready to containerise" -> whoever owns Radar/Argo CD (deploy was due by 3:00).

## Time check (be honest with yourself)

Frontend Steps 1-5 plus this backend is a lot for one person before 3:30. If you are behind:
1. Do **B1, B2, B5** first (schemas, data, planner). A working plan + route is the demo.
2. Ask a teammate to take **B3 + B4** (Elastic ingest + search), since the Elastic track needs them anyway.
3. B6 (exports) and B7 can move after 3:30. Exports are in the "Must" list but are small.

## Done when

- [ ] `pytest` passes, including the 100-random-change test
- [ ] `curl` search with a step-free profile returns only step-free rooms, each with a `why`
- [ ] `curl` plan for Marcus returns slots, backups, text steps and `leave_by`
- [ ] .ics opens in a calendar app
- [ ] Every route has an OTel span and none contains profile data
- [ ] Frontend Part A works against the real API with no console errors

## If Claude Code gets stuck

- Elasticsearch error about `semantic_text`: ask Claude Code to print the exact error and check the inference endpoint exists in the Serverless project (Kibana -> Dev Tools -> `GET _inference`).
- Search returns nothing: check the ingest count first, then try the query in Kibana Dev Tools before debugging Python.
- Planner returns odd routes: print the graph (rooms and connectors) in a test and check by eye.
- Out of ideas after 10 minutes: `/clear`, re-read PLAN.md and the failing test, and ask for one small fix only.
