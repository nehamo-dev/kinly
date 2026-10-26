# kinly.

**The family assistant that turns "Dentist for Lila Friday at 3pm" into a calendar event before you've put your phone down.**

**▶ Live demo: [kinly-six.vercel.app](https://kinly-six.vercel.app)** · no sign-up needed, tap *Try with demo data*

---

## The problem

Running a family is a logistics job with no software. School emails, swim lessons, the plumber, a birthday on Saturday, the permission slip due tomorrow. It lives across a shared calendar nobody updates, three inboxes, a group chat and one parent's head.

Kinly puts it in one place, and you talk to it the way you'd text your partner.

## What it does

- **Today, at a glance.** A time-aware home screen: what *needs you* now, what's on the schedule, and what's *on the horizon*. Overdue and urgent items float up; done things fade out.
- **Just say it.** The Kinly bar sits on every screen. Type or speak "Swim practice for Arjun every Tuesday at 4" or "Remind me to book the plumber next week" and Kinly works out whether it's a task or an event, who it's for, the date, the time and the tag, then does it.
- **A real assistant, not a search box.** Ask "What does tomorrow look like?" or "What's still open for the party?" and get a short, plain answer grounded in your family's actual calendar and task list.
- **The whole family, modelled.** Add people in plain language ("Lila, age 8, Cedar Crest, Grade 3") and Kinly parses it into a profile. Events and tasks are tied to the person they're for and color-coded across the calendar.
- **Calendar and inbox in the loop.** Flagged emails become tasks in one tap, and a Google Calendar sync is built in (it switches on once OAuth credentials are configured).
- **Snooze, edit, done.** Every task has a one-tap ring to complete it and a clock to push it to tomorrow or next week.

## How it works

```
"Dentist for Lila Friday 3pm"
            │
      Kinly bar (text or voice)
            │
   /api/kinly  ── Vercel Edge Function, Groq key stays on the server
            │      family context injected: members, today's events, open tasks
            │
   Llama 3.3 70B streams a reply  +  [ACTION:{ "type":"add_event", ... }]
            │
   Client strips the tag, shows the reply, validates the action
            │
   Supabase insert (RLS: rows scoped to your family)  →  screen refreshes
```

A few decisions worth calling out:

- **The model talks, the code acts.** The LLM never touches the database. It appends a typed `[ACTION:{...}]` block (`add_event`, `add_task`, `add_member`), which the client parses against a TypeScript union and executes against Supabase. A malformed action is dropped, not guessed at.
- **Fast paths that skip the model.** `parseCommand.ts` is a pure regex + `date-fns` parser for the common cases ("tomorrow at noon", "next Tuesday", "in 3 days"), so quick adds open a pre-filled form instantly with no network call.
- **A demo that's real.** Demo mode is a Supabase anonymous session with a fully seeded family, not a fake front end. Visitors exercise the same queries, RLS policies and AI calls as a signed-in user.
- **Built to feel instant.** Supabase is preconnected in `index.html`, a warm-up request fires when the client module loads, the family ID is cached for hard refreshes, each section renders as soon as its own data lands (with skeletons until then), and the bundle is split into vendor chunks.
- **Secrets stay server-side.** The Groq key lives only in the Edge Function; the browser streams SSE from `/api/kinly`.

## Stack

| | |
|---|---|
| App | React 19 · TypeScript · Vite |
| Styling | Tailwind CSS v4 with a custom token system |
| State and data | Zustand · TanStack Query · React Hook Form + Zod |
| Backend | Supabase (Postgres, Auth, row-level security) |
| AI | Groq · Llama 3.3 70B, streamed through a Vercel Edge Function |
| Integrations | Google Calendar (OAuth) |
| Hosting | Vercel |

## Run it locally

```bash
npm install
npm run dev   # http://localhost:5173
```

Create `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `GROQ_API_KEY`, and apply the schema in `supabase/migrations/001_initial_schema.sql` to your Supabase project first.

```
src/
  features/      today · calendar · family · home · inbox · onboarding
  components/    KinlyBar, layout, UI primitives
  lib/           assistant (streaming), kinlyActions, parseCommand, parseMember, google
  store/         auth + family session
api/kinly.ts     Edge Function: Groq proxy with family context
```

## What's next

Tracked in [TODO.md](TODO.md). Up next: giving the assistant the full task and event list (not just counts), follow-up questions after each answer ("What activities does Lila do?"), adding activities by voice, a month view, and rate limiting on `/api/kinly`.
