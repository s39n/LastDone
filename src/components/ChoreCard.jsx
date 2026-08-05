import React, { useState } from 'react'
import { STATE, stateOf, progress, colorFor, rgb, relative, cadenceLabel, dueAt } from '../lib/dates.js'

const STATE_LABEL = {
  [STATE.FRESH]: 'Done', [STATE.SOON]: 'Soon', [STATE.DUE]: 'Due',
  [STATE.OVERDUE]: 'Overdue', [STATE.UNTIMED]: '', [STATE.DORMANT]: 'Off-season'
}

export default function ChoreCard({ chore, lastDone, now, person, onComplete, onOpen }) {
  const [pop, setPop] = useState(false)
  const p = progress(lastDone, chore.cadenceDays, now)
  const st = stateOf(chore, lastDone, now)
  const c = colorFor(st, p)
  const due = dueAt(lastDone, chore.cadenceDays)

  const handleDone = (e) => {
    e.stopPropagation()
    setPop(true)
    setTimeout(() => setPop(false), 300)
    onComplete(chore.id)
  }

  const barPct = p == null ? 0 : Math.max(4, Math.min(100, p * 100))

  return (
    <div
      onClick={() => onOpen(chore)}
      className={`relative overflow-hidden rounded-2xl p-3.5 cursor-pointer select-none transition-transform active:scale-[0.98] ${pop ? 'animate-pop' : ''}`}
      style={{
        background: rgb(c, 0.10),
        boxShadow: `inset 0 0 0 1.5px ${rgb(c, 0.35)}`
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none mt-0.5 w-9 h-9 grid place-items-center rounded-xl shrink-0"
             style={{ background: rgb(c, 0.16) }}>
          <span>{chore.icon || '✅'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{chore.name}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 truncate">
            {lastDone ? relative(lastDone, now) : 'never done'}
            {chore.cadenceDays ? <span className="text-slate-400 dark:text-slate-500"> · {cadenceLabel(chore.cadenceDays)}</span> : null}
          </div>
        </div>
        <button
          onClick={handleDone}
          aria-label="Mark done"
          className="shrink-0 w-11 h-11 rounded-full grid place-items-center text-white text-lg font-bold shadow-sm active:scale-90 transition-transform"
          style={{ background: rgb(c) }}
        >✓</button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {st !== STATE.UNTIMED && (
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: rgb(c, 0.15) }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: rgb(c) }} />
          </div>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {person && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: (person.color || '#64748b') + '22', color: person.color || '#64748b' }}>
              {person.emoji} {person.name}
            </span>
          )}
          {STATE_LABEL[st] && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: rgb(c) }}>
              {STATE_LABEL[st]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
