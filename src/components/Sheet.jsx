import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Sheet({ open, onClose, title, children, maxWidth = 'max-w-md' }) {
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
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 animate-overlay" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-surface border border-line rounded-t-2xl sm:rounded-2xl animate-sheet max-h-[92vh] overflow-y-auto no-scrollbar`}>
        <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur px-5 pt-4 pb-3 flex items-center justify-between border-b border-line">
          {title ? <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2> : <span />}
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 -mr-1 grid place-items-center rounded-md text-faint hover:text-ink hover:bg-inset transition-colors">
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
