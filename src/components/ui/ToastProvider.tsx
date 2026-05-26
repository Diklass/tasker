'use client'

import React, { createContext, useContext } from 'react'

const ToastContext = createContext({
  show: (message: string, type: 'success' | 'error' | 'info') => {
    alert(`${type.toUpperCase()}: ${message}`) // Временный нативный алерт для MVP
  }
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const show = (message: string, type: 'success' | 'error' | 'info') => {
    console.log(`[Toast] ${type}: ${message}`)
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)