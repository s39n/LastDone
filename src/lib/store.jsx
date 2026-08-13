import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { uid } from './uid.js'
import { seedData } from './seed.js'

const KEY = 'lastdone.v3'

// ---- persistence (localStorage now; async-shaped so IndexedDB/cloud can drop in later) ----
const persistence = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw)
    } catch (e) { console.warn('load failed', e) }
    return null
  },
  save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)) }
    catch (e) { console.warn('save failed', e) }
  }
}

function initState() {
  return persistence.load() || seedData()
}

// ---- reducer ----
// Actions that must NOT bump the data `updatedAt`:
//  - MERGE_STATE adopts an external copy and keeps its timestamp
//  - SET_SETTINGS changes device-local prefs (theme, sync code) which are never synced
const NO_STAMP = new Set(['MERGE_STATE', 'SET_SETTINGS'])

function baseReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return action.payload

    case 'IMPORT':
      return { ...action.payload }

    case 'MERGE_STATE': {
      // adopt DATA only from a synced copy; keep this device's local settings.
      const s = action.state || {}
      return {
        ...state,
        version: s.version ?? state.version,
        updatedAt: s.updatedAt || 0,
        people: s.people || [],
        categories: s.categories || [],
        chores: s.chores || [],
        completions: s.completions || []
      }
    }

    case 'TOUCH':
      // no-op data change → wrapper stamps a fresh updatedAt (used by "upload now")
      return { ...state }

    case 'ADD_CHORE':
      return { ...state, chores: [...state.chores, action.chore] }

    case 'UPDATE_CHORE':
      return { ...state, chores: state.chores.map(c => c.id === action.chore.id ? { ...c, ...action.chore } : c) }

    case 'ARCHIVE_CHORE':
      return { ...state, chores: state.chores.map(c => c.id === action.id ? { ...c, archived: !c.archived } : c) }

    case 'DELETE_CHORE':
      return {
        ...state,
        chores: state.chores.filter(c => c.id !== action.id),
        completions: state.completions.filter(d => d.choreId !== action.id)
      }

    case 'COMPLETE': {
      const done = { id: uid('done'), choreId: action.choreId, ts: action.ts ?? Date.now(), note: action.note || '', personId: action.personId ?? null }
      return { ...state, completions: [...state.completions, done] }
    }

    case 'UNDO_COMPLETE': {
      // remove the most recent completion for a chore
      const list = state.completions.filter(d => d.choreId === action.choreId).sort((a, b) => b.ts - a.ts)
      if (!list.length) return state
      const removeId = list[0].id
      return { ...state, completions: state.completions.filter(d => d.id !== removeId) }
    }

    case 'DELETE_COMPLETION':
      return { ...state, completions: state.completions.filter(d => d.id !== action.id) }

    case 'CLEAR_CHORE_HISTORY':
      return { ...state, completions: state.completions.filter(d => d.choreId !== action.choreId) }

    case 'CLEAR_ALL_HISTORY':
      return { ...state, completions: [] }

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.category] }

    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.category.id ? { ...c, ...action.category } : c) }

    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(c => c.id !== action.id && c.parentId !== action.id),
        chores: state.chores.map(c => c.categoryId === action.id ? { ...c, categoryId: null } : c)
      }

    case 'ADD_PERSON':
      return { ...state, people: [...state.people, action.person] }

    case 'UPDATE_PERSON':
      return { ...state, people: state.people.map(p => p.id === action.person.id ? { ...p, ...action.person } : p) }

    case 'DELETE_PERSON':
      return {
        ...state,
        people: state.people.filter(p => p.id !== action.id),
        chores: state.chores.map(c => c.personId === action.id ? { ...c, personId: null } : c),
        settings: { ...state.settings, activePersonId: state.settings.activePersonId === action.id ? null : state.settings.activePersonId }
      }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } }

    default:
      return state
  }
}

// Wrapper: stamp a top-level `updatedAt` whenever the state actually changes,
// except when adopting an external state (sync merge keeps its own timestamp).
function reducer(state, action) {
  const next = baseReducer(state, action)
  if (next === state) return state
  if (NO_STAMP.has(action.type)) return next
  return { ...next, updatedAt: Date.now() }
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  // persist on every change
  useEffect(() => { persistence.save(state) }, [state])

  // a ticking "now" so relative times & colors update live (every 30s)
  const [tick, setTick] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  // ---- derived: last-done map ----
  const lastDoneMap = useMemo(() => {
    const m = {}
    for (const d of state.completions) {
      if (m[d.choreId] == null || d.ts > m[d.choreId]) m[d.choreId] = d.ts
    }
    return m
  }, [state.completions])

  const api = useMemo(() => ({
    // chores
    addChore: (chore) => dispatch({ type: 'ADD_CHORE', chore: { id: uid('ch'), createdAt: Date.now(), archived: false, ...chore } }),
    updateChore: (chore) => dispatch({ type: 'UPDATE_CHORE', chore }),
    deleteChore: (id) => dispatch({ type: 'DELETE_CHORE', id }),
    archiveChore: (id) => dispatch({ type: 'ARCHIVE_CHORE', id }),
    complete: (choreId, opts = {}) => dispatch({ type: 'COMPLETE', choreId, ...opts }),
    undoComplete: (choreId) => dispatch({ type: 'UNDO_COMPLETE', choreId }),
    deleteCompletion: (id) => dispatch({ type: 'DELETE_COMPLETION', id }),
    clearChoreHistory: (choreId) => dispatch({ type: 'CLEAR_CHORE_HISTORY', choreId }),
    clearAllHistory: () => dispatch({ type: 'CLEAR_ALL_HISTORY' }),
    // categories
    addCategory: (category) => dispatch({ type: 'ADD_CATEGORY', category: { id: uid('c'), parentId: null, ...category } }),
    updateCategory: (category) => dispatch({ type: 'UPDATE_CATEGORY', category }),
    deleteCategory: (id) => dispatch({ type: 'DELETE_CATEGORY', id }),
    // people
    addPerson: (person) => dispatch({ type: 'ADD_PERSON', person: { id: uid('p'), ...person } }),
    updatePerson: (person) => dispatch({ type: 'UPDATE_PERSON', person }),
    deletePerson: (id) => dispatch({ type: 'DELETE_PERSON', id }),
    // settings
    setSettings: (patch) => dispatch({ type: 'SET_SETTINGS', patch }),
    // data mgmt
    exportData: () => JSON.stringify(state, null, 2),
    importData: (payload) => dispatch({ type: 'IMPORT', payload }),
    mergeState: (incoming) => dispatch({ type: 'MERGE_STATE', state: incoming }),
    touch: () => dispatch({ type: 'TOUCH' }),
    resetAll: () => dispatch({ type: 'RESET', payload: seedData() }),
    wipeAll: () => dispatch({ type: 'RESET', payload: { version: 2, people: [], categories: [], chores: [], completions: [], settings: { ...state.settings } } })
  }), [state])

  const value = useMemo(() => ({ state, api, lastDoneMap, now: tick }), [state, api, lastDoneMap, tick])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
