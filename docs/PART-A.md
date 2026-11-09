# Part A: attendee experience (web/)

Onboarding, personalised plan, search, talk details, step-free routing, settings and export. Everything runs in the browser against **demo data**. Nothing here is a verified KubeCon schedule, floor plan or live elevator feed.

## Run
```bash
cd web && npm ci
npm run dev            # http://localhost:3000
npm test               # Vitest unit + component tests
npm run lint && npm run typecheck && npm run build
npx playwright install chromium && npm run test:e2e
```
Demo walkthrough: open `/`, press "Demo attendees" > "Use Marcus's demo needs" (or do Get started by hand: Step-free routes + Extra travel time, Screen reader alerts, Security + Observability).

## Contracts for Parts B and C
- **Types:** `web/lib/types.ts` (`AttendeePreferences`, `Talk`, `AccessibilityMetadata`, `NavigationGraph`, `AgendaItem`, `Reminder`, `PersistedState`). Unknown is an explicit state, never `false`.
- **Routes:** `web/lib/routes.ts` (`ROUTES`). Part A owns `/`, `/setup/*`, `/plan`, `/search`, `/settings`, `/talks/:talkId`, `/route/:destinationId`. Placeholders exist (clearly labelled, no fake success) for `/alerts`, `/report`, `/changes` (Part B) and `/sessions/:sessionId/join` (Part C; the talk id is the session id). Replace the page files; keep the paths.
- **Shared state:** `useApp()` from `web/lib/store.tsx` exposes preferences, agenda, selected talk (`state.selectedTalkId`), current route (`state.currentRoute`), reminder, elevator status (`setElevatorStatus`), the clock and room ids. Do not keep copies.
- **Shared components:** `web/components/` (`ChangeSummaryBlock`, `AccessStatusBadge`, `TalkCard`, `Dialog`, `BottomNavigation`, ...).
- **Storage:** one key `curbcut.v1.state` (localStorage) and `curbcut.v1.search` (sessionStorage). Reset removes only keys with the `curbcut.` prefix.

## Search
`web/lib/search/`: `TalkSearchAdapter` with a local demo adapter (default) and an Elasticsearch adapter that calls `POST {NEXT_PUBLIC_API_URL}/api/search` with `{q}` only. Set `NEXT_PUBLIC_SEARCH_BACKEND=elasticsearch` to use it. Required needs are applied locally after retrieval, so they are never sent. The adapter is tested only against a fake `fetch`; the API router did not exist when this was written, so the response shape (`{hits:[{id, score?, why?}]}`) is unverified against a live deployment.

## Decisions to confirm with the team
- Required needs are step-free routing and captions. Everything else only ranks.
- Automatic captions count as "captions available" for the Captions required filter and are labelled "Auto captions".
- Default travel buffer 2 min; 6 min when "Extra travel time" is on. Sample talk end times (40 min) are placeholders, flagged in each talk's `provenance.sampleFields`.
- `.github/workflows/ci.yml` (P1) does not yet run `npm test`.
