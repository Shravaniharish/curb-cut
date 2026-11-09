# Architecture and contracts between areas

```
Browser (Next.js + OTel RUM) --HTTP/SSE--> FastAPI (OTel) --> Elasticsearch Serverless
   profile in localStorage                    llm.py -> OpenAI (catch-up only)
Delivery: GitHub Actions -> GHCR -> Argo CD -> Radar namespace. Telemetry -> Dash0.
```

## Elasticsearch indices (owner: Person 1)
- `talks`: title, abstract (text + `semantic_text`), speaker, track, level, start, end, room, room_capacity, `access` { captions: none|auto|live_human, interpreter: bool, slides_ahead_hours: int, slides_alt_text: none|ai_draft|verified, code_heavy, live_demo, sensory {noise: low|med|high, lighting: normal|dark, applause: bool, crowd: small|med|large}, qa_format: mic|written|both, recording_transcript: bool }
- `transcript_chunks`: talk_id, t_start, t_end, text (`semantic_text`), kind: speech|question
- `questions`: talk_id, text, votes, status: queued|read, created_at
- `attendees` (stretch, synthetic): interests, contact_pref green|yellow|red, affinity opt-ins

## Client-side access profile (browser only)
`captions_required`, `interpreter_preferred`, `screen_reader`, `text_first`, `low_sensory`, `slides_ahead_required`, `contact_pref`, optional `pronouns`, optional `affinity_opt_ins`. Hard needs become filters, preferences become boosts. The server never stores it and never logs it.

## HTTP API (owners in brackets)
- `POST /api/search` {q, profile} -> hits with `why` string [P1 logic in api/app/es, P2 router]
- `GET /api/talks/{id}` [P2]
- `GET /api/sessions/{id}/stream` SSE replay of canned transcript [P2]
- `GET /api/sessions/{id}/catchup?seconds=60` [P2, uses api/app/llm.py]
- `POST /api/sessions/{id}/questions`, `GET` queue, `POST .../questions/{qid}/read` (injects `kind=question` into stream) [P2]
- `GET /api/organizer/gaps` ES aggregations [P1 query, P2 router]
- `GET /api/schedule.ics|.csv|.txt?ids=` stateless [P2]
- `GET /healthz` [done]

Agree response JSON shapes in the first 30 minutes by writing Pydantic models in `api/app/schemas.py` (P2 opens that PR first; P1 and P3 review it). P3 builds the UI against those models using mock data until endpoints land.

## Telemetry (owner: Person 2)
Custom spans/metrics: `search.latency`, `transcript.delivery_latency_ms`, `qa.queue_depth`. Frontend RUM via the pinned OTel web packages. SLOs: search latency; transcript delivery latency (start at 2 s).
