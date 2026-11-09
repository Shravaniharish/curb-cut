# Part B: changes, alerts, other options, report (web/)

Runs in the browser on top of Part A's state (`useApp()`). Nothing here talks to a server yet: the planner calls, the SSE stream and the report endpoint in `docs/ARCHITECTURE.md` do not exist, so this part is honest about it on screen.

## Screens
| Screen | Route | Files |
|---|---|---|
| 8 Change alert (3 styles) | opens over any screen; also `/alerts/:id` | `components/ChangeAlert.tsx`, `ChangeWatcher.tsx`, `AlertDetail.tsx` |
| 5f My plans changed | `/changes` | `app/changes/page.tsx` |
| 9 Other options | `/changes/options` | `app/changes/options/page.tsx`, `OtherOptionsList.tsx` |
| 5c Alerts tab | `/alerts` | `app/alerts/page.tsx` |
| 11 Report a problem | `/report` | `app/report/page.tsx`, `lib/reports.ts` |

Styles: `vibrate_big_text` (amber "Plan changed" banner, large text, one `navigator.vibrate`), `screen_reader` (assertive live region, "Read aloud automatically"), `calm_step_by_step` (one part per step, "Step 1 of 3", Next, route button only on the last step, no vibration). No style chosen falls back to the plain block.

## Synced with Part A (nothing duplicated)
- Preferences, agenda, venue graph, clock and location come only from `useApp()`; `lib/usePlanContext.ts` is the single adapter.
- Routes and leave-by use Part A's `calculateRoute`, `bufferMinutes`, `checkRequirements`, `whyFits`, so an alert cannot promise a route the planner would not give, and required needs (step-free, captions) are never relaxed.
- Reuses `TalkCard`, `Dialog`, `ui` buttons, `DemoControls`, `BottomNavigation`, design tokens. "Show new route" sets `currentRoute`/`selectedTalkId` and goes to Part A's `/route/:id`; "OK" goes to `/plan`; the Plan tab already links to `/changes`.
- Shared types extended in `lib/types.ts`: `AlertRecord`, `ReportRecord`, and `PersistedState.alerts/reports/alertsSeenAt`. Sanitised on load in `lib/preferences.ts`. Same key, `curbcut.v1.state`; no new profile storage. Old saved state loads with empty lists.
- Routes added to `lib/routes.ts`: `options`, `alert(id)`.

## Honest limits
- Event changes come from the simulated elevator controls (Alerts tab > Demo conditions, or Route > Demo conditions). Every such alert says "Simulated demo condition, not live venue data."
- Elevator B is already out of service in the default demo state, so the alert fires when a status *changes* (e.g. set B to Working, then Not working).
- Reports are kept on the device only. The thank-you screen says nothing was sent. The "second report" button is a labelled demo stand-in; the real 2-in-10-minutes rule belongs to the backend.
- Part C's transcript page is still a placeholder; "View transcript of what I missed" links to `/sessions/:talkId/join`.
- Not built: SSE subscription, `POST /api/replan`, anonymous ack, "While you were away" card on Plan (G5).

## Tests
`web/tests/changes.test.ts` (wording and planner rules), `web/tests/part-b.test.tsx` (the three styles, Alerts tab, report flow).
