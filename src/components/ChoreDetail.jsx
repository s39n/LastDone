import React, { useState } from 'react'
import { Check, Trash2, Archive, Pencil, X } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { Icon } from '../lib/icons.jsx'
import { Avatar } from './Pickers.jsx'
import { useStore } from '../lib/store.jsx'
import { relative, fullDate, cadenceLabel, dueAt, stateOf, progress, colorFor, rgb, STATE } from '../lib/dates.js'

export default function ChoreDetail({ chore, open, onClose, onEdit }) {
  const { state, api, lastDoneMap, now } = useStore()
  const [note, setNote] = useState('')
  if (!chore) return null

  const lastDone = lastDoneMap[chore.id]
  const p = progress(lastDone, chore.cadenceDays, now)
  const st = stateOf(chore, lastDone, now)
  const c = colorFor(st, p)
  const due = dueAt(lastDone, chore.cadenceDays)
  const person = state.people.find(x => x.id === chore.personId)
  const cat = state.categories.find(x => x.id === chore.categoryId)
  const history = state.completions.filter(d => d.choreId === chore.id).sort((a, b) => b.ts - a.ts)

  const doComplete = () => { api.complete(chore.id, { note: note.trim(), personId: chore.personId }); setNote('') }

  return (
    <Sheet open={open} onClose={onClose} title="">
      <div className="-mt-2">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 grid place-items-center rounded-lg border border-line text-ink shrink-0" style={{ color: rgb(c) }}>
            <Icon name={chore.icon} size={22} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold tracking-tight text-ink leading-tight">{chore.name}</div>
            <div className="text-[12px] text-muted mt-0.5">
              {cat ? cat.name : 'Uncategorised'}{chore.cadenceDays ? ` · ${cadenceLabel(chore.cadenceDays).toLowerCase()}` : ' · no schedule'}
            </div>
          </div>
          <button onClick={() => onEdit(chore)} className="w-8 h-8 grid place-items-center rounded-md border border-line text-muted hover:text-ink hover:border-line-strong transition-colors" aria-label="Edit"><Pencil size={15} /></button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Last done" value={lastDone ? relative(lastDone, now) : 'never'} sub={lastDone ? fullDate(lastDone) : '—'} c={c} />
          <Stat label={st === STATE.OVERDUE ? 'Overdue' : 'Next due'} value={due ? relative(due, now) : '—'} sub={due ? fullDate(due) : 'no schedule'} c={c} />
        </div>

        <div className="mt-4">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note to this completion"
            className="w-full rounded-lg border border-line bg-inset px-3 py-2.5 mb-2 text-[14px] text-ink placeholder:text-faint outline-none focus:border-accent" />
          <button onClick={doComplete}
            className="w-full py-3 rounded-lg font-medium text-[14px] text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-transform" style={{ background: rgb(c) }}>
            <Check size={17} strokeWidth={2.25} /> Mark done now
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-faint">History · <span className="font-mono tnum">{history.length}</span></h3>
            <div className="flex items-center gap-2.5">
              {person && <div className="flex items-center gap-1.5"><Avatar person={person} size={18} /><span className="text-[12px] text-muted">{person.name}</span></div>}
              {history.length > 0 && (
                <button onClick={() => { if (confirm(`Clear all history for “${chore.name}”?`)) api.clearChoreHistory(chore.id) }}
                  className="text-[12px] font-medium text-faint hover:text-red-500 transition-colors">Clear</button>
              )}
            </div>
          </div>
          {history.length === 0 && <p className="text-[13px] text-faint py-4 text-center">No completions yet.</p>}
          <div className="space-y-px max-h-56 overflow-y-auto no-scrollbar rounded-lg border border-line divide-y divide-line">
            {history.map(h => (
              <div key={h.id} className="group flex items-center gap-2.5 text-[13px] px-3 py-2 bg-surface">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: rgb(c) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-ink">{fullDate(h.ts)}</div>
                  {h.note && <div className="text-muted text-[12px] truncate">“{h.note}”</div>}
                </div>
                <span className="font-mono text-[11px] text-faint tnum shrink-0">{relative(h.ts, now)}</span>
                <button onClick={() => api.deleteCompletion(h.id)} className="text-faint hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={() => { api.archiveChore(chore.id); onClose() }}
            className="flex-1 py-2.5 rounded-lg font-medium text-[13px] text-muted border border-line hover:border-line-strong hover:text-ink transition-colors flex items-center justify-center gap-1.5">
            <Archive size={15} /> {chore.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button onClick={() => { if (confirm('Delete this chore and its history?')) { api.deleteChore(chore.id); onClose() } }}
            className="flex-1 py-2.5 rounded-lg font-medium text-[13px] text-red-500 border border-line hover:border-red-500/40 transition-colors flex items-center justify-center gap-1.5">
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function Stat({ label, value, sub, c }) {
  return (
    <div className="rounded-lg border border-line bg-inset px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-faint">{label}</div>
      <div className="text-[15px] font-semibold text-ink mt-0.5" style={{ color: rgb(c) }}>{value}</div>
      <div className="text-[11px] text-faint truncate mt-0.5">{sub}</div>
    </div>
  )
}
