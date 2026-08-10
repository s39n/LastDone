import React, { useEffect, useRef, useState } from 'react'
import { Plus, ChevronRight, Download, Upload, Bell, Send, Eraser, Cloud, RefreshCw, Copy } from 'lucide-react'
import { validCode, randomCode } from '../lib/sync.js'
import Sheet from './Sheet.jsx'
import { IconPicker, ColorPicker, Avatar } from './Pickers.jsx'
import { Icon } from '../lib/icons.jsx'
import { useStore } from '../lib/store.jsx'
import { permission, requestPermission, notifySupported, showReminder } from '../lib/notifications.js'
import { pushSupported, subscribeToPush, unsubscribeFromPush, isPushActive } from '../lib/push.js'

const input = 'w-full rounded-lg border border-line bg-inset px-3 py-2.5 text-[14px] text-ink placeholder:text-faint outline-none focus:border-accent'
const lbl = 'text-[11px] font-medium uppercase tracking-wide text-faint mb-1.5 block'

export default function Settings() {
  const { state, api } = useStore()
  const [catEdit, setCatEdit] = useState(null)
  const [personEdit, setPersonEdit] = useState(null)
  const [perm, setPerm] = useState(permission())
  const [pushOn, setPushOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [codeInput, setCodeInput] = useState(state.settings.syncCode || '')
  const fileRef = useRef()

  useEffect(() => { isPushActive().then(setPushOn) }, [])
  useEffect(() => { setCodeInput(state.settings.syncCode || '') }, [state.settings.syncCode])

  const syncOn = state.settings.syncEnabled && !!state.settings.syncCode
  const toggleSync = () => {
    if (syncOn) { api.setSettings({ syncEnabled: false }); return }
    const code = codeInput.trim()
    if (!validCode(code)) { alert('Enter a sync code: 4–64 letters, numbers, - or _ (or tap Generate).'); return }
    api.setSettings({ syncEnabled: true, syncCode: code })
  }

  const theme = state.settings.theme

  const doExport = () => {
    const blob = new Blob([api.exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `lastdone-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const doImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { try { const d = JSON.parse(reader.result); if (d.chores) { api.importData(d); alert('Backup restored.') } else alert('Not a valid backup file.') } catch { alert('Could not read that file.') } }
    reader.readAsText(file); e.target.value = ''
  }

  const askNotify = async () => {
    const r = await requestPermission(); setPerm(r)
    api.setSettings({ notificationsEnabled: r === 'granted' })
    if (r === 'granted') showReminder({ title: 'Notifications on', body: 'You’ll get a nudge when chores go overdue.', tag: 'welcome' })
  }

  const togglePush = async () => {
    setBusy(true)
    try {
      if (pushOn) { await unsubscribeFromPush(); setPushOn(false); api.setSettings({ pushEnabled: false }) }
      else {
        const res = await subscribeToPush()
        if (res.ok) { setPushOn(true); api.setSettings({ pushEnabled: true, notificationsEnabled: true }); setPerm('granted') }
        else alert(res.reason)
      }
    } finally { setBusy(false) }
  }

  const cats = state.categories.filter(c => !c.parentId)

  return (
    <div className="p-4 space-y-7 pb-10">
      <Section title="Appearance">
        <div className="flex gap-1.5">
          {['system', 'light', 'dark'].map(t => (
            <button key={t} onClick={() => api.setSettings({ theme: t })}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium capitalize border transition-colors ${theme === t ? 'border-accent text-accent bg-accent-soft' : 'border-line text-muted hover:border-line-strong'}`}>{t}</button>
          ))}
        </div>
      </Section>

      <Section title="Notifications">
        <div className="border border-line rounded-lg divide-y divide-line overflow-hidden">
          <Row icon={<Bell size={16} />} title="Overdue reminders" sub={
            !notifySupported() ? 'Not supported in this browser'
            : perm === 'granted' ? 'On — a daily nudge while the app is open'
            : perm === 'denied' ? 'Blocked in browser settings' : 'Off'}>
            {notifySupported() && perm !== 'granted' && perm !== 'denied' &&
              <button onClick={askNotify} className="text-[13px] font-medium text-accent">Enable</button>}
            {perm === 'granted' && <button onClick={() => showReminder({ title: 'Test notification', body: 'This is how overdue nudges look.', tag: 'test' })} className="text-[13px] font-medium text-muted flex items-center gap-1"><Send size={13} /> Test</button>}
          </Row>

          {perm === 'granted' && (
            <Row title="Remind me after">
              <select value={state.settings.reminderHour} onChange={e => api.setSettings({ reminderHour: +e.target.value })}
                className="rounded-md border border-line bg-inset px-2 py-1 text-[13px] font-mono tnum text-ink outline-none focus:border-accent">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
              </select>
            </Row>
          )}

          {pushSupported() && (
            <Row icon={<Bell size={16} />} title="Background push" sub={pushOn ? 'On — reminders fire even when closed' : 'Fires overdue reminders when the app is closed'}>
              <button onClick={togglePush} disabled={busy}
                className={`relative w-10 h-6 rounded-full transition-colors ${pushOn ? 'bg-accent' : 'bg-line-strong'} disabled:opacity-50`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${pushOn ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </Row>
          )}
        </div>
        <p className="text-[11px] text-faint mt-2 leading-relaxed">Background push needs the self-hosted server in <span className="font-mono">/server</span>. Local reminders work with no server while the app is open.</p>
      </Section>

      <Section title="People" action={<AddBtn onClick={() => setPersonEdit({})} />}>
        <List>
          {state.people.map(p => (
            <ListRow key={p.id} onClick={() => setPersonEdit(p)}>
              <Avatar person={p} size={22} />
              <span className="flex-1 text-[13px] font-medium text-ink">{p.name}</span>
              <ChevronRight size={15} className="text-faint" />
            </ListRow>
          ))}
          {state.people.length === 0 && <Blank>Add household members to assign chores.</Blank>}
        </List>
      </Section>

      <Section title="Categories" action={<AddBtn onClick={() => setCatEdit({})} />}>
        <List>
          {cats.map(c => (
            <ListRow key={c.id} onClick={() => setCatEdit(c)}>
              <span style={{ color: c.color }}><Icon name={c.icon} size={17} /></span>
              <span className="flex-1 text-[13px] font-medium text-ink">{c.name}</span>
              <ChevronRight size={15} className="text-faint" />
            </ListRow>
          ))}
        </List>
      </Section>

      <Section title="Sync across devices">
        <div className="border border-line rounded-lg divide-y divide-line overflow-hidden">
          <Row icon={<Cloud size={16} />} title="Cross-device sync"
            sub={syncOn ? `On · code ${state.settings.syncCode}` : 'Off — data stays on this device only'}>
            <button onClick={toggleSync} aria-label="Toggle sync"
              className={`relative w-10 h-6 rounded-full transition-colors ${syncOn ? 'bg-accent' : 'bg-line-strong'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${syncOn ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </Row>
          <div className="flex items-center gap-2 bg-surface px-3 py-2.5">
            <input value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="sync code" disabled={syncOn}
              className="flex-1 rounded-md border border-line bg-inset px-2.5 py-1.5 text-[13px] font-mono text-ink outline-none focus:border-accent disabled:opacity-60" />
            {!syncOn && <button onClick={() => setCodeInput(randomCode())} className="text-muted hover:text-ink p-1" title="Generate"><RefreshCw size={15} /></button>}
            <button onClick={() => navigator.clipboard?.writeText(codeInput)} className="text-muted hover:text-ink p-1" title="Copy"><Copy size={15} /></button>
          </div>
        </div>
        <p className="text-[11px] text-faint mt-2 leading-relaxed">Enter the same code on each device to share your chores. Data is stored on your server under <span className="font-mono">DATA_PATH/sync</span>. It's last-write-wins, so link a new device before editing on it — the most recent save wins.</p>
      </Section>

      <Section title="Your data">
        <p className="text-[11px] text-faint mb-3 leading-relaxed">Everything lives on this device. Back up or move it whenever you like.</p>
        <div className="grid grid-cols-2 gap-2">
          <OutlineBtn onClick={doExport}><Download size={15} /> Export</OutlineBtn>
          <OutlineBtn onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore</OutlineBtn>
          <input ref={fileRef} type="file" accept="application/json" onChange={doImport} className="hidden" />
          <OutlineBtn onClick={() => { if (confirm('Reset to demo data? Your current chores will be replaced.')) api.resetAll() }}>Load demo</OutlineBtn>
          <button onClick={() => { if (confirm('Erase ALL chores and history? This cannot be undone.')) api.wipeAll() }}
            className="py-2.5 rounded-lg font-medium text-[13px] text-red-500 border border-line hover:border-red-500/40 transition-colors">Erase all</button>
        </div>
        <button onClick={() => { if (confirm('Clear all completion history? Your chores, categories, and people stay — every card resets to “never done” and the activity heatmap empties.')) api.clearAllHistory() }}
          className="mt-2 w-full py-2.5 rounded-lg font-medium text-[13px] text-muted border border-line hover:border-line-strong hover:text-ink transition-colors flex items-center justify-center gap-1.5">
          <Eraser size={15} /> Clear history (keep chores)
        </button>
        <p className="text-[11px] text-faint mt-2 leading-relaxed">Tip: “Clear history” wipes the demo’s sample completions but keeps the example chores, so you start fresh with your own tracking.</p>
      </Section>

      <p className="text-center text-[11px] text-faint pt-1">Last Done · offline PWA · v0.2</p>

      {catEdit && <CategoryEditor cat={catEdit} onClose={() => setCatEdit(null)} />}
      {personEdit && <PersonEditor person={personEdit} onClose={() => setPersonEdit(null)} />}
    </div>
  )
}

const Section = ({ title, children, action }) => (
  <section>
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-[11px] font-medium uppercase tracking-wide text-faint">{title}</h2>{action}
    </div>{children}
  </section>
)
const List = ({ children }) => <div className="border border-line rounded-lg divide-y divide-line overflow-hidden">{children}</div>
const ListRow = ({ children, onClick }) => <button onClick={onClick} className="w-full flex items-center gap-3 bg-surface px-3 py-2.5 hover:bg-inset transition-colors text-left">{children}</button>
const Blank = ({ children }) => <div className="bg-surface px-3 py-4 text-[13px] text-faint text-center">{children}</div>
const AddBtn = ({ onClick }) => <button onClick={onClick} className="text-[13px] font-medium text-accent flex items-center gap-1"><Plus size={14} /> Add</button>
const OutlineBtn = ({ children, onClick }) => <button onClick={onClick} className="py-2.5 rounded-lg font-medium text-[13px] text-muted border border-line hover:border-line-strong hover:text-ink transition-colors flex items-center justify-center gap-1.5">{children}</button>
function Row({ icon, title, sub, children }) {
  return (
    <div className="flex items-center gap-3 bg-surface px-3 py-2.5">
      {icon && <span className="text-muted shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-ink">{title}</div>{sub && <div className="text-[11px] text-faint mt-0.5">{sub}</div>}</div>
      {children}
    </div>
  )
}

function CategoryEditor({ cat, onClose }) {
  const { api } = useStore()
  const isEdit = !!cat.id
  const [name, setName] = useState(cat.name || ''); const [icon, setIcon] = useState(cat.icon || 'home'); const [color, setColor] = useState(cat.color || '#5b5bd6')
  const save = () => { if (!name.trim()) return; isEdit ? api.updateCategory({ id: cat.id, name: name.trim(), icon, color }) : api.addCategory({ name: name.trim(), icon, color }); onClose() }
  return (
    <Sheet open onClose={onClose} title={isEdit ? 'Edit category' : 'New category'}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" className={input + ' mb-3'} autoFocus />
      <label className={lbl}>Icon</label><div className="mb-3"><IconPicker value={icon} onChange={setIcon} /></div>
      <label className={lbl}>Colour</label><div className="mb-4"><ColorPicker value={color} onChange={setColor} /></div>
      <div className="flex gap-2">
        {isEdit && <button onClick={() => { if (confirm('Delete category? Its chores become uncategorised.')) { api.deleteCategory(cat.id); onClose() } }} className="px-3.5 py-2.5 rounded-lg font-medium text-[14px] text-red-500 border border-line hover:border-red-500/40">Delete</button>}
        <button onClick={save} disabled={!name.trim()} className="flex-1 py-2.5 rounded-lg font-medium text-[14px] text-white bg-accent disabled:opacity-40">Save</button>
      </div>
    </Sheet>
  )
}

function PersonEditor({ person, onClose }) {
  const { api } = useStore()
  const isEdit = !!person.id
  const [name, setName] = useState(person.name || ''); const [initials, setInitials] = useState(person.initials || ''); const [color, setColor] = useState(person.color || '#5b5bd6')
  const ini = (initials || name || '?').slice(0, 2).toUpperCase()
  const save = () => { if (!name.trim()) return; const payload = { name: name.trim(), initials: ini, color }; isEdit ? api.updatePerson({ id: person.id, ...payload }) : api.addPerson(payload); onClose() }
  return (
    <Sheet open onClose={onClose} title={isEdit ? 'Edit person' : 'New person'}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar person={{ initials: ini, color, name }} size={44} />
        <div className="flex-1"><label className={lbl}>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className={input} autoFocus /></div>
      </div>
      <label className={lbl}>Initials</label>
      <input value={initials} onChange={e => setInitials(e.target.value.slice(0,2))} placeholder={ini} maxLength={2} className={input + ' mb-3 uppercase font-mono w-24'} />
      <label className={lbl}>Colour</label><div className="mb-4"><ColorPicker value={color} onChange={setColor} /></div>
      <div className="flex gap-2">
        {isEdit && <button onClick={() => { api.deletePerson(person.id); onClose() }} className="px-3.5 py-2.5 rounded-lg font-medium text-[14px] text-red-500 border border-line hover:border-red-500/40">Delete</button>}
        <button onClick={save} disabled={!name.trim()} className="flex-1 py-2.5 rounded-lg font-medium text-[14px] text-white bg-accent disabled:opacity-40">Save</button>
      </div>
    </Sheet>
  )
}
