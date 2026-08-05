# Last Done — push backend

A tiny self-hosted [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) server that sends **overdue reminders even when the app is closed**. This is phase 2 of Last Done; the app works fully offline without it (local reminders only).

## How it works

1. The app subscribes the browser to push and sends its public subscription here (`POST /push/subscribe`).
2. On every change, the app syncs a **compact due-schedule** — just `{ id, name, dueAt }` per timed chore (`POST /push/schedule`). No completion history, no notes.
3. A cron sweep (default every 15 min) finds items past `dueAt` that haven't been nudged recently and sends a push. The service worker shows it; tapping **Done** marks the chore complete in the app.

Subscriptions live in `data/db.json`; the VAPID keypair in `data/vapid.json` (auto-generated on first run unless you supply your own).

## Run with Docker

```bash
cp .env.example .env      # edit VAPID_CONTACT
docker compose up -d --build
```

Server is on `http://localhost:4000`, API under `/push`. Health check: `GET /push/health`.

## Run without Docker

```bash
npm install
cp .env.example .env
npm start
```

## Point the app at it

Build the frontend with the backend URL:

```bash
# from the project root
VITE_PUSH_URL=https://push.yourdomain.com/push npm run build
```

If the server is same-origin (reverse-proxied under `/push`), you can skip `VITE_PUSH_URL` — the app defaults to `/push`.

## Endpoints

| Method | Path | Body | Purpose |
|-------|------|------|---------|
| GET  | `/push/health` | — | liveness + subscriber count |
| GET  | `/push/vapidPublicKey` | — | public key for the browser |
| POST | `/push/subscribe` | `{ subscription }` | register a browser |
| POST | `/push/schedule` | `{ endpoint, items, reminderHour? }` | sync due-schedule |
| POST | `/push/test` | `{ endpoint }` | send a test push |
| POST | `/push/unsubscribe` | `{ endpoint }` | remove a browser |

## Config (env)

See `.env.example`. Keys: `PORT`, `VAPID_CONTACT`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `CRON`, `RENOTIFY_HOURS`.

## Note on HTTPS

Web Push requires the app to be served over HTTPS (localhost is exempt for dev). Put this behind a TLS-terminating reverse proxy in production.
