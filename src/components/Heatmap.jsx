import React, { useMemo } from 'react'
import { dayKey, DAY_MS } from '../lib/dates.js'

// Contribution heatmap of completions over the last ~26 weeks (accent monochrome ramp).
export default function Heatmap({ completions, weeks = 26 }) {
  const { grid, max, monthLabels } = useMemo(() => {
    const counts = {}
    for (const d of completions) { const k = dayKey(d.ts); counts[k] = (counts[k] || 0) + 1 }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const end = new Date(today); end.setDate(end.getDate() + (6 - end.getDay()))
    const cols = []; let max = 1; const monthLabels = []; let lastMonth = -1
    for (let w = 0; w < weeks; w++) {
      const col = []
      for (let dow = 0; dow < 7; dow++) {
        const idx = (weeks - 1 - w) * 7 + (6 - dow)
        const date = new Date(end.getTime() - idx * DAY_MS)
        const count = counts[dayKey(date.getTime())] || 0
        if (count > max) max = count
        col.push({ date, count, future: date.getTime() > today.getTime() })
      }
      const m = col[0].date.getMonth()
      if (m !== lastMonth) { monthLabels.push({ w, label: col[0].date.toLocaleString(undefined, { month: 'short' }) }); lastMonth = m }
      cols.push(col)
    }
    return { grid: cols, max, monthLabels }
  }, [completions, weeks])

  return (
    <div className="overflow-x-auto no-scrollbar" style={{ color: 'var(--accent)' }}>
      <div className="inline-block">
        <div className="flex gap-[3px] mb-1.5 font-mono text-[9px] text-faint">
          {grid.map((_, w) => { const lab = monthLabels.find(m => m.w === w); return <div key={w} className="w-[13px]">{lab ? lab.label : ''}</div> })}
        </div>
        <div className="flex gap-[3px]">
          {grid.map((col, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {col.map((cell, i) => {
                const t = cell.count === 0 ? 0 : 0.25 + 0.75 * Math.min(1, cell.count / max)
                return (
                  <div key={i} title={`${cell.date.toLocaleDateString()} · ${cell.count} done`}
                    className="w-[13px] h-[13px] rounded-[3px]"
                    style={cell.future ? { background: 'transparent' }
                      : cell.count === 0 ? { background: 'var(--inset)', border: '1px solid var(--line)' }
                      : { background: 'currentColor', opacity: t }} />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
