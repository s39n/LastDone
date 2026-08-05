import React, { useMemo } from 'react'
import { Icon } from '../lib/icons.jsx'
import Heatmap from './Heatmap.jsx'
import { useStore } from '../lib/store.jsx'
import { STATE, stateOf, DAY_MS } from '../lib/dates.js'

export default function Stats() {
  const { state, lastDoneMap, now } = useStore()
  const active = state.chores.filter(c => !c.archived)

  const stats = useMemo(() => {
    let overdue = 0, due = 0, fresh = 0
    for (const ch of active) {
      const s = stateOf(ch, lastDoneMap[ch.id], now)
      if (s === STATE.OVERDUE) overdue++
      else if (s === STATE.DUE || s === STATE.SOON) due++
      else if (s === STATE.FRESH) fresh++
    }
    const last7 = state.completions.filter(d => d.ts > now - 7 * DAY_MS).length
    const last30 = state.completions.filter(d => d.ts > now - 30 * DAY_MS).length
    return { overdue, due, fresh, last7, last30 }
  }, [active, state.completions, lastDoneMap, now])

  const streak = useMemo(() => {
    const days = new Set(state.completions.map(d => { const x = new Date(d.ts); x.setHours(0,0,0,0); return x.getTime() }))
    let s = 0; const cur = new Date(); cur.setHours(0,0,0,0)
    if (!days.has(cur.getTime())) cur.setTime(cur.getTime() - DAY_MS)
    while (days.has(cur.getTime())) { s++; cur.setTime(cur.getTime() - DAY_MS) }
    return s
  }, [state.completions])

  const topChores = useMemo(() => {
    const counts = {}
    for (const d of state.completions) counts[d.choreId] = (counts[d.choreId] || 0) + 1
    return active.map(c => ({ c, n: counts[c.id] || 0 })).sort((a, b) => b.n - a.n).slice(0, 5)
  }, [active, state.completions])

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-faint mb-2.5">Activity</h2>
        <div className="bg-surface border border-line rounded-lg p-4">
          <Heatmap completions={state.completions} />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Day streak" value={streak} accent />
        <Metric label="Done · 7d" value={stats.last7} />
        <Metric label="Done · 30d" value={stats.last30} />
        <Metric label="Overdue" value={stats.overdue} tone="#e24b4a" />
        <Metric label="Due soon" value={stats.due} tone="#ef9f27" />
        <Metric label="On track" value={stats.fresh} tone="#639922" />
      </div>

      <section>
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-faint mb-2">Most kept up</h2>
        <div className="border border-line rounded-lg divide-y divide-line overflow-hidden">
          {topChores.map(({ c, n }) => (
            <div key={c.id} className="flex items-center gap-3 bg-surface px-3 py-2.5">
              <span className="text-muted"><Icon name={c.icon} size={17} /></span>
              <span className="flex-1 text-[13px] font-medium text-ink truncate">{c.name}</span>
              <span className="font-mono text-[12px] text-faint tnum">{n}×</span>
            </div>
          ))}
          {topChores.length === 0 && <div className="px-3 py-4 text-[13px] text-faint text-center bg-surface">No data yet.</div>}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, tone, accent }) {
  const color = tone || (accent ? 'var(--accent)' : 'var(--ink)')
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="font-mono text-[22px] font-medium tnum leading-none" style={{ color }}>{value}</div>
      <div className="text-[11px] text-muted mt-1.5">{label}</div>
    </div>
  )
}
