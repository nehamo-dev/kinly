# Kinly QA Checklist

Run every item before pushing. Add new cases whenever a bug is reported or a feature ships.

**P0** = must pass before every deploy — core flows and security  
**P1** = run before major releases or when the relevant area changes

---

## P0 — Critical (run before every deploy)

---

### 1. Build

- [ ] `npm run build` exits 0 with zero TypeScript errors
- [ ] `dist/` contains `index.html` and hashed JS/CSS assets
- [ ] No `console.error` warnings in the browser on load (open DevTools before loading)

---

### 2. Welcome screen

**Layout — two-column split (≥768px)**
- [ ] Left panel: dark background (#1A1A18), "kinly" wordmark + amber inline dot
- [ ] Left panel: tagline "For families who have **a lot** going on." (amber "a lot"), sub-copy visible
- [ ] Left panel: "Trusted by 10,000+ families" trust badge at bottom
- [ ] Right panel: warm parchment background (#F7F4EF), max-width 340px form area
- [ ] Vertical divider between panels; no card border or drop shadow on the form

**Layout — mobile (<768px)**
- [ ] Left panel collapses to slim bar at top (logo only, tagline + badge hidden)
- [ ] Form fills remaining viewport height; no horizontal overflow

**Form elements**
- [ ] "Continue with Google" button visible (white, bordered, Google SVG icon)
- [ ] "or use email" divider visible between Google button and email field
- [ ] Email label "EMAIL" in small-caps 11px above input
- [ ] Email input focus ring turns purple (#AFA9EC)
- [ ] "Send magic link" button: dark (#1A1A18) background, IconSend icon
- [ ] Clicking "Send magic link" with a valid email replaces the button with "Check your inbox — link sent ✓" (no separate confirmation screen)
- [ ] Demo button: purple-tint background (#EEEDFE), label "See it with a real family's week", IconSparkles icon
- [ ] Demo button caption: "No account needed · resets after 24 hours"
- [ ] Terms line at bottom: "By continuing you agree to our Terms and Privacy Policy. We never sell your data. Ever."
- [ ] Hard-refresh on `/welcome` does NOT 404 (SPA rewrite in vercel.json)

**Loading states**
- [ ] Clicking "Send magic link" shows a spinning indicator inside the button while request is in flight
- [ ] Clicking "See it with a real family's week" shows a spinning indicator inside the button while seeding

---

### 3. Demo mode — seed flow

- [ ] Clicking "✦ Try with demo data" creates an anonymous Supabase session, seeds demo data, and navigates to home feed
- [ ] Home feed renders with all demo data: 5 tasks, 3 events today, occasions, members
- [ ] Demo banner appears at the top: "Demo mode. Data resets after 24 hours."
- [ ] Hard-refresh (⌘R) stays on home feed — anonymous session + family ID persist in localStorage ('kinly-family-id' key)
- [ ] Clicking "Sign up to save your data →" in the demo banner clears localStorage and goes to /welcome
- [ ] TopNav shows the smiley logo + "Kinly" wordmark in tomato red
- [ ] "Today" nav item shows active pill state (bg-slate-100)
- [ ] User avatar visible in top-right corner
- [ ] Checking off a task toggles it in Supabase and refreshes the feed

---

### 4. Home — redesigned layout (HeroHeader + two columns)

- [ ] No PageWrapper/white card — body background is warm parchment #F7F4EF
- [ ] **HeroHeader** spans full width, dark background #1A1A18, sits directly below TopNav
- [ ] Greeting text: "Good morning/afternoon/evening. [Headline]." — correct time-of-day variant
- [ ] Headline updates with task count: "Nothing urgent today." / "One thing for you." / "Two things need you." etc.
- [ ] Event chip strip appears when today has events; chips show time + icon (car, music, calendar)
- [ ] Input bar: `#2C2C2A` bg, sparkle icon left, rotating placeholder text cycles every ~2.6s with fade
- [ ] Typing in the input bar and pressing Enter fires a query (no error in demo without GROQ key — shows "Add VITE_GROQ_API_KEY" message)
- [ ] With `VITE_GROQ_API_KEY` set: submitting a query shows `KinlyPanel` below the hero with an AI response
- [ ] KinlyPanel shows the original query in italics, a sparkle icon, and the response text
- [ ] Dismissing KinlyPanel (✕ button) hides it and clears the query
- [ ] **Left column** (55%) has background #F7F4EF, right column (45%) has #FDFCF9
- [ ] Thin 0.5px vertical divider between the two columns
- [ ] Section headers are small caps (11px uppercase tracking-widest muted): "ALL CAUGHT UP", "YOUR WEDNESDAY", etc.
- [ ] Left col — section headline reflects task count: "a couple things for you" for 2 tasks
- [ ] Right col — section headline: "YOUR [day name]" (e.g. "YOUR WEDNESDAY")
- [ ] **ActionCard** (per task): white card, 3px left border coloured by tag, title (13px) + time pill, subtitle muted text
- [ ] ActionCard time pill: "overdue" (coral), "today" (amber), future date (muted)
- [ ] Agent line shows purple (#EEEDFE/#3C3489) sparkle pill below subtitle when present (demo mode)
- [ ] Clicking an ActionCard expands it; shows "Let Kinly handle it" dark button
- [ ] **ScheduleCard** shows today's events as timeline rows; time is muted unless active event (amber)
- [ ] Active/current event has 2px amber left border; past events (>90 min ago) are 35% opacity
- [ ] Member chips on ScheduleCard: Lila → purple (#EEEDFE/#534AB7), Family sync → muted, Us/anniversary → pink
- [ ] **ComingUpCard** shows upcoming occasions (label + date label); no left border; white card
- [ ] "Coming up" section only visible when occasions exist

---

### 4b. Home feed — (legacy sections still present)

- [ ] Section header shows "NEEDS ATTENTION 5" with a red dot (no "Snooze all" action)
- [ ] "House cleaning overdue by 3 days" — `home` badge — urgency "Overdue" in red
- [ ] Subline: "Bi-weekly cycle · last visit May 10 · Maria's Cleaning Co."
- [ ] "Confirm Saturday babysitter" — `occasion` badge — urgency "Today" in green
- [ ] Subline: "Jess Nguyen for anniversary dinner · text to confirm"
- [ ] "Complete soccer registration" — `Lila` member badge + `urgent` badge — urgency "This week" in slate
- [ ] Subline: "From seahawkssoccer.org · payment + medical form · closes Fri"
- [ ] "Show 2 more ↓" link visible (Plan Noah's birthday + HVAC not shown initially)
- [ ] Clicking "Show 2 more" reveals the remaining 2 tasks
- [ ] Each task row shows a clock (snooze) icon to the right of the urgency label
- [ ] Clicking the clock shows a popover: "→ Tomorrow" and "→ Next week"
- [ ] Selecting "Tomorrow" updates due_date to tomorrow; task re-sorts/refreshes
- [ ] Selecting "Next week" updates due_date to +7 days; task re-sorts/refreshes
- [ ] Clicking a task's title/content area opens the Edit Task modal
- [ ] Edit Task modal is pre-filled with current title, due date, and tag
- [ ] Saving edits updates the task in Supabase and refreshes the feed
- [ ] Delete button in Edit Task modal removes the task from Supabase

---

### 5. Home feed — Today's Schedule section

- [ ] Section header shows "TODAY'S SCHEDULE 3" with a red dot
- [ ] "Family morning sync" — `daily` badge — subline "15 min · review the day's plan over coffee"
- [ ] "School pickup — Lila" — `Lila` member badge — subline "Cedar Crest north gate · 1.2 mi"
- [ ] "Piano lesson" — `Lila` member badge — subline "Ms. Chen · Studio B · recurring weekly"
- [ ] Time column shows correct format: "9:00 am", "3:15 pm", "4:00 pm"
- [ ] Tapping any event row opens the Event Detail modal
- [ ] Event Detail modal shows: formatted time, title, badges, subline, date, source label
- [ ] Closing the modal (× or backdrop click) returns to feed

---

### 6. Home feed — Flagged Emails section

- [ ] Section header shows "FLAGGED EMAILS 4"
- [ ] "Parent info night — please RSVP" — `Lila` member badge — timestamp "9:14am"
- [ ] Domain/preview format: "cedarcrestacademy.org — Tonight at 6:30 in the auditorium…"
- [ ] "Spring registration closes Friday" — `urgent` badge — timestamp "7:02am"
- [ ] "HVAC seasonal service reminder" — `home` badge — timestamp "Mon"
- [ ] "Show 1 more ↓" link visible (weekly grocery delivery hidden initially)
- [ ] Each email shows a "+ Add as task" button below the preview line
- [ ] Clicking "+ Add as task" opens a modal pre-filled with the email subject
- [ ] Saving creates a task with `tag: 'gmail'` and the chosen due date; feed refreshes

---

### 7. Command bar — natural language input

- [ ] Input field is editable (no longer readOnly); placeholder text visible
- [ ] Voice icon and send arrow button (dark rounded square) visible
- [ ] "✦ Plan my week", "📅 Add event", "✓ Add task" chips visible
- [ ] "Add event" chip opens AddEventModal (empty)
- [ ] "Add task" chip opens AddTaskModal (empty)
- [ ] "Plan my week" chip seeds the input field with "Plan my week" and focuses it
- [ ] **Natural language — event:** type "Piano lesson on Friday at 4pm" + Enter → AddEventModal opens with title "Piano lesson", correct Friday date, time "04:00 PM" pre-filled
- [ ] **Natural language — task:** type "Buy birthday cake tomorrow" + Enter → AddTaskModal opens with title "Buy birthday cake", tomorrow's date, tag "occasion" pre-filled
- [ ] **Natural language — date only:** type "Call the plumber next Monday" + Enter → AddTaskModal opens with title "Call the plumber", next Monday's date
- [ ] **Natural language — time triggers event:** any phrase with "at [time]" opens AddEventModal (not AddTaskModal)
- [ ] Sending with empty input does nothing (no modal opens)
- [ ] After saving from command bar, the feed refreshes automatically
- [ ] AddEventModal: title + date + time fields + Save button saves to Supabase; event appears in Today's Schedule if date is today
- [ ] AddTaskModal: title + due date + tag fields + Save button saves to Supabase; task appears in Needs Attention

---

### 8. Navigation

- [ ] All 5 nav items visible: Today, Family, Calendar, Home, Inbox
- [ ] Clicking "Family" navigates to /family (full screen, not stub)
- [ ] Clicking "Calendar" navigates to /calendar (full week view, not stub)
- [ ] Clicking "Home" navigates to /home
- [ ] Clicking "Inbox" navigates to /inbox
- [ ] Hard-refresh on any of the above routes does NOT 404 on Vercel
- [ ] Clicking "Today" (or logo) returns to home feed
- [ ] Active nav item has pill highlight

---

### 9. Auth — session persistence

- [ ] After demo login, hard-refresh (⌘R) returns to home feed (not Welcome)
- [ ] Auth loading spinner (small red spinner) appears briefly on refresh, then resolves within 5 seconds
- [ ] After 5 seconds maximum, the app always unblocks (failsafe timeout)

---

### 10. Vercel production checks

- [ ] `https://kinly-six.vercel.app/welcome` loads (not 404)
- [ ] `https://kinly-six.vercel.app/` redirects to `/welcome` if no session
- [ ] All assets (JS bundle, CSS) return HTTP 200
- [ ] No environment variable warnings in browser console (`[Kinly] Missing Supabase env vars`)

---

### 10b. Family screen — Kinly add-member input

- [ ] Dark Kinly input bar at top of Family screen: "Tell Kinly about a family member..."
- [ ] Typing text and pressing Enter (or →) shows a purple confirmation card below the input
- [ ] Confirmation card shows parsed fields: "Lila · child · age 8 · Cedar Crest Academy"
- [ ] "edit" button re-focuses the input with original text; confirmation card disappears
- [ ] "add" button inserts a new member to Supabase and refreshes the Members section
- [ ] "Member added." green success flash visible for ~2 seconds after confirm
- [ ] Input accepts formats: "Lila, age 8" / "James, parent" / "Jess Nguyen, babysitter age 30"
- [ ] Input clears after successful add
- [ ] Hint text below bar: "Try: 'Lila, age 8, Cedar Crest Academy' or 'James, parent'"
- [ ] Navigating to `/family` shows the Family screen (not a stub)
- [ ] **Members** — section shows count; avatar + first name + role/grade/school for each member
- [ ] Children (Lila, Noah) appear before parents (Sarah, James)
- [ ] **Activities** — 3 activities: Piano lesson (Mon, Wed), Soccer practice (Tue, Thu), Swimming (Sat); each shows time range + location + member badge
- [ ] **Upcoming Occasions** — 3 occasions sorted by date: Lila's birthday (in 21d, amber), Sarah & James Anniversary (in 42d, slate), Noah's birthday (in 70d, slate)
- [ ] Occasions within 7 days show countdown in tomato red; 8–30 days amber; 30+ days slate
- [ ] **Providers** — 3 providers: Maria's Cleaning Co. (5★), Jess Nguyen (5★), Ms. Chen (4★)
- [ ] Provider type label shows ("Cleaner", "Babysitter", "Tutor")
- [ ] Skeleton placeholders shown during initial load
- [ ] Hard-refresh on `/family` does not 404

---

### 10c. Calendar screen — horizontal strip redesign

- [ ] Navigating to `/calendar` shows the Calendar screen (not a stub)
- [ ] **Week navigation** — "← [range] →" header; `May 26–Jun 1` format; prev/next chevrons styled as muted rounded buttons
- [ ] "+ Add event" button (top right) — dark rounded button; opens AddEventModal with today's date
- [ ] **Member filter chips** — "All" + one chip per family member, each with a colored dot; only shown when members are loaded
- [ ] Clicking a member chip filters the selected day's event list; clicking again deselects (back to "All")
- [ ] **7-day strip** — rendered inside a `#F3F0EA` rounded container
- [ ] Each day: 3-letter day name (muted small caps), day number, up to 3 color-coded event dots
- [ ] Today's date: highlighted with a subtle `#E8E4DC` background when not selected
- [ ] **Selected day**: dark `#1A1A18` background, light text, dots turn white/translucent
- [ ] Clicking a different day in the strip updates the event list below
- [ ] When week changes and selected date is outside new week, snaps to Monday of new week
- [ ] **Selected day header**: "Wednesday, May 28" with "today" in muted text when applicable; small "+ add" button right
- [ ] **Event cards** for selected day: white card, 3px left border coloured by member avatar_color (teal fallback for no member), time + title + member chip
- [ ] Tapping an event card opens `EventDetailModal`
- [ ] "Nothing scheduled." shown when selected day has no events
- [ ] With member filter active + no matching events: "No events for this person today."
- [ ] Skeleton (3 grey bars) shown while loading
- [ ] Hard-refresh on `/calendar` does not 404

---

## P1 — Extended (run before major releases)

---

### 11. Onboarding flow (new real account)

- [ ] After magic link click, `/auth/callback` redirects to `/onboarding`
- [ ] Onboarding wizard: step 1 (family name) → step 2 (add members) → step 3 (features) completes
- [ ] After onboarding, redirects to `/` home feed
- [ ] No demo data shown for real accounts

---

### 12. Brand / design

- [ ] All accent colours are tomato red #E8392A — no leftover green (#1D9E75)
- [ ] No Tailwind `emerald-*` classes on visible elements
- [ ] Badge colours: kid=sky, home=amber, occasion=purple, urgent=red, gmail=orange, daily=slate
- [ ] Task ring circles: correct colour per tag (amber for home/urgent, purple for occasion, sky for kid)
- [ ] Member badges render correctly inline next to task/event titles
- [ ] Urgency labels: "Overdue" red, "Today" green, "This week" slate

---

### 13. Responsive layout

- [ ] Home feed readable at 375px (iPhone SE width) — no horizontal overflow
- [ ] TopNav items don't overflow at 375px
- [ ] Home feed readable at 1280px — content stays centred in max-w-[860px] column
- [ ] Command bar wraps gracefully at narrow widths

---

### 14. Google OAuth (requires Google credentials set)

- [ ] "Continue with Google" initiates OAuth flow and redirects to Google
- [ ] After Google auth, redirects back to `/` or `/onboarding`
- [ ] Google Calendar settings page accessible at `/settings/calendar`

---

### 15. Error states

- [ ] Entering invalid email in magic link form shows a Supabase error message
- [ ] If Supabase is unreachable, app unblocks within 5 seconds (failsafe)
- [ ] Demo seed failure shows a readable error message (not "[object Object]")
