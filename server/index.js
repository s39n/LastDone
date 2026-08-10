import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import webpush from 'web-push'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { store, sync, loadOrCreateVapid } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT || 4000
const CONTACT = process.env.VAPID_CONTACT || 'mailto:hello@example.com'
const DAY_MS = 86400000
const RENOTIFY_MS = Number(process.env.RENOTIFY_HOURS || 20) * 3600000

const vapid = loadOrCreateVapid(webpush)
webpush.setVapidDetails(CONTACT, vapid.publicKey, vapid.privateKey)
console.log(`[push] VAPID key ready (${vapid.source}).`)
if (vapid.source === 'generated') {
  console.log('[push] Generated a VAPID keypair (saved to data/vapid.json). Public key:')
  console.log(`[push]   ${vapid.publicKey}`)
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '8mb' }))

const router = express.Router()

router.get('/health', (_req, res) => res.json({ ok: true, subs: store.all().length }))
router.get('/vapidPublicKey', (_req, res) => res.json({ publicKey: vapid.publicKey }))

router.post('/subscribe', (req, res) => {
  const { subscription } = req.body || {}
  if (!subscription?.endpoint) return res.status(400).json({ error: 'missing subscription' })
  store.upsertSub(subscription)
  res.json({ ok: true })
})

router.post('/schedule', (req, res) => {
  const { endpoint, items, reminderHour } = req.body || {}
  if (!endpoint) return res.status(400).json({ error: 'missing endpoint' })
  const ok = store.setSchedule(endpoint, items, reminderHour)
  if (!ok) return res.status(404).json({ error: 'unknown endpoint — subscribe first' })
  res.json({ ok: true, count: (items || []).length })
})

router.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {}
  if (endpoint) store.remove(endpoint)
  res.json({ ok: true })
})

router.post('/test', async (req, res) => {
  const { endpoint } = req.body || {}
  const rec = store.all().find(r => r.subscription.endpoint === endpoint)
  if (!rec) return res.status(404).json({ error: 'unknown endpoint' })
  try {
    await webpush.sendNotification(rec.subscription, JSON.stringify({ title: 'Test from Last Done', body: 'Background push is working.', tag: 'test' }))
    res.json({ ok: true })
  } catch (e) { res.status(502).json({ error: String(e.statusCode || e.message) }) }
})

app.use('/push', router)

// ── Cross-device sync: plaintext app-state blobs keyed by a user's sync code ──
const syncRouter = express.Router()
syncRouter.get('/:code', (req, res) => {
  const r = sync.get(req.params.code)
  if (r.error) return res.status(400).json(r)
  res.json(r) // { state: <obj|null> }
})
syncRouter.put('/:code', (req, res) => {
  const state = req.body && req.body.state
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'missing state' })
  const r = sync.put(req.params.code, state)
  if (r.error) return res.status(400).json(r)
  res.json(r)
})
app.use('/sync', syncRouter)

// The overdue sweep: for each subscriber, find items due now and not recently notified.
async function sweep() {
  const now = Date.now()
  const hour = new Date().getHours()
  for (const rec of store.all()) {
    const rh = typeof rec.reminderHour === 'number' ? rec.reminderHour : 0
    if (hour < rh) continue
    const overdue = (rec.items || []).filter(it => it.dueAt && it.dueAt <= now)
      .filter(it => !rec.notified[it.id] || now - rec.notified[it.id] > RENOTIFY_MS)
    if (!overdue.length) continue
    const first = overdue[0]
    const extra = overdue.length - 1
    const payload = {
      title: overdue.length === 1 ? 'A chore is overdue' : `${overdue.length} chores are overdue`,
      body: extra > 0 ? `${first.name} + ${extra} more` : first.name,
      tag: 'overdue-summary',
      choreId: overdue.length === 1 ? first.id : null,
      url: '/'
    }
    try {
      await webpush.sendNotification(rec.subscription, JSON.stringify(payload))
      store.markNotified(rec.subscription.endpoint, overdue.map(o => o.id))
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { store.remove(rec.subscription.endpoint); console.log('[push] pruned expired subscription') }
      else console.warn('[push] send failed', e.statusCode || e.message)
    }
  }
}

const CRON = process.env.CRON || '*/15 * * * *'
cron.schedule(CRON, () => { sweep().catch(e => console.warn('sweep error', e)) })
console.log(`[push] overdue sweep scheduled: ${CRON}`)

// Serve the built PWA (same origin as the API, so the app's default '/push' works).
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, 'public')
if (fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
  app.use(express.static(PUBLIC_DIR, { index: false, maxAge: '1h', setHeaders: (res, p) => {
    // never cache the SW or the app shell — always pick up new deploys
    if (p.endsWith('sw.js') || p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
  }}))
  // SPA fallback for client routes (but never for the API).
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/push') || req.path.startsWith('/sync')) return next()
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'))
  })
  console.log(`[web] serving PWA from ${PUBLIC_DIR}`)
} else {
  app.get('/', (_req, res) => res.type('text').send('Last Done push server. API under /push (no web build bundled).'))
  console.log('[web] no web build found — serving API only')
}

app.listen(PORT, () => console.log(`[push] listening on :${PORT}`))

export { app, sweep }
