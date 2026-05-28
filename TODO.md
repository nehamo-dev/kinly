# Kinly — Feature Tracker

Last updated: 2026-05-28

---

## ✅ Done

### Design system & layout
- [x] Tailwind v4 design tokens in `index.css` (k-base, k-nav, k-amber, k-purple, k-teal, k-pink, pill tokens, agent tokens)
- [x] `TopNav` — dark redesign (#1A1A18), amber logo, active pill, notification bell, user initials
- [x] `DemoBanner` — dark theme, amber "Sign up" link

### Home / Today screen
- [x] `HeroHeader` — dark full-width panel, time-aware greeting, dynamic headline, event chip strip, rotating placeholder input bar, microphone button
- [x] `ActionCard` — left-border by member type, title + time pill, subtitle, agent line (purple pill), expand-on-click CTA, isHandled fade + "noted" badge
- [x] `ScheduleCard` — timeline rows, member chips (Lila/Family/Us), amber left border for current/next event, past events fade to 0.35 opacity
- [x] `ComingUpCard` — simple forward-look card with label + date label
- [x] `Home.tsx` — two-column layout (55% left #F7F4EF / 45% right #FDFCF9), HeroHeader full-width above columns, ActionCards from tasks, ScheduleCard, ComingUpCard from occasions

### Calendar screen
- [x] `CalendarScreen` — horizontal 7-day strip with event dots (member-color-coded), member filter chips, selected day event list, week navigation

### Family screen
- [x] `parseMember.ts` — pure NL parser for freeform member input ("Lila, age 8, Cedar Crest Grade 3")
- [x] `AddMemberInput` component — Kinly-style dark input bar, parse-then-confirm flow, insert to Supabase on confirm
- [x] Wired `AddMemberInput` into `Family.tsx`

### AI / Kinly assistant
- [x] `groq-sdk` installed
- [x] `assistant.ts` — Groq client wrapper, `askKinly()` with family context injection, llama-3.3-70b-versatile
- [x] `KinlyPanel` — slide-in panel below hero, shows query + streaming-style response, dismiss button
- [x] `Home.tsx` — HeroHeader `onQuery` wired to `KinlyPanel`

### Other
- [x] `parseCommand.ts` — NL parser for tasks/events ("Dentist for Lila Friday 3pm")
- [x] `CommandBar` — live input with NL parsing, pre-fills AddEventModal / AddTaskModal
- [x] `CalendarScreen` — week view with `defaultDate` per day

---

## 🔨 In Progress

- [ ] **Groq API key** — add `VITE_GROQ_API_KEY` value to `.env.local` to activate Kinly AI responses

---

## 📋 Backlog

### Home / Today
- [ ] `KinlyPanel` — proper typewriter / streaming effect for Groq response text
- [ ] HeroHeader chip strip — clicking a chip should filter ActionCards / ScheduleCard
- [ ] ActionCard "Let Kinly handle it" — wire to actual Groq action (draft text, pre-fill form)
- [ ] Handled tasks — swipe-to-dismiss or "mark handled" action on ActionCard
- [ ] Mobile layout — single-column below 768px breakpoint

### Calendar
- [ ] Add event on calendar — `AddEventModal` defaultDate wired correctly ✓; verify with demo data
- [ ] Past events — grey out days before today in the strip
- [ ] Month view toggle

### Family
- [ ] Conversational follow-up — after adding a member, Kinly asks "what activities does she do?"
- [ ] Edit member — tap member card to edit details
- [ ] Add activity via Kinly input (currently form-only)
- [ ] Add occasion via Kinly input

### AI / Kinly assistant
- [ ] Move Groq API key server-side (Vercel Edge Function) to avoid browser exposure
- [ ] Assistant context — pass full today's task list to Groq, not just count
- [ ] Multi-turn chat — persist conversation history in KinlyPanel
- [ ] Suggested follow-up questions after each answer
- [ ] Voice input (microphone button in HeroHeader currently non-functional)

### Inbox
- [ ] Inbox screen — render flagged emails with Kinly action suggestions
- [ ] Email → task creation flow

### Home/settings
- [ ] Home screen (`/home` route) — currently shows ShellScreen placeholder
- [ ] Settings / profile screen

### Infrastructure
- [ ] `.env.local` — fill `VITE_GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_SECRET` for calendar sync
- [ ] Supabase RLS — verify policies are correct for demo (anonymous) users
- [ ] Production Vercel deploy — set env vars in Vercel dashboard

---

## 🐛 Known Issues

- Demo data shows blank until Supabase wakes from cold start (free tier, ~20s)
- `VITE_GROQ_API_KEY` is client-side — fine for demo, move server-side before production
- HeroHeader event chips use first 4 events from today, not filtered by relevance
- `format` imported but used only inside `addMember()` closure in `Family.tsx` — TypeScript happy, can refactor later
