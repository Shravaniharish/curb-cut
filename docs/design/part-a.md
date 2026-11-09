# Curb Cut, Part A of 3: Setup, Plan, Search, Talk details, Route, Settings

Person A designs these screens. Copy everything below the line into Claude Design.

---

Design Part A of "Curb Cut": the first-time setup and the everyday screens. Phone layout, 390px wide. Make it a clickable prototype.

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

## Screens in Part A

### Screen 1: Welcome
- App name "Curb Cut"; one line: "Find the right talk, get there, and know what to do when plans change."
- Privacy note with a lock icon: "Your needs stay on this phone. We never store them."
- Buttons: "Get started" (main) → Screen 2. Text link "Skip setup" → Screen 5a.

### Screen 2: Setup 1 of 3, "What helps you?"
- Progress "Step 1 of 3". Line: "Choose anything that helps. You never need to tell us why."
- Grouped large checkboxes:
  - Getting around: Step-free routes; Extra travel time
  - Hearing and seeing: Captions required; Interpreter preferred; Front seat; I use a screen reader; Slides ahead of time
  - Energy and senses: Low-sensory spaces; Quiet breaks; Fewer back-to-back sessions
- Buttons: "Next" (main) → Screen 3. "Back". "Skip" → Screen 5a.

### Screen 3: Setup 2 of 3, "How should we alert you when plans change?"
- Three large selectable cards with a tiny preview each: "Vibrate + big text" (bold banner preview); "Screen reader" ("Read aloud in short sentences"); "Calm, one step at a time" ("Step 1 of 3" with a Next button).
- Buttons: "Next" (main) → Screen 4. "Back".

### Screen 4: Setup 3 of 3, "What are you interested in?"
- Topic chips (pick 2-3): Security, Observability, AI, Platform engineering, Networking, Beginner-friendly.
- Optional, collapsed by default: "How do you like to be approached?" (Green: happy to chat / Yellow: only people I know / Red: please don't approach) and "Pronouns".
- Buttons: "Build my plan" (main) → Screen 5a. "Back".

### Screen 5a: Plan tab (home)
- Bottom tab bar, Plan active.
- Top card "Now / Next" for Marcus: next talk, room, Leave-by line, "Take me there" (main) → Screen 7.
- Under it, secondary button "My plans changed" → (Part B, Screen 5f).
- Today's plan as Talk cards by time slot, each with a smaller "Backup: Kubernetes RBAC in Plain English".
- A break card: "Quiet break · Quiet room, Floor 2 · 20 min".
- Tap a talk card → Screen 6.
- Small link at bottom: "Export plan" (Calendar .ics / Spreadsheet .csv / Text .txt).

### Screen 5b: Search tab
- Large search box: "Ask in your own words, e.g. 'beginner security talk'". Note: "Results only show talks that fit your needs."
- Results as Talk cards with "Why it fits you". Tap → Screen 6.
- Also show the empty state and a "no results" state ("No talks match all your needs. Try fewer words.").

### Screen 5e: Settings tab
- Sections: My needs (→ Screen 2), Alert style (→ Screen 3), Topics (→ Screen 4).
- Display: text size slider (show a live preview line), high contrast toggle, dyslexia-friendly font toggle, reduce motion toggle.
- Privacy: "Your needs are stored only on this phone." Button "Clear all my data" with a confirmation dialog.

### Screen 6: Talk details
- Title, speaker, time, room, floor. "Why it fits you" line.
- Access facts list with icon + words: Step-free entrance; Captions: Live captioner; Slide descriptions: Verified; Front seating available; Quiet room 1 minute away.
- Sensory notes: "Bright stage lights. Usually full. Applause at the end."
- Backup talk card.
- Buttons: "Take me there" (main) → Screen 7. "Join session" → (Part C, Screen 10). "Add to calendar".

### Screen 7: Route
- Header: "To Room 355 · 6 minutes · Step-free". Leave-by line large.
- Numbered text steps, large:
  1. Exit Room 251 and turn left.
  2. Go past the coffee station to Elevator C.
  3. Take Elevator C to Floor 3.
  4. Turn right. Room 355 is the second door on your left.
- Note: "Avoids Elevator B (not working)."
- Simple floor map below, labelled "Map (optional)".
- Buttons: "I've arrived" (main) → Screen 5a. "Remind me 5 minutes before I need to leave".

## Flows in Part A
1. Welcome → Setup 1 → Setup 2 → Setup 3 → Plan.
2. Plan → Talk details → Take me there → Route → I've arrived → Plan.
3. Search → results → Talk details → Route.
4. Settings → edit needs / alert style / topics / display → Plan.
