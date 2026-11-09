# CLAUDE.md: Curb Cut

Curb Cut is a conference companion for disabled attendees. It finds the right talk, gets you there step-free, keeps you in the room, and re-plans your day when something changes, in the way you can receive it.
Pitch: "When a node fails, Kubernetes reschedules pods onto nodes that meet their requirements. When an elevator fails, Curb Cut reschedules people onto routes and rooms that meet theirs."

Read `docs/PLAN.md` and `docs/ARCHITECTURE.md` before any task.

## Stack
Next.js (frontend, OpenTelemetry RUM), FastAPI + Pydantic (backend, OpenTelemetry), Elasticsearch Serverless (talks, venue, transcript_chunks, questions, reports, changes). Deploy: GitHub Actions -> GHCR -> Argo CD -> Radar. Telemetry -> Dash0.

## Rules (also enforced by Gitar)
- Private by construction: the profile lives only in browser localStorage. The server never stores or logs a profile or a query text. Never add a profiles/attendees index.
- Preference-first: never ask for a diagnosis or reason. Needs are chosen from a list.
- Text-first: routes are numbered text steps; a map is extra.
- Status is words + icon, never colour alone. All controls labelled and keyboard-operable. Visible focus (3px). 48px touch targets, 56px main buttons. Respect `prefers-reduced-motion`.
- Every change alert has three parts: What changed / What stays the same / What to do now.
- Alert modes: `vibrate_text`, `screen_reader`, `calm_text`.
- Every API route has an OpenTelemetry span. No profile data in span attributes.
- No secrets in code. Use `.env` (gitignored).
- Original synthetic data only. Never copy real conference text or real people.
- The Python planner is the source of truth and is unit-tested. Elastic Agent Builder only wraps it.
- Pydantic models in `api/app/schemas.py` are the contract. Change them first, in their own small PR.

## Workflow
Small PRs. One feature per branch. Use plan mode for anything over ~30 lines. Run `pytest` and the frontend tests before pushing. Ask Gitar to fix review comments with `@gitar please fix this`. `/clear` between tasks.

## Design tokens
Font Atkinson Hyperlegible. Teal #0F6E6E, background #FBF8F3, text #1F2328, amber #FEF3C7/#B45309, red #B42318, green #1E7B45.

## Personas (illustrative composites, not spokespeople)
Marcus (step-free routes), Priya (captions, front seat, vibrating alerts), Sam (autistic: low-sensory, quiet breaks, calm one-step alerts).
