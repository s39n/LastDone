import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from './lib/store.jsx'
import ChoreCard from './components/ChoreCard.jsx'
import ChoreDetail from './components/ChoreDetail.jsx'
import AddEditChore from './components/AddEditChore.jsx'
import Stats from './components/Stats.jsx'
import Settings from './components/Settings.jsx'
import { STATE, stateOf, progress, colorFor, rgb } from './lib/dates.js'
import { maybeRemindOverdue } from './lib/notifications.js'

const ORDER = { [STATE.OVERDUE]: 0, [STATE.DUE]: 1, [STATE.SOON]: 2, [STATE.FRESH]: 3, [STATE.UNTIMED]: 4, [STATE.DORMANT]: 5 }

export default function App() {
  const { state, api, lastDoneMap, now } = useStore()
  const [tab, setTab] = useState('home')     // home | due | stats | settings
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState(null)
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  // ---- theme ----
  useEffect(() => {
    const apply = () => {
      const t = state.settings.theme
      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.background = dark ? '#0f172a' : '#f1f5f9'
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [state.settings.theme])

  // ---- active person filter ----
  const activePerson = state.people.find(p => p.id === state.settings.activePersonId) || null

  // ---- derived, sorted, filtered chores ----
  const decorated = useMemo(() => {
    return state.chores
      .filter(c => !c.archived)
      .filter(c => !activePerson || c.personId === activePerson.id)
      .filter(c => !activeCat || c.categoryId === activeCat)
      .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()))
      .map(c => {
        const ld = lastDoneMap[c.id]
        const st = stateOf(c, ld, now)
        const p = progress(ld, c.cadenceDays, now)
        return { chore: c, lastDone: ld, st, p }
      })
      .sort((a, b) => (ORDER[a.st] - ORDER[b.st]) || ((b.p ?? -1) - (a.p ?? -1)) || a.chore.name.localeCompare(b.chore.name))
  }, [state.chores, activePerson, activeCat, query, lastDoneMap, now])

  const overdueList = useMemo(
    () => decorated.filter(d => d.st === STATE.OVERDUE || d.st === STATE.DUE)
                   .map(d => ({ ...d.chore })),
    [decorated]
  )

  // ---- fire overdue reminders (phase 1: local) ----
  useEffect(() => {
    if (!state.settings.notificationsEnabled) return
    const overdue = state.chores.filter(c => !c.archived).filter(c => stateOf(c, lastDoneMap[c.id], Date.now()) === STATE.OVERDUE)
    maybeRemindOverdue(overdue, state.settings.reminderHour)
    const id = setInterval(() => {
      const od = state.chores.filter(c => !c.archived).filter(c => stateOf(c, lastDoneMap[c.id], Date.now()) === STATE.OVERDUE)
      maybeRemindOverdue(od, state.settings.reminderHour)
    }, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [state.settings.notificationsEnabled, state.settings.reminderHour, state.chores, lastDoneMap])

  const cats = state.categories.filter(c => !c.parentId)
  const person = (ch) => state.people.find(p => p.id === ch.personId)

  const openDetail = (ch) => setDetail(ch)
  const openEdit = (ch) => { setDetail(null); setEditing(ch); setAddOpen(true) }
  const openAdd = () => { setEditing(null); setAddOpen(true) }

  const counts = useMemo(() => {
    let overdue = 0
    for (const c of state.chores) if (!c.archived && stateOf(c, lastDoneMap[c.id], now) === STATE.OVERDUE) overdue++
    return { overdue }
  }, [state.chores, lastDoneMap, now])

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                {tab === 'stats' ? 'Activity' : tab === 'settings' ? 'Settings' : tab === 'due' ? 'Due soon' : 'Last Done'}
              </h1>
              {tab === 'home' && <p className="text-xs text-slate-500">{decorated.length} tracked{counts.overdue > 0 ? ` · ${counts.overdue} overdue` : ''}</p>}
            </div>
            {state.people.length > 0 && (tab === 'home' || tab === 'due') && (
              <div className="flex items-center gap-1">
                <button onClick={() => api.setSettings({ activePersonId: null })}
                  className={`px-2.5 py-1 rounded-full text-sm font-semibold ${!activePerson ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>All</button>
                {state.people.map(p => (
                  <button key={p.id} onClick={() => api.setSettings({ activePersonId: p.id })}
                    className="w-8 h-8 rounded-full grid place-items-center text-base transition"
                    style={activePerson?.id === p.id ? { background: p.color, transform: 'scale(1.1)' } : { background: (p.color||'#64748b')+'22' }}
                    title={p.name}>{p.emoji}</button>
                ))}
              </div>
            )}
          </div>

          {tab === 'home' && (
            <>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chores…"
                  className="w-full rounded-xl bg-white dark:bg-slate-900 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ring-1 ring-slate-200 dark:ring-slate-800" />
              </div>
              <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                <Chip active={!activeCat} onClick={() => setActiveCat(null)}>All</Chip>
                {cats.map(c => <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} color={c.color}>{c.icon} {c.name}</Chip>)}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto pb-28">
        {tab === 'home' && (
          <div className="p-4 pt-2">
            {decorated.length === 0 ? (
              <Empty query={query} onAdd={openAdd} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
          <div className="p-4 pt-2">
            {overdueList.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Nothing’s due</p>
                <p className="text-sm text-slate-500">You’re all caught up{activePerson ? ` for ${activePerson.name}` : ''}.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {overdueList.map(chore => (
                  <ChoreCard key={chore.id} chore={chore} lastDone={lastDoneMap[chore.id]} now={now} person={person(chore)} onComplete={(id) => api.complete(id, { personId: chore.personId })} onOpen={openDetail} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && <Stats />}
        {tab === 'settings' && <Settings />}
      </main>

      {/* FAB */}
      {(tab === 'home' || tab === 'due') && (
        <button onClick={openAdd}
          className="fixed z-40 right-5 bottom-24 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-3xl grid place-items-center shadow-lg shadow-blue-600/30 active:scale-90 transition">
          +
        </button>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          <NavBtn icon="🏠" label="Chores" active={tab === 'home'} onClick={() => setTab('home')} />
          <NavBtn icon="⏰" label="Due" active={tab === 'due'} onClick={() => setTab('due')} badge={counts.overdue} />
          <NavBtn icon="📊" label="Activity" active={tab === 'stats'} onClick={() => setTab('stats')} />
          <NavBtn icon="⚙️" label="Settings" active={tab === 'settings'} onClick={() => setTab('settings')} />
        </div>
      </nav>

      <ChoreDetail chore={detail} open={!!detail} onClose={() => setDetail(null)} onEdit={openEdit} />
      <AddEditChore open={addOpen} onClose={() => { setAddOpen(false); setEditing(null) }} editing={editing} defaultCategoryId={activeCat} />
    </div>
  )
}

function Chip({ children, active, onClick, color }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${active ? 'text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-800'}`}
      style={active ? { background: color || '#2563eb' } : undefined}>
      {children}
    </button>
  )
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`relative py-2.5 flex flex-col items-center gap-0.5 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[11px] font-semibold">{label}</span>
      {badge > 0 && <span className="absolute top-1.5 right-1/2 translate-x-4 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full grid place-items-center">{badge}</span>}
    </button>
  )
}

function Empty({ query, onAdd }) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-3">{query ? '🔍' : '🌱'}</div>
      <p className="font-semibold text-slate-700 dark:text-slate-300">{query ? 'No matches' : 'No chores yet'}</p>
      <p className="text-sm text-slate-500 mb-4">{query ? 'Try a different search.' : 'Add the recurring stuff you keep forgetting.'}</p>
      {!query && <button onClick={onAdd} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-blue-600">+ Add your first chore</button>}
    </div>
  )
}
