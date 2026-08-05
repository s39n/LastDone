import React from 'react'
import { ICON_CHOICES, COLOR_CHOICES } from '../lib/icons.js'

export function IconPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto no-scrollbar p-1 rounded-xl bg-slate-50 dark:bg-slate-800/60">
      {ICON_CHOICES.map(ic => (
        <button key={ic} type="button" onClick={() => onChange(ic)}
          className={`text-xl h-9 rounded-lg grid place-items-center transition ${value === ic ? 'bg-blue-500 scale-110 shadow' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
          {ic}
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_CHOICES.map(col => (
        <button key={col} type="button" onClick={() => onChange(col)}
          className={`w-7 h-7 rounded-full transition ${value === col ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-900 dark:ring-white scale-110' : ''}`}
          style={{ background: col }} aria-label={col} />
      ))}
    </div>
  )
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
