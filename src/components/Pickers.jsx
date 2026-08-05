import React from 'react'
import { ICON_KEYS, Icon, COLOR_CHOICES } from '../lib/icons.jsx'

export function IconPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1 max-h-44 overflow-y-auto no-scrollbar p-1.5 rounded-lg bg-inset border border-line">
      {ICON_KEYS.map(k => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-label={k}
          className={`h-9 rounded-md grid place-items-center transition-colors ${value === k ? 'bg-accent text-white' : 'text-muted hover:text-ink hover:bg-surface'}`}>
          <Icon name={k} size={18} />
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_CHOICES.map(col => (
        <button key={col} type="button" onClick={() => onChange(col)} aria-label={col}
          className={`w-6 h-6 rounded-full transition ${value === col ? 'ring-2 ring-offset-2 ring-offset-surface ring-ink scale-110' : ''}`}
          style={{ background: col }} />
      ))}
    </div>
  )
}

export function Avatar({ person, size = 22, active = false }) {
  const initials = (person.initials || person.name || '?').slice(0, 2).toUpperCase()
  return (
    <span className="grid place-items-center rounded-full font-mono font-medium tnum shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.42,
        background: active ? person.color : (person.color + '22'),
        color: active ? '#fff' : person.color,
        outline: active ? '2px solid var(--surface)' : 'none'
      }}>
      {initials}
    </span>
  )
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
