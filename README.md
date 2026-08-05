# Last Done Tracker

A modern, offline-first **PWA** for tracking the recurring, never-really-finished stuff that's easy to forget: when did you last water the plants, change the sheets, clean the litter box, call Mom? See when you last did anything — and what's due — at a glance.

A clean-room web re-imagining of the lastGLANCE concept, built with React + Vite + Tailwind. Your data stays on your device.

## What it does

- **At-a-glance color states** — every chore card eases from green → amber → red as it approaches and passes its due date. One look tells you what needs attention.
- **One-tap done** — tap a chore the moment you do it. That's the whole interaction.
- **Cadences** — give each chore a rough rhythm (daily, weekly, every 3 months, or any custom number of days), or leave it untimed.
- **Categories** — group chores (Home, Plants, Pets, Health, Car…), each with its own icon and colour, and filter by them.
- **Households** — add people, assign chores, and filter the view to just one person ("me").
- **Seasonal chores** — chores that only count during part of the year (e.g. salt the driveway Nov–Feb) go dormant off-season.
- **Completion notes & history** — add a note to any completion and see the full history per chore.
- **Activity heatmap** — a GitHub-style contribution heatmap of everything you've kept up with, plus streaks and stats.
- **Search** — jump straight to any chore.
- **Light / dark / system themes.**
- **Backup & restore** — export/import your data as a JSON file. Everything lives in the browser (localStorage); nothing leaves your device.
- **Overdue notifications** — opt-in system notifications nudge you when chores go overdue (see below).
- **Installable PWA** — add it to your home screen or desktop; works fully offline via a service worker.

## Notifications — how they work

This is an **offline-first** build (phase 1). Notifications use the browser's Notifications API and fire while the app is open or recently backgrounded. You get one daily summary of overdue chores after a time you choose.

**Phase 2 (planned):** true background push — reminders that fire even when the app has been closed for days — requires a small push backend (Web Push + VAPID). The code is structured for this: `src/lib/notifications.js` already has a `registerForPush()` stub and a service worker is generated, so a backend can be added without reworking the UI.

Platform notes: Android Chrome and desktop browsers support web push well; iOS supports it only for PWAs added to the home screen (iOS 16.4+).

## Tech

- React 18 + Vite 5
- Tailwind CSS 3
- `vite-plugin-pwa` (Workbox) for the manifest + offline service worker
- State via React `useReducer` + Context; persistence in `localStorage` (wrapped so IndexedDB or cloud sync can drop in later)
- Zero backend, zero accounts, zero analytics

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # serve the production build
```

## Project structure

```
src/
  App.jsx                 # shell: header, filters, views, bottom nav, FAB
  lib/
    dates.js              # cadence + color-state + season math (the core logic)
    store.jsx             # reducer, context, persistence, derived selectors
    seed.js               # demo data on first run
    notifications.js      # phase-1 local notifications + phase-2 push stub
    icons.js, uid.js
  components/
    ChoreCard.jsx         # the color-coded card with one-tap done
    ChoreDetail.jsx       # history, complete-with-note, edit, archive
    AddEditChore.jsx      # add/edit form (icon, cadence, category, person, seasonal)
    Stats.jsx, Heatmap.jsx
    Settings.jsx          # people, categories, notifications, theme, backup
    Sheet.jsx, Pickers.jsx
```

## Roadmap

- [ ] Phase 2: Web Push backend for background overdue reminders
- [ ] Optional end-to-end-encrypted cloud sync
- [ ] Home-screen widgets / Quick Settings tiles (native wrapper)

## License

Private project. Concept inspired by lastGLANCE; implementation is original.
