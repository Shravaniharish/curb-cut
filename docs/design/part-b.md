# Curb Cut, Part B of 3: Changes, Alerts, Other options, Report

Person B designs these screens. Copy everything below the line into Claude Design.

---

Design Part B of "Curb Cut": everything that happens when plans change, plus reporting a problem. This is the heart of the app. Phone layout, 390px wide. Make it a clickable prototype.

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

## Screens in Part B

### Screen 8: Change alert (the most important screen)
Opens automatically from any screen when an event change affects the user (example: Elevator B breaks). Design THREE versions side by side, one per alert style. All contain the Three-part change block:

- **What changed:** "Elevator B is not working."
- **What stays the same:** "Your talk is still at 2:00 PM in Room 355."
- **What to do now:** "Use Elevator C. Leave by 1:48 PM. 6 minutes, step-free."

8a. Vibrate + big text (Priya): full-width amber banner at the top with a vibration icon and "Plan changed"; the three sections in extra-large text.

8b. Screen reader (Marcus): the same three sections as short sentences, very simple layout, small note "Read aloud automatically".

8c. Calm, one step at a time (Sam): one section per screen, counter "1 of 3", soft colours, no amber banner, a "Next" button; the last step shows "Show new route". Design all three of Sam's steps.

- Buttons (all versions): "Show new route" (main) → (Part A, Screen 7). "See other options" → Screen 9. "OK".

### Screen 5f: My plans changed (opened from a button on the Plan tab)
- For changes caused by the attendee, not the event.
- Title "What happened?" Line: "No need to explain. We'll fix your plan."
- Three large choices with icon and one line:
  - "I'm running late": "We'll check if you can still make it."
  - "I missed it": "We'll find a later talk on the same topic."
  - "I need a break now": "We'll add a quiet break and move things back."
- After "I'm running late": a follow-up "About how late?" with large buttons 5 min / 10 min / 15 min+.
- Then a result screen using the Three-part change block. Design all three results:
  - Running late: What changed: "You'll arrive 10 minutes late to Securing Your Supply Chain." What stays the same: "Your 3:00 PM talk is unchanged." What to do now: "You can still join. Leave now. 6 minutes, step-free. Or see a later talk on the same topic."
  - Missed it: What changed: "You missed Securing Your Supply Chain." What stays the same: "The rest of your afternoon is unchanged." What to do now: "Go to 'Supply Chain Security Q&A' at 3:30 PM in Room 251. Its transcript is also available."
  - Need a break: What changed: "Quiet break added now, Quiet room Floor 2, 20 minutes." What stays the same: "You still see Observability for Beginners." What to do now: "Head to the quiet room, 2 minutes, step-free. Your next talk moved to 3:30 PM."
- Buttons: "Show new route" (main) → (Part A, Screen 7). "See other options" → Screen 9. "View transcript of what I missed" (missed it only) → (Part C, Screen 10). "OK" → (Part A, Plan tab).

### Screen 9: Other options
- Title "Other talks that fit you". 2-3 Talk cards each with walk time and one-line "Why".
- Each card: tap → (Part A, Screen 6); button "Take me there" → (Part A, Screen 7).

### Screen 5c: Alerts tab
- Bottom tab bar, Alerts active.
- List of past changes, newest first. Each row: time, what changed in one line, a small tag "Event change" or "Your change", and "View" → Screen 8 for that alert.
- Empty state: "No changes yet. We'll tell you the moment anything affects your plan."

### Screen 11: Report a problem (Report tab)
- Bottom tab bar, Report active.
- Step 1 "What's wrong?": large choices: Elevator not working; Path blocked; Too loud; No captions.
- Step 2 "Where?": pick from a list (Elevator A/B/C, Floor 1-3 paths, rooms). No typing.
- Step 3 confirmation: "Thank you. When someone else confirms it, we'll reroute everyone affected." Note: "We don't send your name or needs."
- Button "Done" → (Part A, Plan tab).

## Flows in Part B
1. Event change: Change alert (in the user's style) → Show new route → Route; or See other options → Other options → Route.
2. My plans changed: choose Running late / Missed it / Need a break → (how late?) → result → Show new route / Other options / View transcript / OK.
3. Alerts tab → View → Change alert.
4. Report tab → What's wrong → Where → Thank you → Plan.
