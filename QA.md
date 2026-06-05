# Kinly QA Checklist

Run every **P0** item before every deploy. Run **P1** before any major release or when the relevant area changes.

**P0** = must pass before every push  
**P1** = run before releases / when area is touched

---

## P0 — Critical (every deploy)

---

### 1. Build

- [ ] `npm run build` exits 0 — zero TypeScript errors
- [ ] `dist/` contains `index.html` and hashed JS/CSS assets
- [ ] Browser DevTools shows no `console.error` on page load

---

### 2. Auth — demo mode

- [ ] `/welcome` loads without 404 (hard-refresh)
- [ ] "See it with a real family's week" seeds demo data and navigates to `/`
- [ ] Hard-refresh on `/` while in demo stays on home feed (session persists)
- [ ] All 5 nav items render: today · family · calendar · home · inbox
- [ ] Hard-refresh on `/family`, `/calendar`, `/home`, `/inbox` does **not** 404

---

### 3. KinlyBar — visual / layout

- [ ] Dark banner (`#1A1A18`) runs full width on every screen
- [ ] Content inside the bar is capped at **1200px** and centred — matches nav alignment
- [ ] Collapsed state: amber-circle sparkle icon, rotating placeholder text, mic icon
- [ ] Placeholder text fades and cycles every ~2.6 s
- [ ] Clicking anywhere on the collapsed bar opens the expanded chat card
- [ ] Expanded card: white bg, "Kinly · [page label]" header, ✕ close button
- [ ] Clicking ✕ or pressing Escape closes the bar
- [ ] Clicking outside the expanded card closes it
- [ ] ⌘K / Ctrl+K opens the bar from any screen

---

### 4. KinlyBar — CRUD: add event

**Test prompt:** `"Add Lila's soccer game this Saturday at 10am"`

- [ ] Kinly responds with natural-language confirmation
- [ ] A green **✓ "…added to calendar"** action pill appears in the response bubble
- [ ] Navigating to `/calendar` shows the new event on Saturday
- [ ] Event has correct title, date, and time
- [ ] No RLS error in the action pill
- [ ] `onActionExecuted` fires — calendar data reloads automatically (no manual refresh needed)

**Edge cases**
- [ ] "Add team meeting tomorrow at 2pm" — relative date resolves to correct date
- [ ] "Block Thursday afternoon" — creates a calendar block event
- [ ] Sending an ambiguous prompt without enough info — Kinly asks a clarifying question and does **not** emit an `[ACTION:]` tag prematurely

---

### 5. KinlyBar — CRUD: add task

**Test prompt:** `"Remind me to call the school about Lila's form by Friday"`

- [ ] Kinly responds with confirmation text
- [ ] A green **✓ "…added to your tasks"** action pill appears
- [ ] Navigating to `/` shows the new task in the NEEDS YOU or ON THE HORIZON section
- [ ] Task has correct title and due date
- [ ] No RLS error (`new row violates row-level security policy for table "tasks"`)
- [ ] `onActionExecuted` fires — today feed reloads

**Edge cases**
- [ ] `"Add HVAC service appointment"` (no date) — task created with null due_date, appears in ON THE HORIZON
- [ ] `"urgent: pay school fees today"` — `tag: urgent`, due_date = today, appears in NEEDS YOU with amber pill

---

### 6. KinlyBar — CRUD: add member

**Test prompt:** `"Add my mum Linda, she's 62 and helps with school pickup"`

- [ ] Kinly responds with extraction confirmation
- [ ] A green **✓ "Linda added to your family"** action pill appears
- [ ] Navigating to `/family` shows Linda's member card
- [ ] Card shows her name and correct role
- [ ] No RLS error (`new row violates row-level security policy for table "members"`)
- [ ] `onActionExecuted` fires — family data reloads

**Edge cases**
- [ ] Child: `"My son Noah is 6, goes to Cedar Crest"` — role `child`, school populated, blue avatar colour
- [ ] Caregiver: `"Add Jess, she babysits on weekends"` — role `caregiver`

---

### 7. KinlyBar — action pill error states

