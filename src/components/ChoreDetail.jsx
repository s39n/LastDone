import React, { useState } from 'react'
import Sheet from './Sheet.jsx'
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
          <div className="text-3xl w-14 h-14 grid place-items-center rounded-2xl" style={{ background: rgb(c, 0.16) }}>{chore.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{chore.name}</div>
            <div className="text-sm text-slate-500">
              {cat ? `${cat.icon} ${cat.name}` : 'Uncategorised'}
              {chore.cadenceDays ? ` · ${cadenceLabel(chore.cadenceDays)}` : ' · no schedule'}
            </div>
          </div>
          <button onClick={() => onEdit(chore)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Edit</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Last done" value={lastDone ? relative(lastDone, now) : 'never'} sub={lastDone ? fullDate(lastDone) : ''} c={c} />
          <Stat label={st === STATE.OVERDUE ? 'Overdue by' : 'Due'} value={due ? relative(due, now) : '—'} sub={due ? fullDate(due) : 'no schedule'} c={c} />
        </div>

        <div className="mt-4">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note to this completion…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 mb-2 outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={doComplete}
            className="w-full py-3.5 rounded-xl font-bold text-white text-lg active:scale-[0.98] transition" style={{ background: rgb(c) }}>
            ✓ Mark done now
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">History <span className="text-slate-400 font-normal">· {history.length}</span></h3>
            {person && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: (person.color||'#64748b')+'22', color: person.color }}>{person.emoji} {person.name}</span>}
          </div>
          {history.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No completions yet. Tap “Mark done” when you do it.</p>}
          <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: rgb(c) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-slate-700 dark:text-slate-300">{fullDate(h.ts)}</div>
                  {h.note && <div className="text-slate-500 text-xs truncate">“{h.note}”</div>}
                </div>
                <span className="text-slate-400 text-xs shrink-0">{relative(h.ts, now)}</span>
                <button onClick={() => api.deleteCompletion(h.id)} className="text-slate-300 hover:text-red-500 shrink-0" aria-label="Remove">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={() => { api.archiveChore(chore.id); onClose() }}
            className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
            {chore.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button onClick={() => { if (confirm('Delete this chore and its history?')) { api.deleteChore(chore.id); onClose() } }}
            className="flex-1 py-2.5 rounded-xl font-semibold text-red-600 bg-red-50 dark:bg-red-950/40">Delete</button>
        </div>
      </div>
    </Sheet>
  )
}

function Stat({ label, value, sub, c }) {
  return (
    <div className="rounded-xl p-3" style={{ background: rgb(c, 0.10) }}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-500 truncate">{sub}</div>}
    </div>
  )
}
