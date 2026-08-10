// Simple cross-device sync: the whole app state is stored as a plaintext JSON
// blob on the self-hosted server (under DATA_PATH/sync/<code>.json) and shared
// between devices by a user-chosen sync code. Conflict resolution is
// last-write-wins on the top-level `updatedAt` — whichever device saved most
// recently wins the whole blob. Fine for a single user across a couple devices.
const BASE = (import.meta.env && import.meta.env.VITE_SYNC_URL) || '/sync'

export function validCode(code) {
  return typeof code === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(code.trim())
}

export async function pull(code) {
  if (!validCode(code)) return { ok: false, reason: 'bad code' }
  try {
    const r = await fetch(`${BASE}/${encodeURIComponent(code.trim())}`)
    if (!r.ok) return { ok: false, reason: `server ${r.status}` }
    const { state } = await r.json()
    return { ok: true, state: state || null }
  } catch { return { ok: false, reason: 'unreachable' } }
}

export async function push(code, state) {
  if (!validCode(code)) return { ok: false, reason: 'bad code' }
  try {
    const r = await fetch(`${BASE}/${encodeURIComponent(code.trim())}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    })
    if (!r.ok) return { ok: false, reason: `server ${r.status}` }
    return { ok: true }
  } catch { return { ok: false, reason: 'unreachable' } }
}

export function randomCode() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)]
  return s
}
