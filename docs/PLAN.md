# Curb Cut: merged plan (Curb Cut + Steady)

One app, one profile, one data model. This file combines `CLAUDE.md`/`docs/*` (Curb Cut) with `STEADY_PLAN.md` (Steady).
Where they disagreed, the repo docs win on facts confirmed at kickoff; the decisions are listed in section 9.

## 1. The idea in one breath

Curb Cut is a conference companion for disabled attendees that **finds the right talk, gets you there, keeps you in the room, and re-plans your day when something changes**, in the way you can receive it.
A curb cut built for wheelchairs helps everyone: every feature serves its group first and improves the default for all.

Gap we fill (from KubeCon's own accessibility guide, which lists these as *not* provided): personalised accessible routes, access-aware schedule planning, live reporting of blocked routes and elevators.

Pitch: "When a node fails, Kubernetes reschedules pods onto nodes that meet their requirements. When an elevator fails, Curb Cut reschedules people onto routes and rooms that meet theirs."

Four loops, one app:

| Loop | Question it answers | Came from |
|---|---|---|
| **Find** | Which talks can I actually attend? | Curb Cut search + Steady plan |
| **Go** | How do I get there, step-free, and when do I leave? | Steady |
| **Be there** | Can I follow and take part? | Curb Cut captions, Q&A, slides |
| **Change** | Something broke. What do I do now? | Steady (the heart) |

## 2. Principles (unchanged, now applied to Steady features too)

- **Preference-first**: the attendee picks needs from a list; never asked for a diagnosis or reason; the app infers nothing.
- **Private by construction**: the profile lives only in browser `localStorage` (try/catch). The server stores and logs no profile. This also covers re-planning (see section 5): the server broadcasts *venue* changes; each phone works out if it is affected.
- **Text-first**: routes are numbered text steps; a map is extra. Status in words + icon, never colour alone.
- **Predictable**: sensory notes before you commit; no surprise sound or motion.
- **Explained**: every talk, backup and alternative has a one-line `why`.
- **Honest labels**: alt text `none|ai_draft|verified`; captions `none|auto|live_human`.
- **Humble**: Marcus, Priya and Sam are illustrative composites, not spokespeople.

## 3. One profile (replaces both lists)

Stored in `localStorage`, sent only as ranking hints. Hard needs become filters, preferences become boosts.

| Group | Fields |
|---|---|
| Getting around | `step_free`, `extra_time` |
| Hearing / seeing | `captions_required`, `interpreter_preferred`, `front_seat`, `screen_reader`, `slides_ahead_required` |
| Energy / senses | `low_sensory`, `quiet_breaks`, `spaced_sessions` |
| Alerts | `alert_mode`: `vibrate_text` \| `screen_reader` \| `calm_text` |
| Display | `text_size`, `high_contrast`, `dyslexia_font`, `reduce_motion` |
| Interests | `topics` (2-3) |
| Optional | `contact_pref` green/yellow/red, `pronouns` |

`text_first` from the old Curb Cut list is dropped: the whole app is text-first.

## 4. Features (Must ships; Extra only if time)

**Setup** (screens 2-4)
- Must: 30-second, skippable; needs, alert style, topics; editable in Settings.
- Extra: export/import profile as QR for the next conference.

**Find**
- Must: plain-English hybrid search (BM25 + `semantic_text`, RRF), filtered by hard needs, boosted by preferences, `why` per hit.
- Must: day plan from topics, filtered by needs; quiet breaks and no back-to-back if asked; one backup per slot that also fits.
- Must: export plan as `.ics` / `.csv` / `.txt` (this *is* "add to calendar").
- Extra: front-seat reservation note on talks with `front_seat`.

**Go**
- Must: numbered text steps, total minutes, "step-free" in words, **Leave by** time, avoids anything with `status: down`.
- Extra: "I've arrived" check; "remind me 5 min before I leave".

**Be there** (Curb Cut session companion)
- Must: live transcript (SSE replay of canned transcripts), pause, jump back 30 s, live-region on/off.
- Must: written Q&A queue; presenter marks a question read and it appears in the transcript.
- Extra: "Catch me up" (last 60 s summary, needs LLM key). First thing cut.
- Extra: tech-word spelling ("kubectl") using talk vocabulary from Elasticsearch.

**Change** (the heart)
- Must: organizer buttons: talk moved, talk delayed, room full, elevator down, path blocked, and "fixed" (re-plans people back).
- Must: only affected attendees are alerted; every alert has **what changed / what stays the same / what to do now**, plus new route and new Leave by.
- Must: delivery by `alert_mode`: `vibrate_text` = vibration + large banner (never audio-only); `screen_reader` = short sentences in an assertive live region; `calm_text` = one step per screen with Next, no sound, no flashing.
- Must: "See other options": 2-3 alternatives that all fit the profile (this reuses search; no separate feature).
- Must: alert history (kept on the phone).

**Report a problem**
- Must: elevator not working, path blocked, too loud, no captions; location picked from a list; no typing; no user ID sent.
- Must: 2 matching reports from different devices within 10 min marks the item down and triggers a Change; thank-you says what happens next.
- Extra: notify me when fixed.

**Organizer (laptop)**
- Must: venue status in words; incoming reports (confirm / dismiss); change buttons; live "12 affected, 12 re-planned in 8 s".
- Must: access gaps (ES aggregations): e.g. talks without captions, interpreter talks in rooms that are not step-free. (This merges Curb Cut "organizer gaps" with Steady "warning when an access talk is in a hard-to-reach room".)
- Extra: speaker view ("3 attendees on their way via Elevator C"); after-event barrier report.

**Throughout**
- Must: full keyboard + VoiceOver; 48 px targets; body 18 px+; plain short sentences, no medical words; one main action per screen; reduce motion respected.
- Must: no personal data on the server, so "delete after the event" is true by design (clearing the browser removes everything).
- Extra: offline last-known plan (service worker).

## 5. Architecture

```
Phone/laptop (Next.js + OTel RUM)                 FastAPI (OTel)               Elasticsearch Serverless
 profile + plan + alert history in localStorage    stateless logic        -->  talks, venue, transcript_chunks,
   |  POST /api/search, /api/plan, /api/replan  -> planner, router             questions, reports, changes
   |  GET  /api/changes/stream (SSE)            <- broadcasts venue changes
   |  POST /api/changes/{id}/ack (anonymous)    -> counts for organizer
Delivery: GitHub Actions -> GHCR -> Argo CD -> Radar namespace. Telemetry -> Dash0.
```

**How re-planning stays private:** organizer posts a change -> server saves it and pushes it to every open app over SSE (it is public venue info, like a PA announcement) -> each app calls `POST /api/replan` with its own profile and current plan -> server returns `{affected, alert, plan}` and forgets it -> app shows the alert in its `alert_mode` and posts an anonymous ack `{affected, replan_ms}`. The organizer count comes from acks, so nobody's needs are ever stored.

**Planner** is plain Python (route search over a small graph + slot filling). It is the source of truth and is unit-tested. Elastic Agent Builder wraps the same functions as tools (`find_step_free_route`, `find_alternative_talk`, `get_affected_talks`) for the Elastic track; it does not replace the tested code.

### Elasticsearch indices (P1)
- `talks`: existing Curb Cut mapping (title, abstract `semantic_text`, speaker, track, level, start, end, room, `access{...}`) + `topics`.
- `venue` (new): rooms `{id, floor, step_free_entry, quiet_room, capacity, front_seating}` and connectors `{id, kind: elevator|ramp|stairs|path, from, to, minutes, step_free, status: ok|down}`. 3 floors, 12 rooms, elevators A/B/C, stairs, 2 ramps, a quiet room per floor.
- `transcript_chunks`, `questions`: unchanged.
- `reports` (new): `{type, location, device_token, created_at}`; `device_token` is a random string, not tied to a person.
- `changes` (new): `{id, type, target, details, created_at, fixed_at}`.
- Dropped: `attendees` and Steady's `profiles` index (both conflict with private-by-construction).

Data: ~30 synthetic talks 11:00-17:00, 3-4 canned transcripts, original abstracts only.

### HTTP API (owners in brackets; Pydantic models in `api/app/schemas.py` first)

| Route | Purpose |
|---|---|
| `POST /api/search {q, profile}` | hits with `why` [P1 logic, P2 router] |
| `POST /api/plan {profile}` | `[{slot, talk, backup, route{minutes, step_free, steps[]}, leave_by, why}]` [P1 data, P2 planner] |
| `POST /api/replan {profile, plan, change_id}` | `{affected, alert{what_changed, what_stays, do_now, route, leave_by}, plan, options[]}` [P2] |
| `GET /api/talks/{id}`, `GET /api/venue` | details, live status [P2] |
| `POST /api/changes`, `POST /api/changes/{id}/fix` | organizer actions [P2] |
| `GET /api/changes/stream` | SSE of changes [P2] |
| `POST /api/changes/{id}/ack` | anonymous `{affected, replan_ms}` [P2] |
| `POST /api/reports` | `{type, location, device_token}`; 2 matching in 10 min -> creates a change [P2] |
| `GET /api/organizer/summary` | counts, reports, gaps aggregations [P1 query, P2 router] |
| `GET /api/sessions/{id}/stream`, `.../catchup`, `.../questions` | companion (unchanged) [P2] |
| `GET /api/schedule.ics|.csv|.txt?ids=` | exports (unchanged) [P2] |

Steady's `PUT /api/profile/{user}`, `GET /api/plan/{user}` and `GET /api/alerts/{user}` are replaced by the stateless calls above.

## 6. Screens (P3)

Attendee (phone): 1 Welcome · 2 What helps you? · 3 How should we alert you? · 4 Topics · 5 Home with tabs **Plan / Search / Alerts / Report / Settings** · 6 Talk details (access facts, sensory notes, exports) · 7 Route (text steps first) · 8 Change alert (3 parts; renders as banner, live region or calm one-step depending on `alert_mode`) · 9 Other options · 10 Session companion (transcript + written Q&A) · 11 Report a problem.
Organizer (laptop): 12 Dashboard (venue status, reports, change buttons, live affected/re-planned, gaps) · 13 Presenter console (question queue).

Search results and Other options are one component. Alert history is the Alerts tab.

## 7. Sponsor tracks (one owner each, no duplicates)

| Track | What we show | Owner |
|---|---|---|
| Elasticsearch | Elastic asks for all four, so all four are Must: (1) ingest talks/venue/reports/changes; (2) **Jina** embeddings on `semantic_text` for hybrid search + needs filters + gaps aggregations; (3) **Agent Builder** "re-planner" agent with custom tools wrapping the Python planner; (4) **Elastic Workflow** "2 matching reports in 10 min -> mark connector down -> create change" | P1 |
| Gitar | `.gitar/review/instructions.md` rules: alerts have 3 parts; routes are text steps; controls labelled + keyboard; status not colour-only; OTel span on every API route; no secrets or personal data. Small PRs all day; CI auto-fix example | P1 |
| Dash0 | trace organizer tap -> SSE -> replan -> ack; SLOs: search latency, transcript delivery <2 s, **every affected attendee re-planned within 30 s**, **0 step-free routes through a down connector**; frontend RUM; one real Agent0/MCP finding | P2 |
| Radar | api + web on the cluster via Argo CD; Radar UI + MCP; AI investigation of a **real** issue (no staged incident) | P2 |
| Merge Forward | demo, axe in CI, VoiceOver pass, user-testing quote only if real and consented | P3 |

Test that backs the second SLO: `pytest` runs 100 random changes and asserts 0 suggestions break a profile's hard needs.

## 8. Timeline (build 1:00-4:30, video 4:30-5:00, submit by 5:15, hard deadline 5:30 MST)

Submission is on https://wemakedevs.org/hackathons/cnh: one member creates the account and team, invites the others, and submits with a **3-minute video demo**. Judges score what is submitted, so the video is the demo; presenting live is optional.

| Time | P1 search + data | P2 backend + platform | P3 frontend + quality |
|---|---|---|---|
| Now | Elastic Serverless signup (ela.st/hack-kubecon); Gitar on repo (app.gitar.ai) | Radar: join.cnh.radarhq.io code `radar-slc`, accept at app.radarhq.io, authenticate MCP; Dash0 trial | WeMakeDevs account + team, invite both |
| 1:00 | mappings with Jina `semantic_text`; `data/generate.py` (talks + venue); ingest | `schemas.py` PR (incl. plan/replan/alert); telemetry | shell, onboarding (screens 1-4) on mock data |
| 2:00 | hybrid search + `why` + tests | planner (route + plan) + 100-change test | Plan, Talk, Route screens |
| 3:00 | gaps aggregations; Agent Builder agent + tools | changes + SSE + replan + ack; **deployed via Radar/Argo CD by 3:00** | Change alert in 3 modes; Organizer dashboard |
| 3:30 | **cut check** (see below) | | |
| 3:30 | Elastic Workflow for reports; Gitar rules tuning | reports; session stream + Q&A; exports; SLOs, Dash0, Radar investigation | Report screen; companion UI; axe + VoiceOver |
| 4:15 | evidence in `docs/evidence/` | evidence | README (AI disclosure) |
| 4:30 | **freeze**; all three record the 3-min video (script in section 9) | | |
| 5:15 | submit on the platform (video + repo link) | | |
| 5:30 | hard deadline | | |

**Cut order if behind at 3:30** (top goes first): Catch me up -> tech-word captions -> session companion -> problem reports UI (keep the Workflow, fed by a seeded report) -> dashboard polish. Elastic's four asks (ingest, Jina, Agent Builder, Workflow) are not cut: they are the Elastic track.
**Never cut:** profile + plan + route + re-plan on change in all 3 alert modes + organizer buttons + accessibility. That alone is a complete demo.

## 9. Demo video (3 min, recorded 4:30-5:00; screen recording + voice-over, captions on the video)

1. (20 s) The gap: KubeCon's guide says accessible routes, access-aware planning and live elevator reporting are not provided.
2. (30 s) Three plans side by side: Marcus (step-free), Priya (captions, front seat), Sam (low sensory, calm alerts). Same conference, three days. Keyboard-only search with `why`.
3. (45 s) Organizer taps "Elevator B down". Three phones react within seconds: Marcus gets a new route via Elevator C and Leave by; Priya's phone vibrates with a big 3-part banner; Sam gets one calm step. Dashboard: "3 affected, 3 re-planned in N s".
4. (30 s) Priya in the session: transcript, jump back 30 s, written question read by the presenter.
5. (15 s) Pods-and-elevators line.
6. (40 s) How it was built: Dash0 trace + 30 s SLO; Radar workloads + real investigation; Elastic search, gaps and agent; Gitar PR list. Each of us explains our part.

## 10. Decisions made while merging (check with the team)

| Conflict | Chosen | Why |
|---|---|---|
| Name: Curb Cut vs Steady | Curb Cut (Radar team name may stay "Steady") | repo, docs and CI already use it |
| Team 2 vs 3 | 3 (P1/P2/P3) | confirmed at kickoff in `docs/RULES.md`. If really 2: P1+P2 merge, and cut companion + Agent Builder up front |
| Deadline 5:30 vs 5:15 | 5:30 (official announcement); we aim for 5:15 | `docs/RULES.md` still says 5:15 and needs updating |
| Live demo vs video | 3-min video, submitted on wemakedevs.org | judges score the submission |
| Server-stored profiles vs browser-only | browser-only + stateless replan + anonymous ack | keeps private by construction and still gives organizer counts |
| `GET /api/search?user=` vs `POST /api/search {profile}` | POST | no user id on the server |
| Planner: Agent Builder vs code | Python planner, Agent Builder agent wraps it as custom tools | testable and explainable, and still meets Elastic's Agent Builder ask |
| Repo: Radar starter vs this repo | keep this repo; open Claude Code here and say "Get me set up for the hackathon. Our team is <team name>." | the starter adds Argo CD + deploy config; we already have the app code |
| "Scale planner during a simulated spike" | dropped | rules: never stage an incident |

After the team agrees: update `docs/ARCHITECTURE.md` (indices + API), `docs/TEAM.md` (build order) and `CLAUDE.md` (one-line idea) in a small PR, and delete `STEADY_PLAN.md`.
