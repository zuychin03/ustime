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

Stage 0 (foundation) plus the start of Stage 1: the tested pure helpers
(timezones/DST, OKLCH blend, rrule recurrence, free-time finder), onboarding,
pairing, the app shell, and the dashboard. The rest of Stage 1 (week grid,
free-time finder UI, realtime, study timer) is next.
