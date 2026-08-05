import React, { useMemo } from 'react'
import { dayKey, DAY_MS } from '../lib/dates.js'

// GitHub-style contribution heatmap of completions over the last ~26 weeks.
export default function Heatmap({ completions, weeks = 26 }) {
  const { grid, max, monthLabels } = useMemo(() => {
    const counts = {}
    for (const d of completions) {
      const k = dayKey(d.ts)
      counts[k] = (counts[k] || 0) + 1
    }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    // align end to end-of-week (Saturday)
    const end = new Date(today)
    end.setDate(end.getDate() + (6 - end.getDay()))
    const totalDays = weeks * 7
    const cols = []
    let max = 1
    const monthLabels = []
    let lastMonth = -1
    for (let w = 0; w < weeks; w++) {
      const col = []
      for (let dow = 0; dow < 7; dow++) {
        const idx = (weeks - 1 - w) * 7 + (6 - dow)
        const date = new Date(end.getTime() - idx * DAY_MS)
        const k = dayKey(date.getTime())
        const count = counts[k] || 0
        if (count > max) max = count
        col.push({ date, count, future: date.getTime() > today.getTime() })
      }
      const m = col[0].date.getMonth()
      if (m !== lastMonth) { monthLabels.push({ w, label: col[0].date.toLocaleString(undefined, { month: 'short' }) }); lastMonth = m }
      cols.push(col)
    }
    return { grid: cols, max, monthLabels }
  }, [completions, weeks])

  const shade = (count, future) => {
    if (future) return 'transparent'
    if (count === 0) return 'var(--hm-empty)'
    const t = Math.min(1, count / max)
    const g = Math.round(120 + t * 100)
    return `rgba(34, ${g}, 94, ${0.35 + t * 0.65})`
  }

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="inline-block" style={{ '--hm-empty': 'rgba(148,163,184,0.15)' }}>
        <div className="flex gap-[3px] mb-1 ml-0 text-[10px] text-slate-400">
          {grid.map((_, w) => {
            const lab = monthLabels.find(m => m.w === w)
            return <div key={w} className="w-[13px]">{lab ? lab.label : ''}</div>
          })}
        </div>
        <div className="flex gap-[3px]">
          {grid.map((col, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {col.map((cell, i) => (
                <div key={i} title={`${cell.date.toLocaleDateString()} · ${cell.count} done`}
                  className="w-[13px] h-[13px] rounded-[3px]"
                  style={{ background: shade(cell.count, cell.future) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
