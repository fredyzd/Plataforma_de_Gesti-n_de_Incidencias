import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import clsx from 'clsx'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-2',
              t.type === 'success' && 'bg-white border-green-200 text-green-800',
              t.type === 'error' && 'bg-white border-red-200 text-red-800',
              t.type === 'info' && 'bg-white border-blue-200 text-blue-800',
            )}
          >
            {t.type === 'success' && <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
