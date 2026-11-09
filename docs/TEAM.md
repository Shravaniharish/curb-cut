# Team and build order

Event: WeMakeDevs Cloud Native Hackathon, Mon Nov 9 2026, Salt Lake City. Hacking starts 11:00. Freeze and record 4:30. Aim to submit by 5:15. Hard deadline 5:30 (Mountain time). Submission: 3-minute video + repo link on wemakedevs.org/hackathons/cnh (one person creates the team and invites the others).

## Who builds what
| Person | Frontend | Backend | Guide |
|---|---|---|---|
| Sravani | Part A: screens 1-4, Plan, Search, Settings, Talk details, Route | schemas, data, Elastic ingest + search, planner + route, talks/venue, exports, healthz | `guides/sravani-frontend.md`, `guides/sravani-backend.md` |
| Gauri | Part B: Change alert (3 modes), Other options, Alerts, My plans changed, Report | replan, changes + SSE + ack, reports | `guides/gauri-part-b.md` |
| Manasa | Part C: Session companion, Organizer dashboard, Presenter console | organizer summary, session stream/catch-up/questions, Elastic Agent Builder + Workflow, Gitar rules | `guides/manasa-part-c.md` |

Open owners to settle in the group chat: Dash0 setup (traces, SLOs, RUM), Radar + Argo CD deploy (Dockerfiles, GitHub Actions, secrets), WeMakeDevs submission, README (AI disclosure).

## Build order (dependencies)
1. `schemas.py` + `docs/api-examples/*.json` (Sravani B1). Everyone else waits for this.
2. Frontend foundation: tokens, shared components (BottomTabBar, TalkCard, ThreePartChangeBlock, LeaveByLine), app shell, localStorage profile, mock data (Sravani A1, target 1:50 PM).
3. Data + Elastic ingest (B2, B3). Planner + route (B5). Gauri's replan builds on these.
4. In parallel: Gauri's changes/SSE, Manasa's organizer and session endpoints, each person's screens on mock data.
5. Deploy via Radar/Argo CD (target 3:00).
6. 3:30 cut check. 4:15 evidence in `docs/evidence/`. 4:30 freeze, record video.

## Rules of working
- Branches: `feat/a*` (Sravani), `feat/b*`/`feat/g*` (Gauri), `feat/c*`/`feat/m*` (Manasa). Small PRs into `main`, rebase often.
- Every PR goes through Gitar. Do not leave long-lived branches.
- Anyone who changes a Pydantic model says so in the group chat.

## Cut order if behind at 3:30
Catch me up -> tech-word captions -> session companion -> problem reports UI (keep the Workflow, fed by a seeded report) -> dashboard polish. Elastic's four asks (ingest, Jina, Agent Builder, Workflow) are not cut.
Never cut: profile + plan + route + re-plan on change in all 3 alert modes + organizer buttons + accessibility.
