# Sravani: Part A (Setup, Plan, Search, Talk details, Route, Settings)

You build the first-time setup and the everyday screens of Curb Cut, plus the shared
pieces everyone else uses. Work in small steps; each step is one pull request (PR)
that Gitar reviews. Small PRs from you all day also count for the Gitar track.

**Your most important job: Step 1 (the foundation). Merge it by about 1:50 PM.**
Gauri (Part B) and Manasa (Part C) build on it.

## Before you start (5 min)

1. Get the latest code:
   ```
   git checkout main
   git pull
   ```
2. Put the design brief in the repo so Claude Code can read it: save
   `CurbCut_PartA_Setup_Plan_Route.md` as `docs/design/part-a.md`.
3. If Claude Design already made your screens, export screenshots of each screen and
   save them in `docs/design/part-a/` (for example `01-welcome.png`). Claude Code can
   look at images. If not, skip this: the brief is detailed enough.
4. Open Claude Code in the repo folder: `claude`
5. First message to Claude Code:
   ```
   Read CLAUDE.md, PLAN.md and docs/design/part-a.md. Tell me in 5 lines what
   Curb Cut is, what my part (Part A) is, where the frontend code lives, and what
   the frontend already has. Don't change anything yet.
   ```
   Check its answer makes sense before continuing.

## How every step works

1. Make a branch: `git checkout -b <branch name from the step>`
2. Paste the prompt into Claude Code. Use plan mode first (press Shift+Tab until it
   says plan mode), read the plan, then approve.
3. Run the app and click through the screens. Try them with only the keyboard (Tab,
   Enter, Escape).
4. Tell Claude Code: "Commit, push, and open a pull request with a short description."
5. Wait for Gitar's review on GitHub. If it found something, reply to its comment
   `@gitar please fix this`, or fix it with Claude Code. Then merge.
6. Back to main: `git checkout main && git pull`. Type `/clear` in Claude Code.
   Next step.

## Step 1: Foundation and shared components (branch `feat/a1-foundation`, ~25 min)

Merge this first and tell Gauri and Manasa as soon as it's merged.

```
Using the "Shared design system" and "Shared components" sections of
docs/design/part-a.md, set up the frontend foundation:

1. Design tokens: Atkinson Hyperlegible font, colours, spacing, 12px card radius,
   56px main buttons, 48px minimum touch targets, a 3px teal focus outline on
   everything focusable. Support text size, high contrast, dyslexia-friendly font
   and reduce motion as settings applied app-wide.
2. Shared components, each in its own file, keyboard accessible and labelled:
   BottomTabBar (Plan, Search, Alerts, Report, Settings), TalkCard, AccessTag,
   ThreePartChangeBlock (What changed / What stays the same / What to do now),
   LeaveByLine, PrimaryButton, SecondaryButton, ScreenHeader.
3. App shell with routes for every screen in PLAN.md (screens from other parts can
   be empty placeholders with their title).
4. A profile store in browser localStorage with try/catch, using the profile fields
   in PLAN.md section 3. Nothing about the profile is ever sent to the server except
   inside the request body of plan/search/replan calls.
5. Mock data file matching the demo data (Marcus, Priya, Sam, the 4 talks, rooms,
   elevators A/B/C) and an api client with functions for POST /api/plan,
   POST /api/search and GET /api/talks/{id} that return mock data for now, behind
   one flag so we can switch to the real API later.

Follow CLAUDE.md. Status must always be in words, never colour alone. No animation.
```

## Step 2: Setup screens 1-4 (branch `feat/a2-onboarding`, ~25 min)

```
Build Screens 1-4 from docs/design/part-a.md: Welcome, "What helps you?",
"How should we alert you?", "What are you interested in?". Use the shared
components. Save choices to the profile store. "Skip setup" and "Skip" go to the
Plan tab. Progress text "Step 1 of 3". Group checkboxes with fieldset and legend.
Every control labelled and keyboard reachable; focus moves to the screen heading on
each new step. Never ask why someone needs something.
```

## Step 3: Plan tab and Talk details (branch `feat/a3-plan`, ~30 min)

```
Build Screen 5a (Plan tab) and Screen 6 (Talk details) from docs/design/part-a.md.
Plan tab: Now / Next card with LeaveByLine and "Take me there"; a secondary
"My plans changed" button that links to the Part B route (placeholder is fine);
today's plan as TalkCards with "Why" and a backup; a quiet break card; an
"Export plan" link with .ics / .csv / .txt options. Data comes from the api client's
plan function (mock for now). Talk details: why it fits, access facts with icon and
words, honest caption and slide-description tags, sensory notes, backup card,
"Take me there", "Join session" (links to Part C route), "Add to calendar".
Show loading and error states in words.
```

## Step 4: Route screen (branch `feat/a4-route`, ~20 min)

```
Build Screen 7 (Route) from docs/design/part-a.md: header with destination, minutes
and "Step-free" in words; large LeaveByLine; numbered text steps as an ordered list;
a note listing anything avoided ("Avoids Elevator B (not working)"); a simple
optional map below the steps labelled "Map (optional)" with a text alternative;
"I've arrived" and "Remind me 5 minutes before I need to leave" buttons. Data comes
from the plan's route object.
```

## Step 5: Search and Settings (branch `feat/a5-search-settings`, ~25 min)

```
Build Screen 5b (Search) and Screen 5e (Settings) from docs/design/part-a.md.
Search: one large labelled search box, results as TalkCards with "Why it fits you",
empty state and no-results state, results announced to screen readers with a polite
live region ("4 talks found"). Uses the api client's search function with the
profile. Settings: links to edit needs, alert style and topics (reuse the setup
screens); text size slider with a live preview line; high contrast, dyslexia-friendly
font and reduce motion toggles that apply app-wide; privacy note; "Clear all my
data" with a confirmation dialog that empties localStorage.
```

## Step 6: Connect to the real API (branch `feat/a6-real-api`, when backend is ready)

Ask the backend person which routes are live first.

```
Switch the api client from mock to the real API for POST /api/plan,
POST /api/search and GET /api/talks/{id}, following the schemas in
api/app/schemas.py. Keep the mock as a fallback if the API is unreachable, and show
a small "Using sample data" note when it is. Send the profile only in the request
body. Add OpenTelemetry browser tracing on these calls if our frontend telemetry
setup exists.
```

## Before 4:15: accessibility check (~15 min)

```
Run an accessibility check on all Part A screens: run axe and fix every issue;
check every control has a label; check tab order follows the visual order; check
focus is visible; check nothing relies on colour alone; check text still fits at
the largest text size. List what you fixed.
```

Then test once yourself with VoiceOver (Mac: Cmd + F5): go from Welcome to Route
without looking at the screen.

## You're done when

- [ ] Step 1 merged early, and Gauri and Manasa told
- [ ] All Part A screens work and link to each other
- [ ] Every screen works with keyboard only and with VoiceOver
- [ ] Each step went through its own PR reviewed by Gitar
- [ ] Real API connected (or clearly marked sample data)
- [ ] You can explain your part in 30 seconds for the demo video

## If you get stuck

- Paste the exact error into Claude Code, not "it doesn't work."
- Press Esc to stop Claude Code if it goes the wrong way.
- After 2 failed tries, ask the team instead of retrying forever.
- Merge conflict? Ask Claude Code: "Help me resolve this merge conflict, keeping both
  changes where possible," then check the result.
