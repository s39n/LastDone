import React, { useState } from 'react'
import Sheet from './Sheet.jsx'
import { IconPicker, MONTHS } from './Pickers.jsx'
import { CADENCE_PRESETS } from '../lib/dates.js'
import { useStore } from '../lib/store.jsx'

export default function AddEditChore({ open, onClose, editing, defaultCategoryId }) {
  const { state, api } = useStore()
  const isEdit = !!editing
  const [name, setName] = useState(editing?.name || '')
  const [icon, setIcon] = useState(editing?.icon || '✅')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? defaultCategoryId ?? (state.categories[0]?.id || null))
  const [cadenceDays, setCadenceDays] = useState(editing?.cadenceDays ?? 7)
  const [customDays, setCustomDays] = useState(editing?.cadenceDays && !CADENCE_PRESETS.some(p => p.days === editing.cadenceDays) ? String(editing.cadenceDays) : '')
  const [personId, setPersonId] = useState(editing?.personId || null)
  const [note, setNote] = useState(editing?.note || '')
  const [seasonal, setSeasonal] = useState(!!editing?.season)
  const [season, setSeason] = useState(editing?.season || { start: 11, end: 2 })

  // reset local state when opening a different chore
  React.useEffect(() => {
    if (!open) return
    setName(editing?.name || ''); setIcon(editing?.icon || '✅')
    setCategoryId(editing?.categoryId ?? defaultCategoryId ?? (state.categories[0]?.id || null))
    setCadenceDays(editing?.cadenceDays ?? 7)
    setCustomDays(editing?.cadenceDays && !CADENCE_PRESETS.some(p => p.days === editing.cadenceDays) ? String(editing.cadenceDays) : '')
    setPersonId(editing?.personId || null); setNote(editing?.note || '')
    setSeasonal(!!editing?.season); setSeason(editing?.season || { start: 11, end: 2 })
  }, [open, editing]) // eslint-disable-line

  const save = () => {
    if (!name.trim()) return
    const finalCadence = customDays ? Math.max(1, parseInt(customDays, 10) || 0) || null : cadenceDays
    const payload = {
      name: name.trim(), icon, categoryId, cadenceDays: finalCadence,
      personId, note: note.trim(), season: seasonal ? season : null
    }
    if (isEdit) api.updateChore({ id: editing.id, ...payload })
    else api.addChore(payload)
    onClose()
  }

  const cats = state.categories.filter(c => !c.parentId)
  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500'
  const labelCls = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5 block'

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Edit chore' : 'New chore'}>
      <div className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="text-4xl w-16 h-16 grid place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">{icon}</div>
          <div className="flex-1">
            <label className={labelCls}>Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Water the plants" className={inputCls}
              onKeyDown={e => { if (e.key === 'Enter') save() }} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Icon</label>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        <div>
          <label className={labelCls}>Category</label>
          <select value={categoryId || ''} onChange={e => setCategoryId(e.target.value || null)} className={inputCls}>
            <option value="">Uncategorised</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>How often?</label>
          <div className="flex flex-wrap gap-1.5">
            {CADENCE_PRESETS.map(p => (
              <button key={p.label} type="button"
                onClick={() => { setCadenceDays(p.days); setCustomDays('') }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${!customDays && cadenceDays === p.days ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-slate-500">or every</span>
            <input type="number" min="1" value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder="N"
              className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-center" />
            <span className="text-sm text-slate-500">days</span>
          </div>
        </div>

        {state.people.length > 0 && (
          <div>
            <label className={labelCls}>Assigned to</label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setPersonId(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${!personId ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                Anyone
              </button>
              {state.people.map(p => (
                <button key={p.id} type="button" onClick={() => setPersonId(p.id)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition"
                  style={personId === p.id ? { background: p.color, color: '#fff' } : { background: (p.color || '#64748b') + '22', color: p.color }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={seasonal} onChange={e => setSeasonal(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Seasonal (only counts part of the year)</span>
          </label>
          {seasonal && (
            <div className="mt-2 flex items-center gap-2">
              <select value={season.start} onChange={e => setSeason({ ...season, start: +e.target.value })} className={inputCls + ' flex-1'}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <span className="text-slate-500 text-sm">to</span>
              <select value={season.end} onChange={e => setSeason({ ...season, end: +e.target.value })} className={inputCls + ' flex-1'}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Anything to remember…" className={inputCls} />
        </div>

        <div className="flex gap-2 pt-1">
          {isEdit && (
            <button onClick={() => { api.deleteChore(editing.id); onClose() }}
              className="px-4 py-3 rounded-xl font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100">Delete</button>
          )}
          <button onClick={save} disabled={!name.trim()}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
            {isEdit ? 'Save changes' : 'Add chore'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
