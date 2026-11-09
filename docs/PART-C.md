# Part C: session companion, organizer dashboard, presenter console (web/)

Runs in the browser on top of Part A's state (`useApp()`) and Part B's planner. Nothing here talks to a server yet: the session SSE, Q&A and organizer summary endpoints in `docs/ARCHITECTURE.md` (M1, M2) are a separate backend PR.

## Screens
| Screen | Route | Files |
|---|---|---|
| 10 Session companion (phone) | `/sessions/:talkId/join` | `components/SessionCompanion.tsx`, `lib/session.ts`, `lib/fixtures/transcripts.ts` |
| 12 Organizer dashboard (laptop) | `/organizer` | `components/OrganizerDashboard.tsx`, `lib/organizer.ts` |
| 13 Presenter console (laptop) | `/presenter/:talkId` | `components/PresenterConsole.tsx`, `lib/questions.ts` |

## Demo (two tabs)
1. Tab 1: `/` > Demo attendees > Use Marcus's demo needs.
2. Tab 2: `/organizer` > Elevator down > Elevator B > Announce change (if B is already down, Mark as fixed first). Tab 1 shows Part B's alert in Marcus's style; the dashboard shows "Elevator B down · N affected · N re-planned".
3. Alerts > Demo conditions > Demo clock "2:02 PM". Open `/sessions/talk-supply-chain/join`: transcript, Pause, Back 30 seconds, Catch me up, ask in writing.
4. `/presenter/talk-supply-chain` in another tab: Mark as read out. The question appears in the companion's transcript.

## Synced with Parts A and B (nothing duplicated)
- Prefs, talks, venue graph, clock and reports come from `useApp()`. A-/A+ changes the shared `textScale`.
- Organizer "Elevator down / Mark as fixed" call the shared `setElevatorStatus`; Part B's `ChangeWatcher` raises the alert. The affected count uses Part B's `routeUsedElevator` (moved from `ChangeWatcher` into `lib/changes.ts` so both use one check) on Part A's `buildAgenda`.
- `AppStateProvider` now adopts state written by another tab (`storage` event on `curbcut.v1.state`), so the organizer tab reaches the attendee tab.
- Bottom nav and the change alert are hidden on `/organizer` and `/presenter` (staff laptop screens).
- New shared types in `lib/types.ts`: `TranscriptChunk`, `WrittenQuestion`. Routes added to `lib/routes.ts`: `organizer`, `presenter(id)`. Demo clock preset "2:02 PM" added in `lib/time.ts`.
- Written questions live under `curbcut.v1.questions` (no name or device id; Reset clears it).

## Honest limits
- Transcripts are original sample lines replayed on the demo clock, labelled on screen; not a live captioner.
- Catch me up is the no-LLM fallback: the last 3 lines of the past minute.
- Affected counts come from the 3 demo personas on this device, labelled "Simulated". Live counts need anonymous acks from the API.
- Talk moved, Talk delayed, Room full and Path blocked are shown disabled with the reason: Part B has no shared state for them yet.
- Questions and reports reach other tabs in this browser only.
- Not built: "N people following on Curb Cut" on the presenter console, glossary tooltips, backend M1/M2.

## Tests
`web/tests/session.test.ts`, `web/tests/organizer.test.ts`, `web/tests/part-c.test.tsx`; e2e flow presenter -> companion and axe scans of the three screens in `web/e2e/flows.spec.ts`.
