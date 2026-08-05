import React, { useEffect } from 'react'

// Reusable bottom sheet / modal.
export default function Sheet({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeup" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-sheet max-h-[92vh] overflow-y-auto no-scrollbar`}>
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="sm:hidden absolute left-1/2 -translate-x-1/2 -top-0 w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xl">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
