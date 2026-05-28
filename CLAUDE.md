# Kinly — Claude Project Guide

Family logistics web app. Families track tasks, calendar events, home services, kids' activities, and flagged emails in one place.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| State | Zustand (`authStore`) |
| Backend | Supabase (Postgres + Auth) |
| Build | Vite with manual chunk splitting |
| Deploy | Vercel (`kinly-six.vercel.app`) |

---

## Commands

```bash
npm run dev      # dev server → localhost:5173
npm run build    # tsc -b && vite build (zero errors required)
```

Always run `npm run build` before committing. Zero TypeScript errors is the bar.

---

## Project layout

```
src/
  app/
    App.tsx              # BrowserRouter + AuthProvider + ProtectedRoute + AppLayout
  features/
    onboarding/
      Welcome.tsx        # Magic link + Google OAuth + demo sign-in
      Onboarding.tsx     # 5-step wizard (family name, you, kids, Google calendar, home service)
    family/
      Family.tsx         # Members cards · Activities · Upcoming Occasions · Providers
    home/
      Home.tsx           # Today feed — loads tasks + events + members from Supabase
      NeedsAttention.tsx # Task list with mark-done, snooze, and edit
      TodaySchedule.tsx  # Today's events with tap-to-detail
      FlaggedEmails.tsx  # Flagged email list with email→task creation
      CommandBar.tsx     # Prompt bar + chip shortcuts
      AddTaskModal.tsx   # Add new task
      AddEventModal.tsx  # Add new event
      EditTaskModal.tsx  # Edit/delete existing task (pre-filled from TaskRow tap)
      EventDetailModal.tsx # Read-only event detail (opened by tapping EventRow)
      ShellScreen.tsx    # Stub screen ("coming soon") used by Family/Calendar/Home/Inbox
    calendar/
      CalendarSettings.tsx  # Google Calendar connect/disconnect
      AuthCallback.tsx      # OAuth callback handler
  components/
    layout/
      TopNav.tsx         # App nav (Today/Family/Calendar/Home/Inbox + avatar)
      DemoBanner.tsx     # Demo mode banner with sign-up CTA
      PageWrapper.tsx    # Max-width centred content wrapper
    ui/
      TaskRow.tsx        # Task row: ring (done) · content (edit tap) · snooze clock
      EventRow.tsx       # Event row — full row tappable for detail modal
      EmailRow.tsx       # Email row with "+ Add as task" button
      SectionHeader.tsx  # Red dot + label + count + optional action link
      Badge.tsx          # Coloured chips (kid/home/occasion/urgent/gmail/daily/default)
      Card.tsx           # White rounded card
      Modal.tsx          # Centred modal with backdrop, Escape-to-close
      Button.tsx         # Primary/secondary/ghost variants with loading state
      Input.tsx          # Labelled text input
      Avatar.tsx         # User avatar circle
      EmptyState.tsx     # Empty/coming-soon placeholder
  lib/
    supabase.ts          # Supabase client + module-level warm-up fetch
    demo.ts              # DEMO_TASKS, DEMO_EVENTS, DEMO_EMAILS constants + seedDemoFamily()
    demoLocal.ts         # Legacy: clearDemoState() only (cleans up old localStorage keys)
    google.ts            # Google Calendar OAuth + syncCalendarEvents()
  store/
    authStore.ts         # Zustand: session, user, familyId, isDemo
  types/
    index.ts             # All domain types
```

---

## Auth flow

Three paths in `AuthProvider` (`App.tsx`):

1. **Cached familyId** — `localStorage['kinly-family-id']` present → call `markReady()` instantly, validate in background
2. **Anonymous session** (demo) — `getSession()` returns `session.user.is_anonymous = true` → `setIsDemo(true)`, `loadFamilyId()` finds seeded family
3. **Real session** — normal `loadFamilyId()` from `user_families` table

Demo mode is a **Supabase anonymous session** with a real seeded family (not localStorage). `signInAnonymously()` + `seedDemoFamily()` runs on "Try with demo data" click (~1s with warm connection).

**Hard refresh**: Supabase JWT persists in its own localStorage key; `kinly-family-id` cache makes `familyId` available instantly.

**Sign-out from demo**: `DemoBanner` calls `supabase.auth.signOut()` + clears `kinly-family-id`.

---

## Performance optimisations

