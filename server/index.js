import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import webpush from 'web-push'
import { store, loadOrCreateVapid } from './store.js'

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
app.use(express.json({ limit: '256kb' }))

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

app.get('/', (_req, res) => res.type('text').send('Last Done push server. API under /push'))

app.listen(PORT, () => console.log(`[push] listening on :${PORT}`))

export { app, sweep }
