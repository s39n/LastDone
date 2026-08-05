import React, { useMemo } from 'react'
import Heatmap from './Heatmap.jsx'
import { useStore } from '../lib/store.jsx'
import { STATE, stateOf, relative, DAY_MS } from '../lib/dates.js'

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
    return { overdue, due, fresh, last7, last30, total: state.completions.length }
  }, [active, state.completions, lastDoneMap, now])

  // streak: consecutive days (back from today) with >=1 completion
  const streak = useMemo(() => {
    const days = new Set(state.completions.map(d => { const x = new Date(d.ts); x.setHours(0,0,0,0); return x.getTime() }))
    let s = 0; const cur = new Date(); cur.setHours(0,0,0,0)
    // allow today to be empty without breaking (grace)
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
    <div className="p-4 space-y-5">
      <section>
        <h2 className="text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">Activity</h2>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 ring-1 ring-slate-100 dark:ring-slate-800">
          <Heatmap completions={state.completions} />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Card label="Day streak" value={streak} accent="#22c55e" />
        <Card label="Done · 7d" value={stats.last7} accent="#3b82f6" />
        <Card label="Done · 30d" value={stats.last30} accent="#8b5cf6" />
        <Card label="Overdue" value={stats.overdue} accent="#ef4444" />
        <Card label="Due soon" value={stats.due} accent="#f59e0b" />
        <Card label="On track" value={stats.fresh} accent="#22c55e" />
      </div>

      <section>
        <h2 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">Most kept up</h2>
        <div className="space-y-1.5">
          {topChores.map(({ c, n }) => (
            <div key={c.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl px-3 py-2.5 ring-1 ring-slate-100 dark:ring-slate-800">
              <span className="text-xl">{c.icon}</span>
              <span className="flex-1 font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</span>
              <span className="text-sm font-bold text-slate-500">{n}×</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Card({ label, value, accent }) {
  return (
    <div className="rounded-2xl p-3 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900">
      <div className="text-2xl font-extrabold" style={{ color: accent }}>{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
