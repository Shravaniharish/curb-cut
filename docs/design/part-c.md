# Curb Cut, Part C of 3: Session companion, Organizer dashboard, Presenter console

Person C designs these screens. Copy everything below the line into Claude Design.

---

Design Part C of "Curb Cut": following a live talk on the phone, plus the two laptop screens used by the event's access team and the speaker. Screen 10 is phone (390px wide); Screens 12 and 13 are laptop (1440px wide). Make it a clickable prototype.

## About the app (same for all three parts)

"Curb Cut" is a conference companion app for disabled attendees at KubeCon in Salt Lake City. It finds the right talk, gets you there step-free, helps you follow and take part in the session, and re-plans your day when something changes (talk moved, room full, elevator broken, or you're running late), telling you what to do in the way you can receive it. Like a curb cut built for wheelchairs, every feature serves disabled people first and makes things better for everyone.

This prompt is ONE PART of a larger app that two other designers are building at the same time. Follow the shared design system below exactly, so all parts look like one app. Where a button leads to a screen from another part, show the button and label where it goes; don't design that screen.

## Shared design system (follow exactly)

- Font: Atkinson Hyperlegible (designed for low-vision readers). Body 18px, small text never below 16px, headings 24/28px semibold.
- Colours:
  - Primary (teal): #0F6E6E. Text on primary: #FFFFFF
  - Background (warm off-white): #FBF8F3. Cards: #FFFFFF with a 1px border #E4DED4, corner radius 12px
  - Text: #1F2328. Secondary text: #4B5563
  - "Something changed" (amber): background #FEF3C7, border and icon #B45309
  - "Not working" (red): #B42318, always with the words "Not working"
  - "OK / step-free" (green): #1E7B45, always with a word next to it
- Buttons: main button full-width, 56px tall, teal background, white text. Secondary button: white with teal border and teal text. Minimum touch target 48px.
- Focus outline: 3px #0F6E6E outline with 2px offset on everything focusable.
- Icons: simple line icons, always paired with words.
- Rules: calm and uncluttered, plenty of space, no decorative animation, one main action per screen, plain short sentences, no medical words, never ask why someone needs something, status always in words plus icon (never colour alone), routes always as numbered text steps first with a map only as an extra.
- Honest labels as small tags: captions "No captions" / "Auto captions" / "Live captioner"; slide descriptions "No descriptions" / "AI draft" / "Verified".

## Shared components (draw them the same way)

- **Bottom tab bar (phone):** Plan · Search · Alerts · Report · Settings, icon above word, active tab in teal with a bold label.
- **Talk card:** time (bold) · title · room and floor · access tags in a row ("Step-free room", "Live captioner", "Quiet room nearby") · one line "Why: ..." in secondary text.
- **Three-part change block:** three stacked sections with bold labels "What changed", "What stays the same", "What to do now"; amber left border 4px; "What to do now" text slightly larger.
- **Leave-by line:** clock icon + "Leave by 1:48 PM" in large bold text.

## Demo data

- Conference: KubeCon, Salt Palace, Salt Lake City, Monday 9 November. 3 floors, rooms like "Room 251", "Room 355", "Ballroom E". Elevators A, B, C. A quiet room on every floor.
- Marcus: uses a wheelchair; needs step-free routes and extra travel time; topics Security, Observability; alert style: screen reader.
- Priya: Deaf; captions required, front seat; alert style: vibrate + big text.
- Sam: autistic; low-sensory spaces, quiet breaks; alert style: calm, one step at a time.
- Talks: "Securing Your Supply Chain Without Slowing Down" (2:00 PM, Room 355); "Observability for Beginners" (3:00 PM, Room 251); "Kubernetes RBAC in Plain English" (2:00 PM, Ballroom E, backup); "Supply Chain Security Q&A" (3:30 PM, Room 251).

## Screens in Part C

### Screen 10: Session companion (phone)
- Opened from "Join session" on Talk details, or "View transcript of what I missed".
- Header: talk title, room, caption tag ("Live captioner" or "Auto captions"). Back arrow.
- Live transcript in large, high-contrast text, newest line at the bottom, speaker labels ("Speaker:"). Questions read out by the presenter appear inline, highlighted: "Question read out: How do we sign container images?"
- Controls row: Pause / Resume, "Back 30 seconds", "Read new lines aloud" toggle, text size (A- / A+).
- Bottom: "Ask a question in writing" text box with "Send" → confirmation "Sent to the presenter. You'll see it here when it's read out."
- Small secondary button "Catch me up" → a sheet with a 3-bullet summary of the last minute, each bullet with a timestamp you can tap to jump back.
- Also design a "paused" state ("Paused. 6 new lines waiting. Resume").

### Screen 12: Organizer dashboard (laptop)
- Header: "Curb Cut · Access team · KubeCon Salt Lake City".
- Left column "Venue status": grouped by floor; each elevator, ramp and path with status in words + icon ("Elevator B: Not working", "Ramp 2: OK").
- Middle column "Announce a change": large buttons: Talk moved, Talk delayed, Room full, Elevator down, Path blocked, Mark as fixed. Clicking one opens a panel to pick the talk / room / elevator and confirm ("Announce change").
- Live result card after announcing: "Elevator B down · 12 attendees affected · 12 re-planned in 8 seconds", with a progress bar labelled in words. Note under it: "Counts are anonymous. We never see anyone's needs."
- Right column "Reports from attendees": incoming reports with time, type, place and count ("2 reports · Elevator B"), buttons Confirm / Dismiss. Highlight when 2 matching reports arrive: "Confirmed by 2 people. Announce as change?"
- Bottom panel "Access gaps": e.g. "4 talks have no captions", "1 interpreter talk is in a room that isn't step-free", each with "View".
- Design two states: calm (everything OK) and right after "Elevator B down" is announced.

### Screen 13: Presenter console (laptop)
- For the speaker's laptop during the talk. Very large, simple.
- Talk title, a status line: "Captions: Live captioner · 3 people following on Curb Cut".
- "Written questions" queue, oldest first, each with "Mark as read out" (moves it to the done list and into attendees' transcript).
- Empty state: "No written questions yet."

## Flows in Part C
1. Attendee: Talk details → Join session → Session companion → ask in writing → sent → question appears in transcript when read out.
2. Missed a talk: "View transcript of what I missed" → Session companion → Catch me up.
3. Organizer: Dashboard → Announce a change → pick item → confirm → live "affected / re-planned" card (attendees' phones show the Change alert, designed in Part B).
4. Reports: two matching reports appear → "Confirmed by 2 people" → Announce as change.
5. Presenter: Presenter console → Mark as read out → appears in Session companion transcript.
