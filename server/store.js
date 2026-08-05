import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

fs.mkdirSync(DATA_DIR, { recursive: true })

let db = { subs: {} }
try { if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) } catch (e) { console.warn('db read failed', e) }

let writeTimer = null
function persist() {
  clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db)) } catch (e) { console.warn('db write failed', e) }
  }, 200)
}

export const store = {
  all() { return Object.values(db.subs) },
  upsertSub(subscription) {
    const ep = subscription.endpoint
    db.subs[ep] = db.subs[ep] || { subscription, items: [], notified: {} }
    db.subs[ep].subscription = subscription
    db.subs[ep].updatedAt = Date.now()
    persist()
  },
  setSchedule(endpoint, items, reminderHour) {
    const rec = db.subs[endpoint]
    if (!rec) return false
    rec.items = Array.isArray(items) ? items : []
    if (typeof reminderHour === 'number') rec.reminderHour = reminderHour
    rec.updatedAt = Date.now()
    persist(); return true
  },
  markNotified(endpoint, choreIds) {
    const rec = db.subs[endpoint]; if (!rec) return
    const now = Date.now()
    for (const id of choreIds) rec.notified[id] = now
    persist()
  },
  remove(endpoint) { delete db.subs[endpoint]; persist() },
  vaultPath: DATA_DIR
}

export function loadOrCreateVapid(webpush) {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY, source: 'env' }
  }
  const f = path.join(DATA_DIR, 'vapid.json')
  if (fs.existsSync(f)) return { ...JSON.parse(fs.readFileSync(f, 'utf8')), source: 'file' }
  const keys = webpush.generateVAPIDKeys()
  fs.writeFileSync(f, JSON.stringify(keys))
  return { ...keys, source: 'generated' }
}
