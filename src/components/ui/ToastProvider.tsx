'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { C } from '@/components/ui/design-system'

type TT = 'success' | 'error' | 'info'
interface Toast { id: number; message: string; type: TT }
interface Ctx { show: (msg: string, type?: TT) => void }

const ToastCtx = createContext<Ctx>({ show: () => {} })
export function useToast() { return useContext(ToastCtx) }

const ICONS: Record<TT, string>  = { success: '✅', error: '❌', info: '💬' }
const GLOW:  Record<TT, string>  = {
  success: `0 0 20px rgba(74,222,128,0.2)`,
  error:   `0 0 20px rgba(255,107,107,0.2)`,
  info:    `0 0 20px rgba(71,202,251,0.2)`,
}

let n = 0

export default function ToastProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((message: string, type: TT = 'info') => {
    const id = ++n
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[9999] pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className="toast-enter flex items-center gap-2.5 px-4 py-3 rounded-[16px] text-sm font-semibold"
            style={{ background: C.surface, color: C.text1, border: `1px solid ${C.border}`, boxShadow: GLOW[t.type], fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
            <span>{ICONS[t.type]}</span>{t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
