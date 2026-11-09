# Gauri: Part B (Changes, Alerts, Report): frontend + backend

You build the heart of the app: when something changes, each phone re-plans and tells the person in the way they can receive it.

Loop for every step: branch -> plan mode (Shift+Tab) -> paste prompt -> test -> commit -> push -> PR -> `@gitar please fix this` -> merge -> `/clear`. Small PRs. No secrets. Never store or log a profile.

## Before you start
1. `git pull`. Ask Sravani when `feat/a1-foundation` and `feat/b1-schemas` (schemas.py + docs/api-examples) are merged. Until then, work on your design and write tests against the example JSON.
2. Save your Claude Design output in `docs/design/part-b/` and the brief as `docs/design/part-b.md`.
3. Open Claude Code and say:
   > Read CLAUDE.md, PLAN.md (sections 2, 3, 5), api/app/schemas.py and docs/design/part-b.md. Do not write code. Summarise in 8 lines how re-planning works and why the server never stores a profile.

## Backend first (the frontend needs it)

### G1. `feat/g1-replan`  (~45 min, most important)
> Plan first. Create `api/app/planner/replan.py` and `POST /api/replan {profile, plan, change_id}`. Use `find_route` and `build_plan` from planner (if not merged yet, write against their signatures and stub them in tests).
> Change types: `connector_down` (elevator/ramp), `room_change`, `talk_moved`, `talk_cancelled`, `room_full`. Plus personal changes via an optional `personal` field: `{type: "late", minutes}` | `{type: "missed", talk_id}` | `{type: "break_now"}`.
> Logic:
> - `affected` = true only if a talk in this person's plan is touched, or a route in the plan uses the broken connector.
> - If not affected, return `affected=false` and the same plan.
> - If affected, recompute routes (never through a down connector, never stairs for step_free), pick the best alternative talk by topic if the talk is gone/full, keep everything else unchanged.
> - Return `alert` with three parts: `what_changed`, `what_stays` (always say what stays the same), `do_now` (one clear action), plus `route` and `leave_by`.
> - `personal late`: shift leave_by, keep talk if still reachable, else offer the backup. `missed`: next talk on same topic + transcript link. `break_now`: add a 20 min break at the nearest quiet room and move things back.
> - Return up to 3 `options` for the "Other options" screen, each with a one-line why.
> Use plain, calm wording. Add an OTel span `replan` with attributes affected and replan_ms. No profile data in attributes.
> Tests: (1) unaffected profile gets affected=false, (2) Marcus never routed through a down connector, (3) run 100 random changes x random profiles and assert zero hard-need violations, (4) each personal type returns a valid alert.

### G2. `feat/g2-changes-sse`  (~40 min)
> Add `api/app/routers/changes.py`:
> - `POST /api/changes` {type, target, details}: save to Elasticsearch `changes`, and if type is connector_down set that connector's status to down in `venue`. Broadcast to all connected clients.
> - `POST /api/changes/{id}/fix`: mark fixed_at and set the connector back to ok, broadcast.
> - `GET /api/changes/stream`: Server-Sent Events, sends each new change as JSON, with a heartbeat comment every 15s. Keep an in-memory list of subscriber queues.
> - `POST /api/changes/{id}/ack {affected, replan_ms}`: anonymous, store only counts (increment in memory + a small `acks` doc). No device id, no profile.
> Tests: posting a change delivers one SSE event to two subscribers; ack stores no identifying fields.

### G3. `feat/g3-reports`  (~20 min)
> `POST /api/reports {type, location, device_token}` to the `reports` index. When 2 reports with the same type and location arrive within 10 minutes (from different device_tokens), automatically create a change (same path as POST /api/changes). `device_token` is a random string made by the app, never tied to a person. Test the 2-in-10-minutes rule with fake times.

## Frontend (after Sravani's foundation is merged: use her shared ThreePartChangeBlock, TalkCard, BottomTabBar, design tokens)

### G4. `feat/g4-change-alert`  (~50 min)
> Build screen 8 per docs/design/part-b.md using the shared ThreePartChangeBlock. Read `alert_mode` from the profile in localStorage:
> - `vibrate_text`: big banner at the top, call `navigator.vibrate([200,100,200])` if supported, large text, one main button.
> - `screen_reader`: render in an `aria-live="assertive"` region, reading order what changed -> what stays -> what to do, no decorative content.
> - `calm_text`: one part per screen, counter "1 of 3", soft colours, a "Next" button, no vibration, no motion.
> Subscribe to `/api/changes/stream` with EventSource. On each change: POST /api/replan with the profile and plan from localStorage, show the alert if affected, save it to alert history (localStorage), update the plan, then POST the anonymous ack with the time taken in ms.
> Use mock data and a "Simulate change" button in dev when the backend isn't ready.
> Keyboard-only test, focus moves to the alert when it appears, status never by colour alone.

### G5. `feat/g5-options-alerts`  (~35 min)
> Build screen 9 (Other options) as the same component as search results, screen 5c (Alerts tab = alert history from localStorage, tags "Event change" / "Your change"), and screen 5f ("My plans changed": Running late / Missed it / Need a break now -> POST /api/replan with `personal` -> show the result with the 3-part block).
> Also add a "While you were away" card at the top of the Plan tab: when the app is reopened after being hidden for more than 5 minutes and there are new alerts, show "N changes since <time>", a one-line summary of each in calm words, the next action with leave-by, and a "Got it" button. It only reads alert history, no new API.

### G6. `feat/g6-report`  (~25 min)
> Build screen 11 (Report a problem): choose type (elevator not working, route blocked, room full...), choose location from the venue rooms, one big Send button, confirmation "Thank you. We will tell others if two people report the same thing." Generate a random device_token once and keep it in localStorage. POST /api/reports.

## Accessibility check (before 4:15)
axe extension on every screen of yours (0 serious issues), keyboard-only through G4 and G5, VoiceOver (Cmd+F5) hearing the alert in screen_reader mode, `prefers-reduced-motion` respected in calm mode.

## Done when
- [ ] Organizer-style test: `curl -X POST /api/changes` with elevator B down -> a phone in the browser shows the alert in all 3 modes within a few seconds
- [ ] Marcus gets a new step-free route, Priya a big banner, Sam one calm step
- [ ] "Running late / Missed it / Need a break" all produce a valid alert
- [ ] 100-random-change test passes
- [ ] History shows in the Alerts tab, and the "While you were away" card appears

## If you are behind at 3:30
Keep G1, G2, G4 (all three modes). Cut G6 UI first (keep the backend with a seeded report), then the "While you were away" card.