- [ ] If Groq is unavailable: input shows `"Kinly is thinking…"` placeholder; error is surfaced gracefully (no silent fail)
- [ ] If a Supabase write fails: action pill shows **× [error message]** in salmon/red, not a JS throw
- [ ] If `VITE_GROQ_API_KEY` is missing: bar still opens; response shows a readable error, not a blank bubble

---

### 8. KinlyBar — pill prefill (today screen)

- [ ] In demo mode, action cards show agent lines (e.g. "Kinly can reschedule Maria")
- [ ] Clicking an agent line pill **opens KinlyBar** and **prefills** the relevant query
- [ ] No KinlyPanel overlay appears (that component is removed)
- [ ] The prefilled query is editable before sending

---

### 9. Today screen — layout

- [ ] Page background is `#ffffff`
- [ ] Greeting: "Good morning/afternoon/evening." — correct time of day
- [ ] Headline italic: "N things need you." / "one thing needs you." / "you're all caught up."
- [ ] Event chip strip visible when today has events; each chip shows icon + label + time
- [ ] **NEEDS YOU** section label visible (9px uppercase)
- [ ] Overdue tasks show coral `Overdue` pill; today tasks show amber `Today`; future tasks show date
- [ ] Agent line buttons (amber `#faecd0`) appear on demo tasks
- [ ] **ON THE HORIZON** divider with trailing line visible when future tasks exist
- [ ] Desktop (≥ lg): two-column layout — tasks left, schedule right
- [ ] Tablet/mobile: schedule strip appears below tasks, not in a right column
- [ ] **YOUR [day name]** section on right column (desktop) or below tasks (tablet)
- [ ] Schedule strip shows events as horizontal cards with time and title
- [ ] **COMING UP** occasions section visible on right column when data exists
- [ ] Skeleton cards shown while loading (3 grey bars)

---

### 10. Today screen — CRUD via page

- [ ] Agent line pill click → KinlyBar opens prefilled → submitting creates the expected record (see §4–6)
- [ ] After Kinly action, tasks/events reload without full page refresh

---

### 11. Calendar screen — layout

- [ ] Page renders at `/calendar` without 404
- [ ] Dark header: "May 2026" (or current month), ← → week nav, "today" pill button
- [ ] 7-day strip shows MON–SUN with event-category dots
- [ ] Selected day: dark `#2C2C2A` pill, white text
- [ ] Today (unselected): cream `#F7F4EF` pill
- [ ] Past days: muted text
- [ ] Clicking a day updates the event list below
- [ ] Member filter chips visible: Lila · Noah · Family · Sarah · James + "+ add event"
- [ ] Events grouped by date with date header (e.g. "FRIDAY, MAY 29 · TODAY")
- [ ] Each event row: time | coloured left bar | title | member tag
- [ ] Past events (~90 min ago) are 35% opacity
- [ ] Active/next event: time displayed in amber
- [ ] Scroll syncs selected day in the week strip

---

### 12. Calendar screen — CRUD

- [ ] "+ add event" button prefills KinlyBar with calendar context
- [ ] KinlyBar `add_event` action creates event (see §4); calendar reloads showing new row
- [ ] "Kinly can draft questions to ask" / "Kinly can text Jess" agent buttons in demo are visible
- [ ] Clicking agent button prefills KinlyBar

---

### 13. Family screen — layout

- [ ] Page renders at `/family` without 404
- [ ] Page background `#ffffff`; Lora serif heading "Your family."
- [ ] Content capped at 760px centred
- [ ] Member cards render in a `repeat(auto-fill, minmax(220px, 1fr))` grid
- [ ] Each card: coloured top accent bar, avatar square, name, role label
- [ ] Cards with school/DOB show icon + text in fields section
- [ ] "Just added" cards pulse with coloured border for 4 s then settle
- [ ] "Tell Kinly about someone new" add card visible as last item
- [ ] Clicking add card opens and focuses KinlyBar
- [ ] ⋯ dots menu: "Edit [name]" and "Remove [name]" options
- [ ] Clicking "Edit" prefills KinlyBar input
- [ ] Empty state (no members): prompt card with 3 example chips

