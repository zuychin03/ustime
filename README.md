# UsTime

A colour-tagged shared calendar for two people in a long-distance relationship.
Syncs both partners' schedules across timezones, finds mutual free time (around
sleep hours), runs synced study sessions, and tracks visits & milestones.

Built with Nuxt — a rebuild of an earlier Next.js prototype that felt slow on
mobile. See [`../ustime-project-spec.md`](../ustime-project-spec.md) for the full
spec.

## Tech stack

| Layer            | Choice                                         |
| ---------------- | ---------------------------------------------- |
| Framework        | Nuxt 4 + Vue 3 (`<script setup>`) + TypeScript |
| Styling          | Tailwind CSS v4 + shadcn-vue                   |
| Backend          | Supabase (`@nuxtjs/supabase`)                  |
| ORM / migrations | Drizzle ORM + drizzle-kit                      |
| Date/time        | Luxon · Recurrence: rrule · Colour: culori     |
| Dark mode        | `@nuxtjs/color-mode`                           |
| Testing          | Vitest                                         |

## Getting started

```sh
npm install
cp .env.example .env      # fill in your Supabase keys
npm run dev
```

## Scripts

| Script                                             | What it does               |
| -------------------------------------------------- | -------------------------- |
| `npm run dev` / `build` / `preview`                | Nuxt dev / build / preview |
| `npm run typecheck`                                | `nuxt typecheck` (vue-tsc) |
| `npm run lint` / `format`                          | ESLint + Prettier          |
| `npm run test`                                     | Vitest                     |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle                    |

## Status

**Stage 0 (foundation) and Stage 1 (core calendar MVP) are complete.**

Stage 1 ships:

- **Calendar** — a custom Vue week grid (no FullCalendar) with hour rows, day
  columns, a "now" line, drag-to-create and tap-to-edit, plus a read-only month
  summary.
- **Events** — full CRUD with optimistic updates via TanStack Query, owner
  (me / partner / shared), per-event colour override, all-day flag, location,
  and rrule recurrence.
- **Colour & overlaps** — each partner has a colour; shared events use the OKLCH
  midpoint blend for their whole duration. When two events clash, the later one is
  narrowed so a full-width OKLCH blend band shows in the strip beside it, marking
  the shared busy time.
- **Dual-timezone display** — the time axis can show mine / theirs / both, and
  every event shows both partners' local times.
- **Free-time finder** — mutual free windows over the next 14 days (excluding
  events and sleep hours); one tap books a call or study event.
- **Study-with-me** — a synced Pomodoro timer over Supabase Realtime broadcast
  (absolute `endsAt` timestamps, so clocks can't drift), session logging, and
  cumulative "hours studied together".
- **Presence, status & pings** — partner online/offline + manual status over a
  presence channel, and a rate-limited "thinking of you" ping (in-app toast).
- **Countdown** — dashboard card counting down to the next `visit` (or days
  since the last one).

Realtime is wired through a single `couple:{id}` channel
(`useCoupleChannel`): presence, broadcast (ping / timer / status) and
`postgres_changes` on `events` to invalidate caches.

Next up is Stage 2 (Google Calendar import, milestones, memories, PWA + push).