- `<link rel="preconnect">` to Supabase in `index.html` — starts TCP+TLS before JS loads
- Module-level `fetch('/rest/v1/', HEAD)` in `supabase.ts` — warms the connection as soon as the module is imported
- `kinly-family-id` localStorage cache — bypasses `loadFamilyId()` network call on hard refresh
- Vite `manualChunks` — splits bundle into `vendor-supabase / vendor-react / vendor-misc / vendor-router / index`
- Progressive loading — `tasksLoading` and `scheduleLoading` are independent; each section renders as soon as its data arrives
- Skeleton components in `NeedsAttention` and `TodaySchedule` — pulse while loading

---

## Today feed interactions (item 1 — done)

**NeedsAttention (tasks)**
- Ring button (left) → `supabase.update({ done: !task.done })` + refresh
- Content area tap → `EditTaskModal` pre-filled with title/date/tag; save or delete
- Clock icon (right) → snooze popover: "Tomorrow" (+1d) or "Next week" (+7d) → `supabase.update({ due_date })`

**TodaySchedule (events)**
- Full row tap → `EventDetailModal` — read-only: time, title, badges, subline, source, date

**FlaggedEmails**
- "+ Add as task" button → modal pre-filled with email subject + optional due date → `supabase.insert` with `tag: 'gmail'` + refresh

---

## Command bar (item 4 — done)

`src/features/home/CommandBar.tsx` · `src/lib/parseCommand.ts`

The command bar input is now live (no longer `readOnly`). Typing and pressing Enter or the send arrow:
1. Calls `parseCommand(input)` — pure synchronous regex/date-fns parser, no API call
2. Determines **type** (`task` | `event`), extracts **date** (yyyy-MM-dd), **time** (HH:mm), and **tag**
3. Opens the appropriate modal pre-filled with the parsed values; user reviews and confirms

**`parseCommand` logic:**
- **Date**: matches "today", "tomorrow", "next [weekday]", "on [weekday]", "in N days/weeks" — uses `date-fns` `nextMonday`, `addDays`, etc.
- **Time**: matches "at 3pm", "at 9:30am", "at 14:00", "at noon", "at midnight"
- **Type**: presence of a time → event; event keywords (meeting, appointment, lesson, pickup, practice, dinner…) → event; task keywords (buy, book, call, pay, clean…) → task; default = task
- **Tag**: regex patterns map to kid / home / occasion / urgent / shopping
- **Title**: removes the parsed date/time spans, strips leading filler ("add a", "remind me to", etc.), capitalises first letter

**Chips still work:** "Add event" → empty `AddEventModal`; "Add task" → empty `AddTaskModal`. "Plan my week" seeds the input field.

**`AddTaskModal`** gains `defaultTitle?`, `defaultDate?`, `defaultTag?` — reset via `useEffect([open, ...])`.
**`AddEventModal`** gains `defaultTitle?`, `defaultTime?` (already had `defaultDate?`) — same reset pattern.

---

## Calendar screen interactions (item 3 — done)

`src/features/calendar/CalendarScreen.tsx`

- Week view: Monday-based weeks (`startOfWeek({ weekStartsOn: 1 })`), 7 days Mon–Sun
- Week nav: prev/next chevron buttons update `weekStart` state; label shows `formatWeekRange` ("May 25 – 31" or cross-month "May 26 – Jun 1")
- Today highlight: date circle filled `bg-[#E8392A] text-white` + "Today" label + day name in tomato red
- Events fetched with `.gte('date', weekStart).lte('date', weekEnd)` + members parallel
- `EventPill`: left-border coloured by source (`manual=#E8392A`, `calendar=sky-400`, `gmail=orange-400`); tappable → `EventDetailModal`
- Per-day "+ Add" button → `AddEventModal` with `defaultDate` pre-filled to that day
- Global "+ Add event" in page header → `AddEventModal` with `defaultDate` = today
- `AddEventModal` gains `defaultDate?: string` prop; a `useEffect([open, defaultDate, reset])` resets the form on each open so the correct date is pre-filled even when the modal is re-used for different days

---

## Database schema (key tables)

| Table | Notes |
|---|---|
| `families` | `id, name, is_demo` |
| `user_families` | `user_id, family_id, role` |
| `members` | `family_id, name, role (parent/child), school, grade, avatar_color` |
| `providers` | `family_id, name, type, phone, email, rating` |
| `activities` | `family_id, member_id, name, days[], time_start, time_end, location` |
| `occasions` | `family_id, member_id, type, label, date, recurring, remind_*` |
| `home_services` | `family_id, provider_id, name, frequency, last_done, next_due` |
| `events` | `family_id, member_id, title, date, time_start, source` |
| `tasks` | `family_id, title, due_date, tag, done, source` |
| `trusted_domains` | `family_id, domain, linked_member_id` |
| `shopping_lists` | `family_id, name` |
| `shopping_items` | `list_id, name, quantity, checked` |
| `google_connections` | `user_id, family_id, access_token, refresh_token, calendar_connected, gmail_connected` |

