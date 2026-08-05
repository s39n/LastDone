// Core date + cadence + color-state math for Last Done Tracker.

export const DAY_MS = 24 * 60 * 60 * 1000

export function now() { return Date.now() }

// Human-friendly "time ago" / "in X" formatting.
export function relative(ts, ref = Date.now()) {
  if (ts == null) return 'never'
  const diff = ref - ts
  const abs = Math.abs(diff)
  const past = diff >= 0
  const mins = Math.round(abs / 60000)
  const hours = Math.round(abs / 3600000)
  const days = Math.round(abs / DAY_MS)
  let str
  if (abs < 45000) str = 'just now'
  else if (mins < 60) str = `${mins}m`
  else if (hours < 24) str = `${hours}h`
  else if (days < 7) str = `${days}d`
  else if (days < 60) str = `${Math.round(days / 7)}w`
  else if (days < 730) str = `${Math.round(days / 30)}mo`
  else str = `${Math.round(days / 365)}y`
  if (str === 'just now') return str
  return past ? `${str} ago` : `in ${str}`
}

export function fullDate(ts) {
  if (ts == null) return '—'
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

export function dayKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Is a seasonal chore active right now? season = {start: 1-12, end: 1-12} inclusive.
// Supports wrap-around (e.g. start=11, end=2 = Nov..Feb).
export function inSeason(season, ref = Date.now()) {
  if (!season || season.start == null || season.end == null) return true
  const m = new Date(ref).getMonth() + 1
  const { start, end } = season
  if (start <= end) return m >= start && m <= end
  return m >= start || m <= end
}

// Progress fraction toward "due". 0 = just done, 1 = exactly due, >1 = overdue.
export function progress(lastDone, cadenceDays, ref = Date.now()) {
  if (!cadenceDays || cadenceDays <= 0) return null // no cadence -> untimed
  if (lastDone == null) return 2 // never done + has cadence -> treat as very overdue
  const elapsed = ref - lastDone
  return elapsed / (cadenceDays * DAY_MS)
}

// Returns due timestamp for a cadence chore.
export function dueAt(lastDone, cadenceDays) {
  if (!cadenceDays || lastDone == null) return null
  return lastDone + cadenceDays * DAY_MS
}

export const STATE = { FRESH: 'fresh', SOON: 'soon', DUE: 'due', OVERDUE: 'overdue', UNTIMED: 'untimed', DORMANT: 'dormant' }

export function stateOf(chore, lastDone, ref = Date.now()) {
  if (chore.season && !inSeason(chore.season, ref)) return STATE.DORMANT
  const p = progress(lastDone, chore.cadenceDays, ref)
  if (p == null) return STATE.UNTIMED
  if (p >= 1) return STATE.OVERDUE
  if (p >= 0.75) return STATE.DUE
  if (p >= 0.5) return STATE.SOON
  return STATE.FRESH
}

// Interpolated card color: green -> amber -> red as progress goes 0 -> 1(+).
// Returns an {bg, ring, text} set of rgb strings for inline styling.
function lerp(a, b, t) { return a + (b - a) * t }
function mix(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))]
}
const GREEN = [34, 197, 94]
const AMBER = [245, 158, 11]
const RED = [239, 68, 68]

export function colorFor(state, p) {
  if (state === STATE.UNTIMED) return [100, 116, 139]   // slate
  if (state === STATE.DORMANT) return [71, 85, 105]     // dim slate
  const t = Math.max(0, Math.min(1, p ?? 0))
  if (t <= 0.5) return mix(GREEN, AMBER, t / 0.5)
  if (t <= 1) return mix(AMBER, RED, (t - 0.5) / 0.5)
  return RED
}

export function rgb(c, a) { return a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})` }

// Cadence presets (label -> days). null = "no schedule / untimed".
export const CADENCE_PRESETS = [
  { label: 'No schedule', days: null },
  { label: 'Daily', days: 1 },
  { label: 'Every 2 days', days: 2 },
  { label: 'Weekly', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Every 3 months', days: 91 },
  { label: 'Every 6 months', days: 182 },
  { label: 'Yearly', days: 365 }
]

export function cadenceLabel(days) {
  if (!days) return 'No schedule'
  const found = CADENCE_PRESETS.find(c => c.days === days)
  if (found) return found.label
  if (days % 365 === 0) return `Every ${days / 365}y`
  if (days % 30 === 0) return `Every ${days / 30}mo`
  if (days % 7 === 0) return `Every ${days / 7}w`
  return `Every ${days}d`
}
