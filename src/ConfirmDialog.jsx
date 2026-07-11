import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Hapus', cancelLabel = 'Batal' }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    // Auto-focus the cancel button on mount
    cancelRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }

      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="alertdialog"
      aria-modal="true"
      aria-label="Konfirmasi hapus"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-destructive-light flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-primary text-lg">Konfirmasi Hapus</p>
            <p className="text-secondary text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-border-light hover:bg-border text-primary font-medium rounded-xl transition text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-destructive hover:bg-destructive/90 text-white font-medium rounded-xl transition text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
