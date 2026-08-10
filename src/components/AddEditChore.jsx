import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { IconPicker, Avatar, MONTHS } from './Pickers.jsx'
import { Icon } from '../lib/icons.jsx'
import { CADENCE_PRESETS } from '../lib/dates.js'
import { useStore } from '../lib/store.jsx'

const input = 'w-full rounded-lg border border-line bg-inset px-3 py-2.5 text-[14px] text-ink placeholder:text-faint outline-none focus:border-accent'
const label = 'text-[11px] font-medium uppercase tracking-wide text-faint mb-1.5 block'
const tsToInput = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

export default function AddEditChore({ open, onClose, editing, defaultCategoryId }) {
  const { state, api } = useStore()
  const isEdit = !!editing
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('sparkles')
  const [categoryId, setCategoryId] = useState(null)
  const [cadenceDays, setCadenceDays] = useState(7)
  const [customDays, setCustomDays] = useState('')
  const [personId, setPersonId] = useState(null)
  const [note, setNote] = useState('')
  const [seasonal, setSeasonal] = useState(false)
  const [season, setSeason] = useState({ start: 11, end: 2 })
  const [startDate, setStartDate] = useState('') // yyyy-mm-dd, '' = starts now

  React.useEffect(() => {
    if (!open) return
    setName(editing?.name || ''); setIcon(editing?.icon || 'sparkles')
    setCategoryId(editing?.categoryId ?? defaultCategoryId ?? (state.categories[0]?.id || null))
    setCadenceDays(editing?.cadenceDays ?? 7)
    setCustomDays(editing?.cadenceDays && !CADENCE_PRESETS.some(p => p.days === editing.cadenceDays) ? String(editing.cadenceDays) : '')
    setPersonId(editing?.personId || null); setNote(editing?.note || '')
    setSeasonal(!!editing?.season); setSeason(editing?.season || { start: 11, end: 2 })
    setStartDate(editing?.startAt ? tsToInput(editing.startAt) : '')
  }, [open, editing]) // eslint-disable-line

  const save = () => {
    if (!name.trim()) return
    const finalCadence = customDays ? (Math.max(1, parseInt(customDays, 10) || 0) || null) : cadenceDays
    const startAt = startDate ? new Date(startDate + 'T00:00:00').getTime() : null
    const payload = { name: name.trim(), icon, categoryId, cadenceDays: finalCadence, personId, note: note.trim(), season: seasonal ? season : null, startAt }
    if (isEdit) api.updateChore({ id: editing.id, ...payload }); else api.addChore(payload)
    onClose()
  }

  const cats = state.categories.filter(c => !c.parentId)

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Edit chore' : 'New chore'}>
      <div className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="w-14 h-14 grid place-items-center rounded-lg border border-line text-accent shrink-0"><Icon name={icon} size={26} /></div>
          <div className="flex-1">
            <label className={label}>Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Water the plants" className={input}
              onKeyDown={e => { if (e.key === 'Enter') save() }} />
          </div>
        </div>

        <div><label className={label}>Icon</label><IconPicker value={icon} onChange={setIcon} /></div>

        <div>
          <label className={label}>Category</label>
          <select value={categoryId || ''} onChange={e => setCategoryId(e.target.value || null)} className={input}>
            <option value="">Uncategorised</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className={label}>How often</label>
          <div className="flex flex-wrap gap-1.5">
            {CADENCE_PRESETS.map(p => (
              <button key={p.label} type="button" onClick={() => { setCadenceDays(p.days); setCustomDays('') }}
                className={`px-2.5 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${!customDays && cadenceDays === p.days ? 'border-accent text-accent bg-accent-soft' : 'border-line text-muted hover:border-line-strong'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
            <span>or every</span>
            <input type="number" min="1" value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder="N"
              className="w-16 rounded-md border border-line bg-inset px-2 py-1.5 text-center font-mono tnum text-ink outline-none focus:border-accent" />
            <span>days</span>
          </div>
        </div>

        <div>
          <label className={label}>Starts on <span className="text-faint normal-case tracking-normal">· optional, for future events</span></label>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={input + ' flex-1'} />
            {startDate && <button type="button" onClick={() => setStartDate('')} className="text-[13px] font-medium text-faint hover:text-ink">Clear</button>}
          </div>
          <p className="text-[11px] text-faint mt-1.5">Leave blank to start now. Set a future date and it stays “scheduled” — not overdue — until then.</p>
        </div>

        {state.people.length > 0 && (
          <div>
            <label className={label}>Assigned to</label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setPersonId(null)}
                className={`px-2.5 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${!personId ? 'border-ink text-ink' : 'border-line text-muted hover:border-line-strong'}`}>Anyone</button>
              {state.people.map(p => (
                <button key={p.id} type="button" onClick={() => setPersonId(p.id)}
                  className={`px-2 py-1.5 rounded-md text-[13px] font-medium border flex items-center gap-1.5 transition-colors ${personId === p.id ? 'text-ink' : 'border-line text-muted hover:border-line-strong'}`}
                  style={personId === p.id ? { borderColor: p.color } : undefined}>
                  <Avatar person={p} size={17} /> {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={seasonal} onChange={e => setSeasonal(e.target.checked)} className="w-4 h-4 accent-accent" />
            <span className="text-[13px] font-medium text-ink">Seasonal — only counts part of the year</span>
          </label>
          {seasonal && (
            <div className="mt-2 flex items-center gap-2">
              <select value={season.start} onChange={e => setSeason({ ...season, start: +e.target.value })} className={input + ' flex-1'}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <span className="text-faint text-[13px]">to</span>
              <select value={season.end} onChange={e => setSeason({ ...season, end: +e.target.value })} className={input + ' flex-1'}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
        </div>

        <div><label className={label}>Note</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Anything to remember" className={input} /></div>

        <div className="flex gap-2 pt-1">
          {isEdit && (
            <button onClick={() => { api.deleteChore(editing.id); onClose() }}
              className="px-3.5 py-2.5 rounded-lg font-medium text-[14px] text-red-500 border border-line hover:border-red-500/40 transition-colors grid place-items-center"><Trash2 size={16} /></button>
          )}
          <button onClick={save} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-lg font-medium text-[14px] text-white bg-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
            {isEdit ? 'Save changes' : 'Add chore'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
