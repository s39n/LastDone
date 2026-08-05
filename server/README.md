# Last Done — push backend

A tiny self-hosted [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) server that sends **overdue reminders even when the app is closed**. This is phase 2 of Last Done; the app works fully offline without it (local reminders only).

## How it works

1. The app subscribes the browser to push and sends its public subscription here (`POST /push/subscribe`).
2. On every change, the app syncs a **compact due-schedule** — just `{ id, name, dueAt }` per timed chore (`POST /push/schedule`). No completion history, no notes.
3. A cron sweep (default every 15 min) finds items past `dueAt` that haven't been nudged recently and sends a push. The service worker shows it; tapping **Done** marks the chore complete in the app.

Subscriptions live in `data/db.json`; the VAPID keypair in `data/vapid.json` (auto-generated on first run unless you supply your own).

## Run with Docker

```bash
cp .env.example .env      # edit VAPID_CONTACT, PUSH_PORT, DATA_PATH
docker compose up -d --build
```

Server is on `http://<host>:${PUSH_PORT}` (default `4000`), API under `/push`. Health check: `GET /push/health` (Compose also runs this as a container healthcheck).

### Choosing the port

Set `PUSH_PORT` in `.env` to change how you reach the server — the compose file maps `${PUSH_PORT}:${CONTAINER_PORT}`:

```env
PUSH_PORT=8443        # reach it at http://<host>:8443
CONTAINER_PORT=4000   # internal listen port; rarely needs changing
```

### Storing data on your NAS

The `data/` folder holds the browser subscriptions (`db.json`) and the VAPID keypair (`vapid.json`). **Keep it on persistent storage** — if the VAPID keys are lost, every existing push subscription breaks. Point `DATA_PATH` at a folder on your NAS:

```env
DATA_PATH=/volume1/docker/lastdone/data   # Synology
# DATA_PATH=/mnt/nas/lastdone/data        # generic Linux NFS/CIFS mount
```

Make sure the folder exists and is writable by the container (uid 1000 in `node:22-alpine`):

```bash
mkdir -p /volume1/docker/lastdone/data
```

If your NAS is a **separate host** reached over NFS, use the named-volume block at the bottom of `docker-compose.yml` instead of the bind mount, and set `NAS_ADDR` / `NAS_EXPORT_PATH` in `.env`.

### Deploying with Dockhand

This stack is a standard env-driven Compose file, so Dockhand can manage it directly: point Dockhand at `server/docker-compose.yml` in this repo. A `git push` to the repo triggers Dockhand's auto-redeploy — because `DATA_PATH` lives on the NAS (outside the container), subscriptions and VAPID keys survive every rebuild. To ship a prebuilt image rather than building on the host, comment out `build: .`, set `image: ${IMAGE}` (already stubbed in the compose file), and define `IMAGE` in `.env`.

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

See `.env.example` for the full list with comments.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PUSH_PORT` | `4000` | Host port you reach the server on |
| `CONTAINER_PORT` | `4000` | Port the app listens on inside the container |
| `DATA_PATH` | `./data` | Host path for `data/` — point at your NAS |
| `CONTAINER_NAME` | `lastdone-push` | Container name |
| `VAPID_CONTACT` | — | Contact email in push headers |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | auto | Bring your own keys (else generated once into `data/`) |
| `CRON` | `*/15 * * * *` | Overdue sweep frequency |
| `RENOTIFY_HOURS` | `20` | Min hours between repeat nudges for the same chore |
| `NAS_ADDR` / `NAS_EXPORT_PATH` | — | Only for the NFS named-volume option |

`PORT` (the raw listen port) is set for you by Compose from `CONTAINER_PORT`; when running without Docker, set `PORT` directly.

## Note on HTTPS

Web Push requires the app to be served over HTTPS (localhost is exempt for dev). Put this behind a TLS-terminating reverse proxy in production.
