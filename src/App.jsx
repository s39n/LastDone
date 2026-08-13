import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Plus, ListChecks, Clock, BarChart3, Settings2, PartyPopper } from 'lucide-react'
import { useStore } from './lib/store.jsx'
import { Avatar } from './components/Pickers.jsx'
import ChoreCard from './components/ChoreCard.jsx'
import ChoreDetail from './components/ChoreDetail.jsx'
import AddEditChore from './components/AddEditChore.jsx'
import Stats from './components/Stats.jsx'
import Settings from './components/Settings.jsx'
import { STATE, stateOf, progressFor, dueFor } from './lib/dates.js'
import { maybeRemindOverdue } from './lib/notifications.js'
import { syncSchedule } from './lib/push.js'
import { pull as syncPull, push as syncPush } from './lib/sync.js'

const ORDER = { [STATE.OVERDUE]: 0, [STATE.DUE]: 1, [STATE.SOON]: 2, [STATE.FRESH]: 3, [STATE.UNTIMED]: 4, [STATE.SCHEDULED]: 5, [STATE.DORMANT]: 6 }

export default function App() {
  const { state, api, lastDoneMap, now } = useStore()
  const [tab, setTab] = useState('home')
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState(null)
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const didDeepLink = useRef(false)

  // theme
  useEffect(() => {
    const apply = () => {
      const t = state.settings.theme
      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [state.settings.theme])

  // deep link from a notification: ?done=<choreId> → complete it
  useEffect(() => {
    if (didDeepLink.current) return
    didDeepLink.current = true
    const params = new URLSearchParams(window.location.search)
    const id = params.get('done')
    if (id && state.chores.some(c => c.id === id)) {
      api.complete(id)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // eslint-disable-line

  // complete-from-notification while the app is already open (SW postMessage)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMsg = (e) => { if (e.data?.type === 'COMPLETE_CHORE' && e.data.choreId) api.complete(e.data.choreId) }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [api])

  const activePerson = state.people.find(p => p.id === state.settings.activePersonId) || null

  const decorated = useMemo(() => {
    return state.chores
      .filter(c => !c.archived)
      .filter(c => !activePerson || c.personId === activePerson.id)
      .filter(c => !activeCat || c.categoryId === activeCat)
      .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()))
      .map(c => ({ chore: c, lastDone: lastDoneMap[c.id], st: stateOf(c, lastDoneMap[c.id], now), p: progressFor(c, lastDoneMap[c.id], now) }))
      .sort((a, b) => (ORDER[a.st] - ORDER[b.st]) || ((b.p ?? -1) - (a.p ?? -1)) || a.chore.name.localeCompare(b.chore.name))
  }, [state.chores, activePerson, activeCat, query, lastDoneMap, now])

  const dueList = useMemo(() => decorated.filter(d => d.st === STATE.OVERDUE || d.st === STATE.DUE), [decorated])

  // local overdue reminders
  useEffect(() => {
    if (!state.settings.notificationsEnabled) return
    const run = () => maybeRemindOverdue(state.chores.filter(c => !c.archived).filter(c => stateOf(c, lastDoneMap[c.id], Date.now()) === STATE.OVERDUE), state.settings.reminderHour)
    run(); const id = setInterval(run, 60 * 60 * 1000); return () => clearInterval(id)
  }, [state.settings.notificationsEnabled, state.settings.reminderHour, state.chores, lastDoneMap])

  // sync compact due-schedule to push backend when background push is on
  useEffect(() => {
    if (!state.settings.pushEnabled) return
    const items = state.chores.filter(c => !c.archived)
      .map(c => ({ id: c.id, name: c.name, dueAt: dueFor(c, lastDoneMap[c.id]) }))
      .filter(x => x.dueAt)
    const t = setTimeout(() => syncSchedule(items), 800)
    return () => clearTimeout(t)
  }, [state.settings.pushEnabled, state.chores, lastDoneMap])

  // ── cross-device sync ──
  // Data-only (chores/history/people/categories); device-local settings never sync.
  // Linking a NEW device to a code DOWNLOADS the server copy (server wins) so a
  // fresh/erased device can't clobber your data. After linking, ongoing edits use
  // last-write-wins on the data `updatedAt`.
  const stateRef = useRef(state); stateRef.current = state
  const lastSyncedRef = useRef(0)
  const syncOn = state.settings.syncEnabled && !!state.settings.syncCode
  const syncCode = state.settings.syncCode
  const joinedCode = state.settings.syncJoinedCode

  const dataSlice = (s) => ({
    version: s.version, updatedAt: s.updatedAt || 0,
    people: s.people, categories: s.categories, chores: s.chores, completions: s.completions
  })

  // push local data up when it changes
  useEffect(() => {
    if (!syncOn) return
    const ver = state.updatedAt || 0
    if (ver <= lastSyncedRef.current) return
    const t = setTimeout(async () => {
      const r = await syncPush(syncCode, dataSlice(stateRef.current))
      if (r.ok) lastSyncedRef.current = stateRef.current.updatedAt || 0
    }, 900)
    return () => clearTimeout(t)
  }, [syncOn, syncCode, state.updatedAt])

  // pull on mount, focus, and every 15s. First contact with a code = JOIN (download).
  useEffect(() => {
    if (!syncOn) return
    let stopped = false
    const doPull = async () => {
      const r = await syncPull(syncCode)
      if (stopped || !r.ok) return
      const local = stateRef.current
      const joining = local.settings.syncJoinedCode !== syncCode
      if (r.state && (joining || (r.state.updatedAt || 0) > (local.updatedAt || 0))) {
        lastSyncedRef.current = r.state.updatedAt || 0
        api.mergeState(r.state)           // server wins on join, else newer wins
      } else if (joining && !r.state) {
        // establishing the code: seed the server from this device
        await syncPush(syncCode, dataSlice(local))
        lastSyncedRef.current = local.updatedAt || 0
      }
      if (joining) api.setSettings({ syncJoinedCode: syncCode })
    }
    doPull()
    const id = setInterval(doPull, 15000)
    const onFocus = () => doPull()
    window.addEventListener('focus', onFocus)
    return () => { stopped = true; clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [syncOn, syncCode, joinedCode, api])

  const cats = state.categories.filter(c => !c.parentId)
  const person = (ch) => state.people.find(p => p.id === ch.personId)
  const openDetail = (ch) => setDetail(ch)
  const openEdit = (ch) => { setDetail(null); setEditing(ch); setAddOpen(true) }
  const openAdd = () => { setEditing(null); setAddOpen(true) }

  const overdueCount = useMemo(() => state.chores.filter(c => !c.archived && stateOf(c, lastDoneMap[c.id], now) === STATE.OVERDUE).length, [state.chores, lastDoneMap, now])

  const title = tab === 'stats' ? 'Activity' : tab === 'settings' ? 'Settings' : tab === 'due' ? 'Due soon' : 'Last Done'

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur-md border-b border-line" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-3.5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[19px] font-semibold tracking-tightest leading-none">{title}</h1>
              {tab === 'home' && <p className="font-mono text-[11px] text-faint tnum mt-1">{decorated.length} tracked{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}</p>}
            </div>
            {state.people.length > 0 && (tab === 'home' || tab === 'due') && (
              <div className="flex items-center gap-1">
                <button onClick={() => api.setSettings({ activePersonId: null })}
                  className={`px-2 h-7 rounded-md text-[12px] font-medium border transition-colors ${!activePerson ? 'border-ink text-ink' : 'border-line text-faint hover:border-line-strong'}`}>All</button>
                {state.people.map(p => (
                  <button key={p.id} onClick={() => api.setSettings({ activePersonId: p.id })} title={p.name}>
                    <Avatar person={p} size={28} active={activePerson?.id === p.id} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {tab === 'home' && (
            <>
              <div className="mt-3 relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chores"
                  className="w-full rounded-lg bg-surface border border-line pl-8 pr-3 py-2 text-[13px] text-ink placeholder:text-faint outline-none focus:border-accent" />
              </div>
              <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
                <Chip active={!activeCat} onClick={() => setActiveCat(null)}>All</Chip>
                {cats.map(c => <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>{c.name}</Chip>)}
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto pb-28">
        {tab === 'home' && (
          <div className="p-4 pt-3">
            {decorated.length === 0 ? <Empty query={query} onAdd={openAdd} /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {decorated.map(({ chore, lastDone }) => (
                  <div key={chore.id} className="animate-fadeup">
                    <ChoreCard chore={chore} lastDone={lastDone} now={now} person={person(chore)} onComplete={(id) => api.complete(id, { personId: chore.personId })} onOpen={openDetail} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'due' && (
          <div className="p-4 pt-3">
            {dueList.length === 0 ? (
              <div className="text-center py-24">
                <PartyPopper size={30} className="mx-auto text-faint mb-3" />
                <p className="text-[14px] font-medium text-ink">Nothing’s due</p>
                <p className="text-[13px] text-faint mt-0.5">You’re all caught up{activePerson ? ` for ${activePerson.name}` : ''}.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dueList.map(({ chore, lastDone }) => (
                  <ChoreCard key={chore.id} chore={chore} lastDone={lastDone} now={now} person={person(chore)} onComplete={(id) => api.complete(id, { personId: chore.personId })} onOpen={openDetail} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && <Stats />}
        {tab === 'settings' && <Settings />}
      </main>

      {(tab === 'home' || tab === 'due') && (
        <button onClick={openAdd} aria-label="Add chore"
          className="fixed z-40 right-5 bottom-[88px] w-12 h-12 rounded-full bg-accent text-white grid place-items-center active:scale-90 transition-transform"
          style={{ boxShadow: '0 4px 16px var(--accent-soft)' }}>
          <Plus size={22} />
        </button>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-md border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          <NavBtn Icon={ListChecks} label="Chores" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavBtn Icon={Clock} label="Due" active={tab === 'due'} onClick={() => setTab('due')} badge={overdueCount} />
          <NavBtn Icon={BarChart3} label="Activity" active={tab === 'stats'} onClick={() => setTab('stats')} />
          <NavBtn Icon={Settings2} label="Settings" active={tab === 'settings'} onClick={() => setTab('settings')} />
        </div>
      </nav>

      <ChoreDetail chore={detail} open={!!detail} onClose={() => setDetail(null)} onEdit={openEdit} />
      <AddEditChore open={addOpen} onClose={() => { setAddOpen(false); setEditing(null) }} editing={editing} defaultCategoryId={activeCat} />
    </div>
  )
}

function Chip({ children, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-2.5 h-7 rounded-md text-[12px] font-medium whitespace-nowrap border transition-colors ${active ? 'border-ink text-ink bg-inset' : 'border-line text-muted hover:border-line-strong'}`}>{children}</button>
  )
}

function NavBtn({ Icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`relative py-2 flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-accent' : 'text-faint hover:text-muted'}`}>
      <Icon size={19} strokeWidth={active ? 2.25 : 1.75} />
      <span className="text-[10px] font-medium">{label}</span>
      {badge > 0 && <span className="absolute top-1 right-1/2 translate-x-3.5 bg-red-500 text-white font-mono text-[9px] tnum min-w-[15px] h-[15px] px-1 rounded-full grid place-items-center">{badge}</span>}
    </button>
  )
}

function Empty({ query, onAdd }) {
  return (
    <div className="text-center py-24">
      <p className="text-[14px] font-medium text-ink">{query ? 'No matches' : 'No chores yet'}</p>
      <p className="text-[13px] text-faint mt-0.5 mb-4">{query ? 'Try a different search.' : 'Add the recurring stuff you keep forgetting.'}</p>
      {!query && <button onClick={onAdd} className="px-4 py-2 rounded-lg font-medium text-[13px] text-white bg-accent inline-flex items-center gap-1.5"><Plus size={15} /> Add your first chore</button>}
    </div>
  )
}
