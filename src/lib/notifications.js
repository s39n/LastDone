// Notification layer.
//
// PHASE 1 (this build, offline): local Notifications API. We compute overdue
// chores in-app and, while the app/service-worker is alive, show a system
// notification. This covers "app open or recently backgrounded".
//
// PHASE 2 (later, when a push backend is added): the service worker will
// receive Web Push messages from the server and call the SAME renderReminder()
// shape below. registerForPush() is stubbed so the UI/flow already exists.

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permission() {
  return notifySupported() ? Notification.permission : 'unsupported'
}

export async function requestPermission() {
  if (!notifySupported()) return 'unsupported'
  try { return await Notification.requestPermission() }
  catch { return 'denied' }
}

// Show a notification now (via SW if available so actions work, else direct).
export async function showReminder({ title, body, tag, choreId }) {
  if (!notifySupported() || Notification.permission !== 'granted') return false
  const options = {
    body,
    tag: tag || `chore-${choreId}`,
    renotify: false,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { choreId },
    actions: [{ action: 'done', title: 'Done' }]
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) { await reg.showNotification(title, options); return true }
    }
    new Notification(title, options)
    return true
  } catch (e) { console.warn('notify failed', e) }
  return false
}

// Given overdue chores, fire one summary reminder per day (deduped in localStorage).
const LAST_KEY = 'lastdone.lastReminderDay'
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }

export async function maybeRemindOverdue(overdue, reminderHour = 9) {
  if (!overdue.length) return
  if (Notification.permission !== 'granted') return
  const hour = new Date().getHours()
  if (hour < reminderHour) return
  if (localStorage.getItem(LAST_KEY) === todayKey()) return
  localStorage.setItem(LAST_KEY, todayKey())
  const first = overdue[0]
  const extra = overdue.length - 1
  await showReminder({
    title: overdue.length === 1 ? 'One chore is overdue' : `${overdue.length} chores are overdue`,
    body: extra > 0 ? `${first.icon} ${first.name} + ${extra} more` : `${first.icon} ${first.name}`,
    tag: 'overdue-summary'
  })
}

// --- Phase 2 stub: wire a VAPID public key + backend endpoint here later. ---
export async function registerForPush() {
  return { ok: false, reason: 'Push backend not configured yet (phase 2). Local notifications are active.' }
}
