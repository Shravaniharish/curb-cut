# Curb Cut: screens and navigation (for Claude Design)

Paste everything below the line into Claude Design.

---

Design "Curb Cut", a conference companion app for disabled attendees at KubeCon in Salt Lake City. It finds the right talk, gets you there step-free, helps you follow and take part in the session, and re-plans your day when something changes (talk moved, room full, elevator broken), telling you what to do in the way you can receive it. Like a curb cut built for wheelchairs, every feature serves disabled people first and makes the experience better for everyone.

Build a clickable prototype: an attendee app (phone, 390px wide) and an organizer app (laptop, 1440px wide). Link every button to the screen named in "Goes to".

## Design rules (strict)

- Calm, uncluttered, friendly, trustworthy. Plenty of white space. No decorative animation.
- Body text 18px or larger; headings clear; high contrast (WCAG AA minimum).
- Touch targets at least 48px. One main action per screen, as a large full-width button.
- Every status written in words plus an icon. Never rely on colour alone.
- Plain, short sentences. No medical words. Never ask why someone needs something.
- Routes are always numbered text steps first; a map is only an extra below them.
- Show focus outlines clearly (keyboard users).
- Palette: deep teal as the main colour, warm off-white background, dark charcoal text. Amber only for "something changed". Red only for "not working". Green only for "OK / step-free", always with a word next to it.
- Honest labels shown as small tags: captions are "No captions", "Auto captions" or "Live captioner"; slide descriptions are "No descriptions", "AI draft" or "Verified".

## Demo data

- Conference: KubeCon, Salt Palace, Salt Lake City, Monday 9 November. 3 floors, rooms like "Room 251", "Room 355", "Ballroom E". Elevators A, B, C. A quiet room on every floor.
- Main attendee shown: Marcus. Needs: step-free routes, extra travel time. Topics: Security, Observability. Alert style: screen reader.
- Alert variants also shown for Priya (captions required, front seat; alert style vibrate + text) and Sam (low sensory, quiet breaks; alert style calm).
- Example talks: "Securing Your Supply Chain Without Slowing Down" (2:00 PM, Room 355), "Observability for Beginners" (3:00 PM, Room 251), "Kubernetes RBAC in Plain English" (backup, 2:00 PM, Ballroom E).

## ATTENDEE APP (phone)

### Screen 1: Welcome
- Purpose: explain the app in one breath and promise privacy.
- Content: app name "Curb Cut"; one line: "Find the right talk, get there, and know what to do when plans change." Privacy note with a lock icon: "Your needs stay on this phone. We never store them."
- Buttons: "Get started" (main) → Screen 2. Text link "Skip setup" → Screen 5 (Plan tab).

### Screen 2: Setup 1 of 3, "What helps you?"
- Progress: "Step 1 of 3".
- Short line: "Choose anything that helps. You never need to tell us why."
- Grouped large checkboxes:
  - Getting around: Step-free routes; Extra travel time
  - Hearing and seeing: Captions required; Interpreter preferred; Front seat; I use a screen reader; Slides ahead of time
  - Energy and senses: Low-sensory spaces; Quiet breaks; Fewer back-to-back sessions
- Buttons: "Next" (main) → Screen 3. "Back" → Screen 1. "Skip" → Screen 5.

### Screen 3: Setup 2 of 3, "How should we alert you when plans change?"
- Three large selectable cards, each with a tiny preview:
  - "Vibrate + big text": preview shows a bold banner
  - "Screen reader": preview shows "Read aloud in short sentences"
  - "Calm, one step at a time": preview shows "Step 1 of 3" with a Next button
- Buttons: "Next" (main) → Screen 4. "Back" → Screen 2.

