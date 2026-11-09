# Curb Cut: context for Claude Code

Accessibility-first conference companion for the Cloud Native Hackathon (WeMakeDevs), Mon 9 Nov 2026, Salt Lake City (Mountain Time).
Build 1:00-6:00 pm, feature freeze 5:00 pm, demo/judging 6:00-7:00 pm. Cut line: if behind at 3:30 pm, drop "catch me up", then dashboard polish.
Guiding idea: a curb cut built for wheelchairs helps everyone. Every feature serves its target group and improves the default for all.

Read `docs/TEAM.md` (who owns what), `docs/ARCHITECTURE.md` (contract between areas) and `docs/RULES.md` (hackathon rules and judging) first.

## Hard rules
- Stay inside the area of the human you work for. Propose cross-area changes as a note to the owner.
- Every change goes through a branch and PR. Small PRs. Description: what changed, why, how verified, in plain language a teammate can repeat to a judge. Wait for Gitar's review and address it before merging.
- Synthetic data only (fictional names, original abstracts and transcripts). Never copy real conference data or people's content.
- Secrets only in env vars. `.env.example` has names only.
- Prefer plain, readable code. Humans must be able to explain everything that ships.
- Verify unfamiliar APIs (Elastic retrievers, Dash0, Gitar, Radar) from official docs before coding. Do not guess syntax.
- Ask the human before changing scope, adding a dependency that needs an account, or touching anything in `docs/RULES.md`.
- Report plainly what you ran and what passed. If a check fails or a step is skipped, say so.
- Finish each task with two sentences the human could say to a judge: what it does and why it was built that way.

## Design principles
Preference-first (app infers nothing) / private by construction (profile in browser localStorage, try/catch; server persists none; sent only as ranking hints) / text-first / predictable (sensory notes before commit) / explained (every hit has a `why` line) / honest labels (alt text `none|ai_draft|verified`) / humble (personas are illustrative composites; never claim to speak for a community).

## Commands
API (`api/`): `.venv/bin/ruff check .`, `.venv/bin/pytest -q`, `.venv/bin/uvicorn app.main:app --reload`
Web (`web/`): `npm run lint`, `npm run typecheck`, `npm run test:e2e`, `npm run dev`. Read `web/node_modules/next/dist/docs/` before writing Next code (this Next version differs from older ones).

## Known dependency notes
- Python: no separate Elasticsearch OTel package; `elastic-transport` traces natively. Verify in Step 1.
- Web OTel packages are pinned to a consistent set (API 1.9.1, sdk-trace-web 2.12.1). Do not bump one without the others.
