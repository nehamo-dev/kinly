# Kinly — Feature Tracker

Last updated: 2026-05-28

---

## ✅ Done

### Design system & layout
- [x] Tailwind v4 design tokens in `index.css` (k-base, k-nav, k-amber, k-purple, k-teal, k-pink, pill tokens, agent tokens)
- [x] `TopNav` — dark redesign (#1A1A18), amber logo, active pill, notification bell, user initials
- [x] `DemoBanner` — dark theme, amber "Sign up" link
- [x] `Welcome` — two-column sign-in: dark brand panel (#1A1A18) left, warm form panel (#F7F4EF) right; wordmark logo, amber tagline, Google SSO, magic link, demo mode; mobile collapses to slim bar

### Home / Today screen
- [x] `HeroHeader` — dark full-width panel, time-aware greeting, dynamic headline, event chip strip (clickable, amber active state), rotating placeholder input bar, microphone button
- [x] `ActionCard` — left-border by member type, title + time pill, subtitle, agent line (purple pill), expand-on-click CTA, isHandled fade + "noted" badge
- [x] `ScheduleCard` — timeline rows, member chips, amber left border for current/next event, past events fade; `highlightEventId` prop dims non-matching rows when chip is active
- [x] `ComingUpCard` — simple forward-look card with label + date label
- [x] `Home.tsx` — two-column layout (55%/45%), HeroHeader full-width, chip strip filters ActionCards/ScheduleCard by tag
- [x] ActionCard "Let Kinly handle it" — wired to Groq with context-specific query per task (`DEMO_ACTION_QUERY` map)
- [x] HeroHeader chip strip filtering — clicking a chip filters left/right columns

### Calendar screen
- [x] `CalendarScreen` — horizontal 7-day strip with event dots (member-color-coded), member filter chips, selected day event list, week navigation

### Family screen
- [x] `parseMember.ts` — pure NL parser for freeform member input ("Lila, age 8, Cedar Crest Grade 3")
- [x] `AddMemberInput` component — Kinly-style dark input bar, parse-then-confirm flow, insert to Supabase on confirm
- [x] Wired `AddMemberInput` into `Family.tsx`

### AI / Kinly assistant
- [x] `groq-sdk` installed
- [x] `assistant.ts` — `streamKinly()` entry-point: Groq SDK in dev (VITE_GROQ_API_KEY), proxies via `/api/kinly` in production; full SSE parsing; AbortController support
- [x] `KinlyPanel` — multi-turn conversation, character-by-character streaming output, blinking cursor, pulsing dots while waiting for first chunk, abort-on-new-query, follow-up input bar
- [x] `/api/kinly` Vercel Edge Function — server-side Groq key, streams SSE back; API key never reaches browser

### Other
- [x] `parseCommand.ts` — NL parser for tasks/events ("Dentist for Lila Friday 3pm")
- [x] `CommandBar` — live input with NL parsing, pre-fills AddEventModal / AddTaskModal
- [x] `CalendarScreen` — week view with `defaultDate` per day

### Infrastructure
- [x] `vercel.json` — API rewrite before SPA catch-all, security headers (HSTS, X-Frame-Options, etc.)
- [x] `tsconfig.api.json` — separate TS project for `api/` with `types: ["node"]`, `composite: true`
- [x] Production deploy — `https://kinly-six.vercel.app` live, `GROQ_API_KEY` set in Vercel dashboard
- [x] Demo mode fix — `user_families` insert error was silently swallowed; fixed error propagation in `demo.ts`
- [x] `loadFamilyId` — switched `.single()` → `.maybeSingle()` to avoid 406 on 0 rows

---

## 📋 Backlog

### Home / Today
- [ ] **Mobile layout** — single-column below 768px (skipped; `flex-col md:flex-row` classes in place but untested end-to-end)
- [ ] Handled tasks — swipe-to-dismiss or explicit "mark done" on ActionCard
- [ ] Assistant context — pass full task list + event details to Groq (currently sends count + top events only)
- [ ] Suggested follow-up questions after each KinlyPanel answer
- [ ] Voice input — microphone button in HeroHeader is non-functional

### Calendar
- [ ] Past days — grey out dates before today in the 7-day strip
- [ ] Month view toggle

### Family
- [ ] Conversational follow-up — after adding a member, Kinly asks "what activities does she do?"
- [ ] Edit member — tap member card to edit details
- [ ] Add activity / occasion via Kinly natural-language input (currently form-only)

### Inbox
- [ ] Inbox screen — render flagged emails with member badges + Kinly action suggestions
- [ ] Email → task creation flow

### Settings
- [ ] Settings / profile screen (currently placeholder)
- [ ] Home screen (`/home` route) — currently ShellScreen placeholder

### Infrastructure
- [ ] Google OAuth — fill `VITE_GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_SECRET` for calendar sync (skipped for now)
- [ ] Supabase RLS — add explicit INSERT policy on `families` table (currently relies on default grants; low risk but should be locked down before production)
- [ ] Rate limiting on `/api/kinly` — no rate limiting currently; open to abuse in production

---

## 🐛 Known Issues

- HeroHeader event chips use first 4 events from today, not filtered by relevance or time proximity
- `format` imported but used only inside `addMember()` closure in `Family.tsx` — can refactor later
- Vercel build shows a TS2591 `process` warning for `api/kinly.ts` even with `tsconfig.api.json` — non-fatal, function works at runtime
