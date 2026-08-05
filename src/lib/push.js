// Web Push client. Talks to the self-hosted push backend (see /server).
// Configure the backend URL at build time via VITE_PUSH_URL, else same-origin '/push'.
const BASE = (import.meta.env && import.meta.env.VITE_PUSH_URL) || '/push'

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function getReg() {
  return (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready)
}

export async function subscribeToPush() {
  if (!pushSupported()) return { ok: false, reason: 'This browser does not support push.' }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'Notifications permission denied.' }
  let key
  try {
    const r = await fetch(`${BASE}/vapidPublicKey`)
    if (!r.ok) throw new Error('backend')
    key = (await r.json()).publicKey
  } catch { return { ok: false, reason: 'Push backend not reachable. Start the server in /server (see README).' } }
  const reg = await getReg()
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
  await fetch(`${BASE}/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub }) })
  return { ok: true, subscription: sub }
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return { ok: true }
  const reg = await getReg()
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    try { await fetch(`${BASE}/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }) } catch {}
    await sub.unsubscribe()
  }
  return { ok: true }
}

// Push a compact due-schedule (id, name, dueAt) to the server so it can remind when the app is closed.
export async function syncSchedule(items) {
  if (!pushSupported()) return
  const reg = await getReg()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  try {
    await fetch(`${BASE}/schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, items }) })
  } catch {}
}

export async function isPushActive() {
  if (!pushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  return !!(await reg.pushManager.getSubscription())
}
