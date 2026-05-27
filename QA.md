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

- [ ] Logo renders: three-dot smiley in tomato red (#E8392A), white background
- [ ] Email field + "Send magic link" button visible
- [ ] "Continue with Google" button visible
- [ ] "✦ Try with demo data" ghost button visible
- [ ] "No account required · resets after 24 hours" caption visible
- [ ] Clicking "Send magic link" with a valid email shows the confirmation screen ("Check your inbox")
- [ ] Confirmation screen shows the entered email address
- [ ] "Use a different email" link resets back to the form
- [ ] Hard-refresh on `/welcome` does NOT 404 (SPA rewrite in vercel.json)

---

### 3. Demo mode — seed flow

- [ ] Clicking "✦ Try with demo data" shows a loading spinner on the button
- [ ] After ~2–4 seconds (parallel seeding), redirects to the home feed (no error message shown)
- [ ] If seed takes > 20 s, shows "Demo setup timed out — please try again" error (not infinite spin)
- [ ] Demo banner appears at the top: "You're in demo mode. Your data resets after 24 hours."
- [ ] TopNav shows the smiley logo + "Kinly" wordmark in tomato red
- [ ] "Today" nav item shows active pill state (bg-slate-100)
- [ ] User avatar visible in top-right corner

---

### 4. Home feed — Needs Attention section

- [ ] Section header shows "NEEDS ATTENTION 5" with a red dot
- [ ] "House cleaning overdue by 3 days" — `home` badge — urgency "Overdue" in red
- [ ] Subline: "Bi-weekly cycle · last visit May 10 · Maria's Cleaning Co."
- [ ] "Confirm Saturday babysitter" — `occasion` badge — urgency "Today" in green
- [ ] Subline: "Jess Nguyen for anniversary dinner · text to confirm"
- [ ] "Complete soccer registration" — `Lila` member badge + `urgent` badge — urgency "This week" in slate
- [ ] Subline: "From seahawkssoccer.org · payment + medical form · closes Fri"
- [ ] "Show 2 more ↓" link visible (Plan Noah's birthday + HVAC not shown initially)
- [ ] Clicking "Show 2 more" reveals the remaining 2 tasks

---

### 5. Home feed — Today's Schedule section

- [ ] Section header shows "TODAY'S SCHEDULE 3" with a red dot
- [ ] "Family morning sync" — `daily` badge — subline "15 min · review the day's plan over coffee"
- [ ] "School pickup — Lila" — `Lila` member badge — subline "Cedar Crest north gate · 1.2 mi"
- [ ] "Piano lesson" — `Lila` member badge — subline "Ms. Chen · Studio B · recurring weekly"
- [ ] Time column shows correct format: "9:00 am", "3:15 pm", "4:00 pm"

---

### 6. Home feed — Flagged Emails section

- [ ] Section header shows "FLAGGED EMAILS 4"
- [ ] "Parent info night — please RSVP" — `Lila` member badge — timestamp "9:14am"
- [ ] Domain/preview format: "cedarcrestacademy.org — Tonight at 6:30 in the auditorium…"
- [ ] "Spring registration closes Friday" — `urgent` badge — timestamp "7:02am"
- [ ] "HVAC seasonal service reminder" — `home` badge — timestamp "Mon"
- [ ] "Show 1 more ↓" link visible (weekly grocery delivery hidden initially)

---

### 7. Command bar

- [ ] Placeholder text: "Add an event, plan a task, set a reminder, or ask anything..."
- [ ] Voice icon and send button (dark rounded square) visible
- [ ] "✦ Plan my week", "📅 Add event", "✓ Add task" chips visible
- [ ] "Add event" chip opens AddEventModal
- [ ] "Add task" chip opens AddTaskModal
- [ ] AddEventModal: title + date fields + Save button works (event appears in schedule)
- [ ] AddTaskModal: title + due date + tag fields + Save button works (task appears in attention list)

---

### 8. Navigation

- [ ] All 5 nav items visible: Today, Family, Calendar, Home, Inbox
- [ ] Clicking "Family" navigates to /family (stub screen visible, no 404)
- [ ] Clicking "Calendar" navigates to /calendar
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
