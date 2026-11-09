# Architecture

## Overview
```
Phone/laptop (Next.js + OTel RUM)                 FastAPI (OTel)               Elasticsearch Serverless
 profile + plan + alert history in localStorage    stateless logic        -->  talks, venue, transcript_chunks,
   |  POST /api/search, /api/plan, /api/replan  -> planner, router             questions, reports, changes
   |  GET  /api/changes/stream (SSE)            <- broadcasts venue changes
   |  POST /api/changes/{id}/ack (anonymous)    -> counts for organizer
Delivery: GitHub Actions -> GHCR -> Argo CD -> Radar namespace. Telemetry -> Dash0.
```

## How re-planning stays private
1. Organizer posts a change. The server saves it and pushes it to every open app over SSE (public venue info, like a PA announcement).
2. Each app calls `POST /api/replan` with its own profile, current plan and the change id (and optionally a `personal` change: late / missed / break_now).
3. The server returns `{affected, alert, plan, options}` and forgets the request.
4. The app shows the alert in its `alert_mode` and posts an anonymous ack `{affected, replan_ms}`.
5. Organizer counts come only from acks. Needs are never stored.

## Planner
Plain Python in `api/app/planner/`: `route.py` (`find_route`, Dijkstra on connectors with status ok, step-free filter, extra_time multiplier 1.5), `plan.py` (`build_plan`: slot filling, quiet breaks, one backup per slot, `leave_by`), `replan.py`. Unit-tested. Elastic Agent Builder wraps the same functions as tools: `find_step_free_route`, `find_alternative_talk`, `get_affected_talks`.

## Elasticsearch indices
- `talks`: title, abstract (`semantic_text`, Jina), speaker, track, level, start, end, room, topics, `access{...}`.
- `venue`: rooms `{id, floor, step_free_entry, quiet_room, capacity, front_seating}` and connectors `{id, kind: elevator|ramp|stairs|path, from, to, minutes, step_free, status: ok|down}`.
- `transcript_chunks`, `questions`.
- `reports`: `{type, location, device_token, created_at}` (random token, not tied to a person).
- `changes`: `{id, type, target, details, created_at, fixed_at}`.
- No `attendees` or `profiles` index.

## HTTP API (Pydantic models in `api/app/schemas.py` first)
| Route | Purpose |
|---|---|
| `POST /api/search {q, profile}` | hybrid search (BM25 + semantic, RRF), hard needs as filters, preferences as boosts, `why` per hit |
| `POST /api/plan {profile}` | `[{slot, talk, backup, route{minutes, step_free, steps[]}, leave_by, why}]` |
| `POST /api/replan {profile, plan, change_id, personal?}` | `{affected, alert{what_changed, what_stays, do_now, route, leave_by}, plan, options[]}` |
| `GET /api/talks/{id}`, `GET /api/venue` | details, live status |
| `POST /api/changes`, `POST /api/changes/{id}/fix` | organizer actions |
| `GET /api/changes/stream` | SSE of changes |
| `POST /api/changes/{id}/ack` | anonymous `{affected, replan_ms}` |
| `POST /api/reports` | `{type, location, device_token}`; 2 matching in 10 min creates a change |
| `GET /api/organizer/summary` | counts, reports, gaps aggregations |
| `GET /api/sessions/{id}/stream`, `/catchup`, `/questions` | session companion |
| `GET /api/schedule.ics\|.csv\|.txt?ids=` | exports |
| `GET /healthz` | Kubernetes probe |

## SLOs (Dash0)
- Every affected attendee re-planned within 30 s of the organizer's tap.
- 0 step-free routes through a down connector (backed by a pytest that runs 100 random changes).
- Search latency; transcript delivery under 2 s.

## Telemetry
OTel span on every route (`search`, `plan`, `route`, `replan`, `organizer_summary`...). No profile data or query text in attributes. Frontend RUM via OTel web SDK. Trace to show in the demo: organizer tap -> SSE -> replan -> ack.

## Deploy
Dockerfiles for `api` and `web`; GitHub Actions builds and pushes to GHCR; Argo CD syncs to the Radar namespace; secrets as Kubernetes Secrets, never in images.
