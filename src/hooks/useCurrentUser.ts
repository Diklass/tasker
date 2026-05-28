'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface TeamMember {
  id: string
  name: string
  initials: string
  role: 'member' | 'manager'
  color: string
  color_bg: string
  telegram_id: number | null
  xp: number
}

const STORAGE_KEY = 'project_hub_current_user_id'

// ── useTeamMembers — загружает всех участников из БД ──────────
export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .order('role', { ascending: false }) // manager первым
      .then(({ data }) => {
        setMembers((data as TeamMember[]) ?? [])
        setLoading(false)
      })
  }, [])

  return { members, loading }
}

// ── useCurrentUser — выбранный текущий пользователь ──────────
// Хранится в localStorage (до внедрения Supabase Auth)
export function useCurrentUser() {
  const { members, loading } = useTeamMembers()
  const [currentId, setCurrentId] = useState<string>('')

  // Инициализируем из localStorage
  useEffect(() => {
    if (loading || members.length === 0) return
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null
    // Проверяем что сохранённый ID валидный
    const valid = members.find(m => m.id === stored)
    if (valid) {
      setCurrentId(valid.id)
    } else {
      // По умолчанию — первый member (не manager)
      const defaultUser = members.find(m => m.role === 'member') ?? members[0]
      setCurrentId(defaultUser?.id ?? '')
    }
  }, [members, loading])

  const switchUser = useCallback((id: string) => {
    setCurrentId(id)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const currentUser = members.find(m => m.id === currentId) ?? null
  const manager     = members.find(m => m.role === 'manager') ?? null

  return { currentUser, manager, members, loading, switchUser, currentId }
}