### Screen 4: Setup 3 of 3, "What are you interested in?"
- Tappable topic chips (pick 2-3): Security, Observability, AI, Platform engineering, Networking, Beginner-friendly.
- Optional section, collapsed by default: "How do you like to be approached?" (Green: happy to chat / Yellow: only people I know / Red: please don't approach) and "Pronouns".
- Buttons: "Build my plan" (main) → Screen 5. "Back" → Screen 3.

### Screen 5: Home with bottom tabs
Bottom tab bar on all main screens: Plan · Search · Alerts · Report · Settings (icons + words).

#### 5a. Plan tab (default)
- Top card "Now / Next": next talk, room, "Leave by 1:48 PM", and a "Take me there" button → Screen 7.
- Below: today's plan as cards by time slot. Each card: time, talk title, room, access facts as tags ("Step-free room", "Live captioner", "Quiet room nearby"), one-line "Why: matches Security; step-free room", and a smaller "Backup: Kubernetes RBAC in Plain English".
- A break card where a quiet break is planned: "Quiet break · Quiet room, Floor 2 · 20 min".
- Tapping a talk card → Screen 6.
- A clearly visible secondary button near the top, under the Now / Next card: "My plans changed" → Screen 5f.
- Small link at bottom: "Export plan" (Calendar .ics / Spreadsheet .csv / Text .txt).

#### 5f. My plans changed (opened from the Plan tab)
- Purpose: re-plan when the change comes from the attendee, not the event (slow elevator, needed rest, missed a talk).
- Title: "What happened?" Line under it: "No need to explain. We'll fix your plan."
- Three large choices, each with an icon and one line:
  - "I'm running late": "We'll check if you can still make it."
  - "I missed it": "We'll find a later talk on the same topic."
  - "I need a break now": "We'll add a quiet break and move things back."
- After "I'm running late", ask one question with large buttons: "About how late?" 5 min / 10 min / 15 min+.
- Then show the result using the same three-part layout as Screen 8, in the user's alert style. Examples:
  - Running late: **What changed:** "You'll arrive 10 minutes late to Securing Your Supply Chain." **What stays the same:** "Your 3:00 PM talk is unchanged." **What to do now:** "You can still join. Leave now. 6 minutes, step-free. Or see a later talk on the same topic."
  - Missed it: **What changed:** "You missed Securing Your Supply Chain." **What stays the same:** "The rest of your afternoon is unchanged." **What to do now:** "Go to 'Supply Chain Security Q&A' at 3:30 PM in Room 251. Its transcript is also available."
  - Need a break: **What changed:** "Quiet break added now, Quiet room Floor 2, 20 minutes." **What stays the same:** "You still see Observability for Beginners." **What to do now:** "Head to the quiet room, 2 minutes, step-free. Your next talk moved to 3:30 PM."
- Buttons: "Show new route" (main) → Screen 7. "See other options" → Screen 9. "View transcript of what I missed" (only for "I missed it") → Screen 10. "OK" → Screen 5a with the updated plan.
- The change is added to the Alerts tab history, labelled "Your change".

#### 5b. Search tab
- One large search box: "Ask in your own words, e.g. 'beginner security talk'".
- Note under it: "Results only show talks that fit your needs."
- Results list (same card component as Screen 9): title, time, room, access tags, "Why it fits you".
- Tap a result → Screen 6.

#### 5c. Alerts tab
- List of past changes, newest first. Each row: time, what changed in one line, a small tag "Event change" or "Your change", and "View" → Screen 8 for that alert.
- Empty state: "No changes yet. We'll tell you the moment anything affects your plan."

#### 5d. Report tab → Screen 11.

#### 5e. Settings tab
- Sections: My needs (edit, → Screen 2), Alert style (→ Screen 3), Topics (→ Screen 4).
- Display: text size slider, high contrast toggle, dyslexia-friendly font toggle, reduce motion toggle.
- Privacy: "Your needs are stored only on this phone." Button "Clear all my data".

### Screen 6: Talk details
- Title, speaker, time, room, floor.
- "Why it fits you" (one line).
- Access facts list, each with an icon and words: Step-free entrance; Captions: Live captioner; Slide descriptions: Verified; Front seating available; Quiet room 1 minute away.
- Sensory notes: "Bright stage lights. Usually full. Applause at the end."
- Backup talk card (tap → its own Talk details).
- Buttons: "Take me there" (main) → Screen 7. "Join session" → Screen 10. "Add to calendar".

### Screen 7: Route
- Header: "To Room 355 · 6 minutes · Step-free".
- "Leave by 1:48 PM" in large text.
- Numbered text steps, large:
  1. Exit Room 251 and turn left.
  2. Go past the coffee station to Elevator C.
  3. Take Elevator C to Floor 3.
  4. Turn right. Room 355 is the second door on your left.
- Note if something is avoided: "Avoids Elevator B (not working)."
- Simple floor map below the steps, labelled "Map (optional)".
- Buttons: "I've arrived" (main) → back to Screen 5. "Remind me 5 minutes before I need to leave".

### Screen 8: Change alert (the most important screen)
Opens automatically from anywhere when a change affects the user. Show three versions side by side, one per alert style. All three contain the same three labelled sections:

- **What changed:** "Elevator B is not working."
- **What stays the same:** "Your talk is still at 2:00 PM in Room 355."
- **What to do now:** "Use Elevator C. Leave by 1:48 PM. 6 minutes, step-free."

8a. Vibrate + big text (Priya): full-width amber banner at top with a vibration icon and the words "Plan changed"; the three sections in extra-large text.

8b. Screen reader (Marcus): the same three sections as short sentences, simple layout, with a small note "Read aloud automatically".

8c. Calm, one step at a time (Sam): one section per screen, step counter "1 of 3", soft colours, no amber flash, a "Next" button; final step shows "Show new route".

- Buttons (all versions): "Show new route" (main) → Screen 7 with the new route. "See other options" → Screen 9. "OK".

### Screen 9: Other options
- Title: "Other talks that fit you".
- 2-3 cards (same component as search results): title, time, room, walk time, access tags, one-line "Why".
- Tap → Screen 6, or "Take me there" → Screen 7.

### Screen 10: Session companion
- Header: talk title, room, caption label tag ("Live captioner" / "Auto captions").
- Live transcript in large, high-contrast text that scrolls as new lines arrive; speaker labels; presenter-read questions appear inline as "Question read out: ...".
- Controls: Pause, "Back 30 seconds", "Read aloud new lines" toggle, text size.
- Bottom: "Ask a question in writing" text box with "Send" → confirmation "Sent to the presenter."
- Small button: "Catch me up" (shows a 3-bullet summary of the last minute).

### Screen 11: Report a problem
- Step 1: "What's wrong?" large choices: Elevator not working; Path blocked; Too loud; No captions.
- Step 2: "Where?" pick from a list (Elevator A/B/C, Floor 1-3 paths, rooms). No typing.
- Step 3: confirmation: "Thank you. When someone else confirms it, we'll reroute everyone affected." Note: "We don't send your name or needs."
- Button "Done" → Screen 5.

## ORGANIZER APP (laptop)

### Screen 12: Organizer dashboard
- Header: "Curb Cut · Access team · KubeCon Salt Lake City".
- Left column, "Venue status": by floor, each elevator, ramp and path with status in words + icon ("Elevator B: Not working", "Ramp 2: OK").
- Middle column, "Announce a change": large buttons: Talk moved, Talk delayed, Room full, Elevator down, Path blocked, Mark as fixed. Each opens a small panel to pick the talk/room/elevator and confirm.
- Live result card after a change: "Elevator B down · 12 attendees affected · 12 re-planned in 8 seconds" with a progress bar labelled in words.
- Right column, "Reports from attendees": list of incoming reports with time, type, place and count ("2 reports"), buttons Confirm / Dismiss.
- Bottom panel, "Access gaps": e.g. "4 talks have no captions", "1 interpreter talk is in a room that isn't step-free", each with "View".

### Screen 13: Presenter console
- Large, simple view for the speaker's laptop: talk title, "Written questions" queue (newest last), each with "Mark as read out" which moves it to the transcript.
- Small status line: "Captions: Live captioner · 3 people following on Curb Cut".

## Navigation flows

1. First open: Welcome → What helps you? → How should we alert you? → Topics → Plan.
2. Normal day: Plan → Talk details → Take me there → Route → I've arrived → Plan.
3. In a talk: Talk details → Join session → Session companion (read transcript, ask in writing) → back to Plan.
4. Something changes: organizer taps "Elevator down" on the Dashboard → attendee's Change alert opens (in their alert style) → Show new route → Route; or See other options → Other options → Route.
5. Spotting a problem: Report tab → What's wrong → Where → Thank you → Plan. Two matching reports appear on the organizer Dashboard and can trigger a change.
6. Looking for something: Search tab → results → Talk details → Take me there.
7. Adjusting: Settings tab → edit needs, alert style, topics or display → Plan updates.
8. Presenter: Presenter console → Mark as read out → the question appears in attendees' Session companion transcript.
9. My plans changed: Plan → "My plans changed" → choose Running late / Missed it / Need a break → (how late?) → three-part result → Show new route → Route; or See other options → Other options; or (missed it) View transcript → Session companion. The updated plan shows on the Plan tab.
