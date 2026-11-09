# Manasa: Part C (Session companion, Organizer, Presenter): frontend + backend + track glue

Loop for every step: branch -> plan mode (Shift+Tab) -> paste prompt -> test -> commit -> push -> PR -> `@gitar please fix this` -> merge -> `/clear`. Small PRs. No secrets.

## Before you start
1. `git pull`. Wait for Sravani's `a1-foundation` (shared components) and `b1-schemas`. Until then, generate your Claude Design screens and save them in `docs/design/part-c/`, with the brief at `docs/design/part-c.md`.
2. Open Claude Code and say:
   > Read CLAUDE.md, PLAN.md and docs/design/part-c.md. Do not write code. Summarise in 8 lines what the organizer dashboard shows and why the server never knows an attendee's needs.

## Backend

### M1. `feat/m1-organizer-summary`  (~30 min)
> `GET /api/organizer/summary` returning: venue status (each connector ok/down), open reports by type and location, active changes, and ack totals (`affected`, `re_planned`, average and max `replan_ms`). The totals come only from anonymous acks. Add a "gaps" aggregation on the `talks` index (Elasticsearch aggregations): talks without live captions, without verified alt text, rooms without step-free entry, by time slot. OTel span `organizer_summary`. Test with mocked ES.

### M2. `feat/m2-session`  (~35 min)
> - `GET /api/sessions/{id}/stream`: SSE that replays a canned transcript (3-4 chunks per talk from `transcript_chunks`) with timestamps, one chunk every few seconds. Transcript delivery must be under 2 seconds from chunk time to client (record it as an OTel metric).
> - `GET /api/sessions/{id}/catchup`: a 3-bullet summary of the last 60 seconds with timestamps. If no LLM key is set, return the last 3 chunks as bullets (no API key needed for the demo).
> - `GET/POST /api/sessions/{id}/questions`: attendees post written questions, presenter reads the queue, mark answered. Store in `questions`.
> Tests for ordering and for the fallback catch-up.

## Frontend (after Sravani's foundation)

### M3. `feat/m3-session-companion`  (~40 min)
> Screen 10: live transcript (large text, auto-scroll that can be paused), "jump back 30 s" button, "Catch me up" button opening a sheet with 3 bullets and timestamps, and a written question box. Tech-word glossary tooltips only if there's time. No sound, no motion. Keyboard + screen reader labels.

### M4. `feat/m4-organizer-dashboard`  (~50 min)
> Screen 12 (laptop layout): venue status with the change buttons ("Elevator B down", "Room full", "Talk moved", "Fix"), each calling `POST /api/changes` and `/fix`; live counters "N affected, N re-planned in X s" polling the summary every 2 s; reports list; gaps panel. Large readable text, status in words + icon, never colour alone. This is the demo's centre, so make "Elevator B down" one obvious button.

### M5. `feat/m5-presenter-console`  (~25 min)
> Screen 13: question queue (newest last), read-aloud-friendly, mark answered.

## Track glue you also own (Elastic, if you took P1)
- **Agent Builder:** in Kibana create a "re-planner" agent with three custom tools wrapping the Python planner: `find_step_free_route`, `find_alternative_talk`, `get_affected_talks`. The tools call our API endpoints. Test it by asking "Elevator B is down, what should a wheelchair user do for the 2 PM talk?".
- **Elastic Workflow:** "2 matching reports in 10 minutes -> mark connector down -> create change". Gauri's G3 does this in code; the Workflow is the Elastic-track version, fed by a seeded report.
- **Gitar rules:** `.gitar/review/instructions.md` (alerts have 3 parts; routes are text steps; labelled keyboard controls; status not colour-only; OTel span on every API route; no secrets or personal data).
- **Evidence:** screenshots into `docs/evidence/` by 4:15.

## Check with the group
Who does Dash0 (trace organizer tap -> SSE -> replan -> ack, the 30 s SLO) and Radar/Argo CD deploy. If nobody, those two are the biggest holes.

## Done when
- [ ] Dashboard "Elevator B down" updates three phones within seconds
- [ ] Counters show real affected/re-planned numbers from acks
- [ ] Transcript streams, jump back and Catch me up work (even with no LLM key)
- [ ] Presenter console shows written questions
- [ ] Gaps panel shows counts

## If you are behind at 3:30
Cut order: Catch me up -> glossary -> session companion -> report UI -> dashboard polish. Never cut the dashboard change buttons and live counters.