---

### 14. Family screen — CRUD

**Add member via KinlyBar `add_member` action**
- [ ] Test: `"My daughter Lila is 8, Cedar Crest school"` → card appears, no RLS error (see §6)

**Add member via parseMember (direct extraction)**
- [ ] Typing `"Lila, 8, Cedar Crest"` in KinlyBar on family page → extraction panel shows in bubble
- [ ] Member card animates in with coloured border
- [ ] Hard-refresh — new member persists (stored in Supabase)

---

### 15. Home screen (`/home`) — layout

- [ ] Page renders at `/home` without 404
- [ ] KinlyBar visible with `home` page placeholders
- [ ] Page content loads without JS errors

---

### 16. Navigation

- [ ] TopNav: logo links to `/`; all 5 tabs navigate correctly
- [ ] Active tab has `bg-white/10 text-white` pill
- [ ] Mobile (`< sm`): bottom nav shows icons + labels; top nav tabs are hidden
- [ ] Bell icon visible in top-right; avatar initials render from name/email

---

### 17. Session persistence

- [ ] Demo: hard-refresh keeps session (localStorage `kinly-family-id` present)
- [ ] Auth gate: if no session, redirect to `/welcome`; if session, skip welcome
- [ ] Auth resolves within 5 s (failsafe timeout) — app never hangs on spinner

---

## P1 — Extended (before releases)

---

### 18. KinlyBar — voice input

- [ ] Mic icon in collapsed bar and in expanded input row
- [ ] Clicking mic requests microphone permission (browser prompt)
- [ ] After granting: amber pulsing dot + "Listening — speak now" indicator appears
- [ ] Speaking fills the input; clicking mic again stops listening
- [ ] Transcript text is editable before sending

---

### 19. RLS regression checklist (run after any Supabase schema change)

For each of the three action types, confirm **zero** RLS errors:

| Action | Table | Required fields in insert | Expected result |
|--------|-------|--------------------------|-----------------|
| add_event | `events` | `family_id`, `title`, `date` | ✓ pill, event appears on calendar |
| add_task  | `tasks`  | `family_id`, `user_id`, `title` | ✓ pill, task appears on today |
| add_member | `members` | `family_id`, `user_id`, `name`, `role` | ✓ pill, card appears on family |

- [ ] `add_event` — no RLS error
- [ ] `add_task` — no RLS error (was broken: missing `user_id`)
- [ ] `add_member` — no RLS error (was broken: missing `user_id`)
- [ ] `parseMember` direct path in Family.tsx — no RLS error

---

### 20. Responsive layout

- [ ] At 375px (iPhone SE): no horizontal overflow on any screen; bottom nav visible
- [ ] At 768px (tablet): schedule strip shows below tasks (not sidebar); top nav tabs visible
- [ ] At 1280px: content centred, KinlyBar and nav cap at 1200px; today screen at 1200px

---

### 21. Google OAuth (requires credentials)

- [ ] "Continue with Google" initiates OAuth redirect
- [ ] After auth, redirects to `/` or `/onboarding`
- [ ] Google Calendar events sync to calendar screen

---

### 22. Vercel production

- [ ] `https://kinly-six.vercel.app/welcome` loads (not 404)
- [ ] `https://kinly-six.vercel.app/` redirects to `/welcome` with no session
- [ ] All JS/CSS assets return HTTP 200
- [ ] No `Missing Supabase env vars` warning in browser console
- [ ] `VITE_GROQ_API_KEY` present → Kinly responses stream correctly in production

---

## Known regressions to re-test after every change to KinlyBar or kinlyActions.ts

1. **RLS on tasks** — insert must include `user_id`
2. **RLS on members** — insert must include `user_id` (both `kinlyActions.ts` and `Family.tsx` direct path)
3. **Pill prefill** — clicking agent lines opens KinlyBar, not KinlyPanel (KinlyPanel is removed)
4. **Max-width** — KinlyBar content stays at 1200px, never stretches on wide viewports
5. **Action parsing** — `[ACTION:{...}]` tag stripped from displayed text; only clean text shown in bubble
