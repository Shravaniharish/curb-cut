# Curb Cut review instructions

Curb Cut is an accessibility-first conference companion (FastAPI + Elasticsearch API in `api/`, Next.js in `web/`).
Review every PR against the checklists below. Be specific and cite the file and line.

## Accessibility (web/)
- Every control has an accessible name. Prefer semantic HTML over ARIA.
- Meaning is never carried by colour alone (labels, icons or text too).
- Every flow works by keyboard alone, with visible focus. Pages have a skip link and landmarks.
- Animation respects `prefers-reduced-motion`.
- The live transcript uses `aria-live="polite"` behind a visible on/off toggle.
- Alt-text state is always labelled `none`, `ai_draft` or `verified`.

## Privacy
- Fixtures, seed data, logs and tests contain synthetic data only: no real people, no copied conference content.
- The access profile lives in the browser only. The server must not persist it or log it.
- No secrets in the diff. `.env.example` lists variable names only.

## Observability
- Every new API endpoint has a span with meaningful attributes (never attributes that identify a person's needs).
- Product metrics use the agreed names: `search.latency`, `transcript.delivery_latency_ms`, `qa.queue_depth`.

## Data
- Every new `access` field has an Elasticsearch mapping, generator support in `data/generate.py`, and a test.
- Seeding stays idempotent.

## PR hygiene
- Small PRs. The description says what changed, why, and how it was verified, in plain language.
- Tests added or updated. Plain, readable code over clever code.
