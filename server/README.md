# Last Done — server (web app + push backend)

A single self-hosted container that serves the **Last Done web app** *and* a [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) backend for **overdue reminders even when the app is closed**. The Docker image builds the PWA and bundles it in, so one service hosts everything at the same origin — the app's `/push` calls just work, no URL config.

The push layer is phase 2; the app works fully offline without it (local reminders only).

## How it works

1. The app subscribes the browser to push and sends its public subscription here (`POST /push/subscribe`).
2. On every change, the app syncs a **compact due-schedule** — just `{ id, name, dueAt }` per timed chore (`POST /push/schedule`). No completion history, no notes.
3. A cron sweep (default every 15 min) finds items past `dueAt` that haven't been nudged recently and sends a push. The service worker shows it; tapping **Done** marks the chore complete in the app.

Subscriptions live in `data/db.json`; the VAPID keypair in `data/vapid.json` (auto-generated on first run unless you supply your own).

## Which compose file?

- **[`../docker-compose.yml`](../docker-compose.yml) (repo root)** — use this for git-based deployers like **Dockhand**. Build context is the repo root (`context: .`), so a fresh checkout builds without any `..` path surprises. Config comes from the deployer's env editor.
- **`server/docker-compose.yml` (this dir)** — convenience for running locally from inside `server/` with an `.env` file (build context is `..`). Only works when the full repo is checked out around it.

If Dockhand shows `lstat …/server: no such file or directory`, it's pointed at `server/docker-compose.yml` (whose `..` context escapes the stack dir). Point it at the **root** `docker-compose.yml` instead.

## Run with Docker

```bash
cp .env.example .env      # edit VAPID_CONTACT, PUSH_PORT, DATA_PATH
docker compose up -d --build
```

Server is on `http://<host>:${PUSH_PORT}` (default `4000`), API under `/push`. Health check: `GET /push/health` (Compose also runs this as a container healthcheck).

### Networking (host mode)

The compose file uses `network_mode: host`: the container shares the host's network stack instead of getting its own Docker bridge network. This avoids the error `all predefined address pools have been fully subnetted`, which happens when Docker has run out of address space to create new networks. Host mode is Linux-only, which is fine for a NAS.

Because there's no port mapping in host mode, the app binds **directly** to the host on `PUSH_PORT`:

```env
PUSH_PORT=8443        # reach it at http://<host>:8443
```

Make sure that port is free on the host. If you'd rather use isolated bridge networking (and remap the host port independently), see the commented "BRIDGE networking" block in `docker-compose.yml` — but only switch back once the address-pool issue is resolved (see Troubleshooting).

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

## Opening the app

Once the container is up, just open **`http://<host>:${PUSH_PORT}`** — the container serves the built PWA at the root and the API under `/push` at the same origin, so nothing to configure. Client-side routes fall back to the app shell; the service worker and app shell are sent with `Cache-Control: no-cache` so redeploys are picked up.

The image is a multi-stage build (`server/Dockerfile`): stage 1 runs `npm ci && npm run build` for the frontend, stage 2 copies `dist/` into the API image's `public/`. Because of this, the Compose `build.context` is the **repo root** (not `server/`).

### Hosting the app elsewhere (optional)

If you'd rather serve the frontend separately (CDN, another host) and use this container as API-only, build the frontend pointing at this server and deploy `dist/` yourself:

```bash
# from the project root
VITE_PUSH_URL=https://push.yourdomain.com/push npm run build
```

The bundled copy still serves as a fallback; the app defaults to same-origin `/push` when `VITE_PUSH_URL` is unset.

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

## Troubleshooting

**`all predefined address pools have been fully subnetted`** — Docker can't create another network because it has exhausted its address pools (usually from many leftover Compose/stack networks). The shipped compose already sidesteps this with `network_mode: host`. If you instead want bridge networking, reclaim pools first:

```bash
docker network prune              # remove unused networks
docker network ls                 # see what's left
```

If you legitimately run many stacks, widen Docker's pools in `/etc/docker/daemon.json` and restart Docker:

```json
{
  "default-address-pools": [
    { "base": "10.200.0.0/16", "size": 24 }
  ]
}
```

**Port already in use** — in host mode the app binds `PUSH_PORT` directly; pick a free port or stop whatever holds it (`ss -ltnp | grep :4000`).

**`data/` not writable** — the container runs as uid 1000; `chown -R 1000:1000 <DATA_PATH>` (or make it group-writable) on the NAS.

## Note on HTTPS

Web Push requires the app to be served over HTTPS (localhost is exempt for dev). Put this behind a TLS-terminating reverse proxy in production. Note that with `network_mode: host` the container is reachable on every host interface — front it with your reverse proxy / firewall accordingly.