**RLS**: every table uses `auth.uid() = user_id` via `user_families`. Anonymous users get full access to their seeded family.

---

## Design system

- Accent colour: **tomato red `#E8392A`** — headings, section labels, active states, badges
- All section header labels use `text-[#E8392A]`
- Badge colours: `kid=sky`, `home=amber`, `occasion=purple`, `urgent=red`, `gmail=orange`, `daily=slate`
- Task ring border colour matches tag: `home/urgent=amber`, `occasion=purple`, `kid=sky`, default=slate
- Urgency labels: `Overdue=red-500`, `Today=#E8392A`, `This week=slate-400`
- No emojis in UI
- `max-w-[860px]` centred column on desktop

---

## Known gotchas

- **`supabase.ts` warm-up**: the module-level `fetch('/rest/v1/', HEAD)` runs on import. Do not remove — it eliminates the ~600ms cold-connection penalty on first authenticated query.
- **Demo seed timing**: `seedDemoFamily()` runs 4 parallel Supabase batches in ~1s on a warm connection. If Supabase is fully cold (project paused), it may take longer.
- **`kinly-family-id` cache**: set by `loadFamilyId()` in `App.tsx` and manually by `Welcome.tsx` after seeding. Cleared on sign-out. Never re-used across different users (cleared with `supabase.auth.signOut()`).
- **Snooze popover z-index**: the clock popover uses `z-50` and closes on `mousedown` outside via a `useEffect` document listener in `TaskRow`.
- **`EditTaskModal` resets on task change**: uses `useEffect([task, reset])` to re-populate the form. The `reset()` call is required — without it, the form keeps stale values from the previously edited task.
- **RHF "dep array size changed" dev warning**: `EditTaskModal` triggers a React dev-mode warning ("The final argument passed to useEffect changed size between renders") from inside react-hook-form's own code. This happens because `task` goes from `null` to an object, causing RHF's internal validation dep array to grow. It does not affect runtime or production builds. `AddTaskModal` and `AddEventModal` use a `useRef` pattern (`defaultsRef.current = props`) to read the latest defaults inside `useEffect([open, reset])` — this avoids adding optional props to the dep array and keeps the size stable.
- **Event sublines/member names**: not stored in the DB — derived in `TodaySchedule` from `DEMO_EVENT_MAP` (demo) or `member_id` lookup (real users). `EventDetailModal` receives these as props from `TodaySchedule`.
- **Task member names**: tasks have no `member_id` column — demo member names come from `DEMO_MEMBER_MAP` in `NeedsAttention`, keyed by task title.
- **`FlaggedEmails` email→task**: creates task with `tag: 'gmail', source: 'gmail'`. Only enabled when `familyId` prop is present (passed from `Home.tsx`).
- **Family screen occasions filter**: only shows occasions where `date >= today` (past occasions filtered out client-side). Uses `differenceInDays` from `date-fns` for countdown. Occasions within 7 days = red, 8–30 = amber, 31+ = slate.
- **Family screen member order**: Supabase `order('role')` sorts `child` before `parent` alphabetically. Children appear first in the members row.
- **Family `memberById` helper**: activities and occasions reference `member_id` — resolved to a `Member` object using a local lookup function after data loads.
- **Supabase DDL**: no service role key locally — use the SQL Editor at `https://supabase.com/dashboard/project/ndptffwvqflyfjnarhkb/sql/new`.

---

## Screens status

| Screen | Route | Status |
|---|---|---|
| Welcome | `/welcome` | ✅ Complete |
| Onboarding | `/onboarding` | ✅ Complete |
| Today (home feed) | `/` | ✅ Complete — task edit, event detail, email→task, NL command bar |
| Calendar Settings | `/settings/calendar` | ✅ Complete |
| Family | `/family` | ✅ Complete — members, activities, occasions, providers |
| Calendar | `/calendar` | ✅ Complete — week view, nav, per-day add, event detail |
| Home (services) | `/home` | 🚧 Stub |
| Inbox | `/inbox` | 🚧 Stub |
