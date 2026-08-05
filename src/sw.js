/* Custom service worker: offline precache + Web Push (phase 2). */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

self.skipWaiting()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST || [])

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Receive a push from the backend and show an overdue reminder.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: 'Last Done', body: event.data && event.data.text() } }
  const title = data.title || 'Chores are overdue'
  const options = {
    body: data.body || 'You have overdue chores.',
    tag: data.tag || 'overdue-summary',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { choreId: data.choreId || null, url: data.url || '/' },
    actions: data.choreId ? [{ action: 'done', title: 'Done' }] : []
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Tap the notification (or its "Done" action) → focus/open the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const choreId = event.notification.data && event.notification.data.choreId
  const markDone = event.action === 'done' && choreId
  const target = markDone ? `/?done=${encodeURIComponent(choreId)}` : (event.notification.data?.url || '/')
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) {
        await c.focus()
        if (markDone) c.postMessage({ type: 'COMPLETE_CHORE', choreId })
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target)
  })())
})
