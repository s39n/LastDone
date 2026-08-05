import React, { useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import { IconPicker, ColorPicker } from './Pickers.jsx'
import { useStore } from '../lib/store.jsx'
import { permission, requestPermission, notifySupported, showReminder } from '../lib/notifications.js'

const EMOJI_PEOPLE = ['🙂','😎','🧑','👩','👨','🧒','👵','👴','🐱','🐶','⭐','🦊']

export default function Settings() {
  const { state, api } = useStore()
  const [catEdit, setCatEdit] = useState(null)
  const [personEdit, setPersonEdit] = useState(null)
  const [perm, setPerm] = useState(permission())
  const fileRef = useRef()

  const theme = state.settings.theme

  const doExport = () => {
    const blob = new Blob([api.exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `lastdone-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }
  const doImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { const data = JSON.parse(reader.result); if (data.chores) { api.importData(data); alert('Backup restored.') } else alert('Not a valid backup file.') }
      catch { alert('Could not read that file.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const askNotify = async () => {
    const r = await requestPermission()
    setPerm(r)
    api.setSettings({ notificationsEnabled: r === 'granted' })
    if (r === 'granted') showReminder({ title: 'Notifications on 🔔', body: 'You’ll get a nudge when chores go overdue.', tag: 'welcome' })
  }

  const cats = state.categories.filter(c => !c.parentId)

  return (
    <div className="p-4 space-y-6 pb-8">
      <Section title="Appearance">
        <div className="flex gap-2">
          {['system', 'light', 'dark'].map(t => (
            <button key={t} onClick={() => api.setSettings({ theme: t })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize ${theme === t ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Notifications">
        {!notifySupported() ? (
          <p className="text-sm text-slate-500">This browser doesn’t support notifications.</p>
        ) : perm === 'granted' ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Enabled — you’ll get a daily nudge for overdue chores.</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Remind me after</span>
              <select value={state.settings.reminderHour} onChange={e => api.setSettings({ reminderHour: +e.target.value })}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
            <button onClick={() => showReminder({ title: 'Test notification', body: 'This is how overdue nudges look.', tag: 'test' })}
              className="text-sm font-semibold text-blue-600">Send a test</button>
          </div>
        ) : perm === 'denied' ? (
          <p className="text-sm text-slate-500">Notifications are blocked in your browser settings. Re-enable them there to get overdue nudges.</p>
        ) : (
          <button onClick={askNotify} className="w-full py-2.5 rounded-xl font-semibold text-white bg-blue-600">Enable overdue notifications</button>
        )}
        <p className="text-xs text-slate-400 mt-2">Works while the app is open or recently backgrounded. Background push (fires even when closed) arrives in a future update.</p>
      </Section>

      <Section title="People" action={<button onClick={() => setPersonEdit({})} className="text-sm font-semibold text-blue-600">+ Add</button>}>
        <div className="space-y-1.5">
          {state.people.map(p => (
            <button key={p.id} onClick={() => setPersonEdit(p)} className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-xl">{p.emoji}</span>
              <span className="flex-1 text-left font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
              <span className="w-4 h-4 rounded-full" style={{ background: p.color }} />
            </button>
          ))}
          {state.people.length === 0 && <p className="text-sm text-slate-400">No people yet. Add household members to assign chores.</p>}
        </div>
      </Section>

      <Section title="Categories" action={<button onClick={() => setCatEdit({})} className="text-sm font-semibold text-blue-600">+ Add</button>}>
        <div className="space-y-1.5">
          {cats.map(c => (
            <button key={c.id} onClick={() => setCatEdit(c)} className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5">
              <span className="text-xl">{c.icon}</span>
              <span className="flex-1 text-left font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
              <span className="w-4 h-4 rounded-full" style={{ background: c.color }} />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Your data">
        <p className="text-xs text-slate-500 mb-3">Everything lives on this device. Back up or move it whenever you like.</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={doExport} className="py-2.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Export backup</button>
          <button onClick={() => fileRef.current?.click()} className="py-2.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Restore</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={doImport} className="hidden" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button onClick={() => { if (confirm('Reset to demo data? Your current chores will be replaced.')) api.resetAll() }}
            className="py-2.5 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">Load demo</button>
          <button onClick={() => { if (confirm('Erase ALL chores and history? This cannot be undone.')) api.wipeAll() }}
            className="py-2.5 rounded-xl font-semibold bg-red-50 dark:bg-red-950/40 text-red-600">Erase all</button>
        </div>
      </Section>

      <p className="text-center text-xs text-slate-400 pt-2">Last Done Tracker · offline PWA · v0.1</p>

      {catEdit && <CategoryEditor cat={catEdit} onClose={() => setCatEdit(null)} />}
      {personEdit && <PersonEditor person={personEdit} onClose={() => setPersonEdit(null)} />}
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function CategoryEditor({ cat, onClose }) {
  const { api } = useStore()
  const isEdit = !!cat.id
  const [name, setName] = useState(cat.name || '')
  const [icon, setIcon] = useState(cat.icon || '📋')
  const [color, setColor] = useState(cat.color || '#3b82f6')
  const save = () => { if (!name.trim()) return; isEdit ? api.updateCategory({ id: cat.id, name: name.trim(), icon, color }) : api.addCategory({ name: name.trim(), icon, color }); onClose() }
  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 mb-3 outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <Sheet open onClose={onClose} title={isEdit ? 'Edit category' : 'New category'}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" className={inputCls} autoFocus />
      <label className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block">Icon</label>
      <div className="mb-3"><IconPicker value={icon} onChange={setIcon} /></div>
      <label className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block">Colour</label>
      <div className="mb-4"><ColorPicker value={color} onChange={setColor} /></div>
      <div className="flex gap-2">
        {isEdit && <button onClick={() => { if (confirm('Delete category? Its chores become uncategorised.')) { api.deleteCategory(cat.id); onClose() } }} className="px-4 py-3 rounded-xl font-semibold text-red-600 bg-red-50 dark:bg-red-950/40">Delete</button>}
        <button onClick={save} disabled={!name.trim()} className="flex-1 py-3 rounded-xl font-semibold text-white bg-blue-600 disabled:opacity-40">Save</button>
      </div>
    </Sheet>
  )
}

function PersonEditor({ person, onClose }) {
  const { api } = useStore()
  const isEdit = !!person.id
  const [name, setName] = useState(person.name || '')
  const [emoji, setEmoji] = useState(person.emoji || '🙂')
  const [color, setColor] = useState(person.color || '#3b82f6')
  const save = () => { if (!name.trim()) return; isEdit ? api.updatePerson({ id: person.id, name: name.trim(), emoji, color }) : api.addPerson({ name: name.trim(), emoji, color }); onClose() }
  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 mb-3 outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <Sheet open onClose={onClose} title={isEdit ? 'Edit person' : 'New person'}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={inputCls} autoFocus />
      <label className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block">Emoji</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {EMOJI_PEOPLE.map(e => <button key={e} onClick={() => setEmoji(e)} className={`text-xl w-9 h-9 rounded-lg ${emoji === e ? 'bg-blue-500 scale-110' : 'bg-slate-100 dark:bg-slate-800'}`}>{e}</button>)}
      </div>
      <label className="text-xs font-semibold uppercase text-slate-500 mb-1.5 block">Colour</label>
      <div className="mb-4"><ColorPicker value={color} onChange={setColor} /></div>
      <div className="flex gap-2">
        {isEdit && <button onClick={() => { api.deletePerson(person.id); onClose() }} className="px-4 py-3 rounded-xl font-semibold text-red-600 bg-red-50 dark:bg-red-950/40">Delete</button>}
        <button onClick={save} disabled={!name.trim()} className="flex-1 py-3 rounded-xl font-semibold text-white bg-blue-600 disabled:opacity-40">Save</button>
      </div>
    </Sheet>
  )
}
