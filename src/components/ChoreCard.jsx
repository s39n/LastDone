import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { Icon } from '../lib/icons.jsx'
import { Avatar } from './Pickers.jsx'
import { STATE, stateOf, progressFor, colorFor, rgb, relative, cadenceLabel } from '../lib/dates.js'

const LABEL = {
  [STATE.SCHEDULED]: 'scheduled', [STATE.FRESH]: 'on track', [STATE.SOON]: 'soon', [STATE.DUE]: 'due',
  [STATE.OVERDUE]: 'overdue', [STATE.UNTIMED]: '', [STATE.DORMANT]: 'off-season'
}

export default function ChoreCard({ chore, lastDone, now, person, onComplete, onOpen }) {
  const [pop, setPop] = useState(false)
  const p = progressFor(chore, lastDone, now)
  const st = stateOf(chore, lastDone, now)
  const c = colorFor(st, p)

  const handleDone = (e) => {
    e.stopPropagation()
    setPop(true); setTimeout(() => setPop(false), 280)
    onComplete(chore.id)
  }

  return (
    <div onClick={() => onOpen(chore)}
      className="group relative flex items-stretch bg-surface border border-line rounded-lg overflow-hidden cursor-pointer transition-colors hover:border-line-strong">
      <span className="w-[3px] shrink-0" style={{ background: rgb(c) }} aria-hidden="true" />
      <div className="flex items-center gap-3 flex-1 min-w-0 pl-3 pr-2.5 py-2.5">
        <span className="shrink-0 text-muted"><Icon name={chore.icon} size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-ink truncate leading-tight">{chore.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-[11px] tnum" style={{ color: rgb(c) }}>
              {st === STATE.SCHEDULED ? `starts ${relative(chore.startAt, now)}` : (lastDone ? relative(lastDone, now) : 'never done')}
            </span>
            {chore.cadenceDays ? <span className="text-[11px] text-faint">· {cadenceLabel(chore.cadenceDays).toLowerCase()}</span> : null}
          </div>
        </div>
        {person && <Avatar person={person} size={20} />}
        {LABEL[st] && (
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ color: rgb(c), background: rgb(c, 0.10) }}>{LABEL[st]}</span>
        )}
        <button onClick={handleDone} aria-label="Mark done"
          className={`shrink-0 w-9 h-9 rounded-md grid place-items-center border transition-all active:scale-90 ${pop ? 'animate-pop' : ''}`}
          style={{ borderColor: rgb(c, 0.5), color: rgb(c) }}>
          <Check size={17} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}
