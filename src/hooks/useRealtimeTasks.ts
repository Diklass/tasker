// ============================================================
// PROJECT HUB — Real-time хуки для React компонентов
// src/hooks/useRealtimeTasks.ts
// ============================================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  supabase,
  tasksApi,
  subscribeToTasks,
  subscribeToTimeLogs,
  subscribeToWallPosts,
  viewsApi,
} from '@/lib/supabase'
import type {
  TaskWithRelations,
  TaskStatus,
  StaleTask,
  SceneProgress,
  UserHoursSummary,
  WallPost,
  TimeLog,
} from '@/types/database'

// ============================================================
// useTasks — главный хук Kanban-доски
// Загружает все задачи и слушает real-time изменения
// ============================================================
export function useTasks() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Первоначальная загрузка
  const fetchTasks = useCallback(async () => {
    const { data, error } = await tasksApi.getAll()
    if (error) { setError(error.message); return }
    setTasks((data as TaskWithRelations[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()

    // Real-time подписка
    const unsub = subscribeToTasks(async ({ eventType, new: newRow, old: oldRow }) => {
      if (eventType === 'DELETE') {
        setTasks(prev => prev.filter(t => t.id !== oldRow.id))
        return
      }

      // При INSERT или UPDATE — перезапрашиваем задачу с JOIN-ами
      const { data } = await supabase
        .from('tasks')
        .select('*, assignee:users(*), scene:scenes(*), checklist:task_checklist(*)')
        .eq('id', newRow.id)
        .single()

      if (!data) return

      setTasks(prev => {
        if (eventType === 'INSERT') return [...prev, data as TaskWithRelations]
        return prev.map(t => t.id === data.id ? data as TaskWithRelations : t)
      })
    })

    return unsub
  }, [fetchTasks])

  // Группировка по статусам для Kanban
  const byStatus = useCallback((status: TaskStatus) =>
    tasks
      .filter(t => t.status === status)
      .sort((a, b) => a.sort_order - b.sort_order),
    [tasks]
  )

  // Обновление статуса (drag-and-drop)
  const moveTask = useCallback(async (
    taskId: string,
    newStatus: TaskStatus,
    newSortOrder: number
  ) => {
    // Оптимистичное обновление UI — не ждём ответа сервера
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, sort_order: newSortOrder }
        : t
    ))
    await tasksApi.updateStatus(taskId, newStatus, newSortOrder)
  }, [])

  return { tasks, loading, error, byStatus, moveTask, refetch: fetchTasks }
}

// ============================================================
// useStaleTasks — виджет "Забытые задачи" на Dashboard
// ============================================================
export function useStaleTasks() {
  const [staleTasks, setStaleTasks] = useState<StaleTask[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.staleTasks()
      setStaleTasks(data ?? [])
    }
    load()

    // Обновляем при любом изменении задачи
    const unsub = subscribeToTasks(() => load())
    return unsub
  }, [])

  return staleTasks
}

// ============================================================
// useSceneProgress — прогресс-бары сцен на Dashboard
// ============================================================
export function useSceneProgress() {
  const [progress, setProgress] = useState<SceneProgress[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.sceneProgress()
      setProgress(data ?? [])
    }
    load()

    // Обновляем при изменении ассетов (смена чекбоксов)
    const channel = supabase
      .channel('assets-progress')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Общий прогресс проекта
  const overall = progress.length
    ? Math.round(progress.reduce((sum, s) => sum + s.progress_pct, 0) / progress.length)
    : 0

  return { progress, overall }
}

// ============================================================
// useWallPosts — Стенгазета (мини-чат) с real-time
// ============================================================
export function useWallPosts(limit = 50) {
  const [posts, setPosts] = useState<(WallPost & { user: { name: string; color: string; initials: string } })[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('wall_posts')
        .select('*, user:users(name, color, initials)')
        .order('created_at', { ascending: true })
        .limit(limit)
      setPosts((data as any) ?? [])
    }
    load()

    const unsub = subscribeToWallPosts(async ({ eventType, new: newPost }) => {
      if (eventType !== 'INSERT') return
      const { data } = await supabase
        .from('wall_posts')
        .select('*, user:users(name, color, initials)')
        .eq('id', newPost.id)
        .single()
      if (data) setPosts(prev => [...prev, data as any])
    })

    return unsub
  }, [limit])

  const sendPost = useCallback(async (userId: string, text: string) => {
    await supabase.from('wall_posts').insert({ user_id: userId, text })
  }, [])

  return { posts, sendPost }
}

// ============================================================
// usePendingTimeLogs — для PM-панели (апрув времени)
// ============================================================
export function usePendingTimeLogs() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('time_logs')
        .select('*, user:users(*), task:tasks(title)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      setLogs(data ?? [])
    }
    load()

    const unsub = subscribeToTimeLogs(({ eventType, new: newLog, old: oldLog }) => {
      if (eventType === 'INSERT' && newLog.status === 'pending') {
        // Новый pending лог — добавляем в список (перезагружаем с JOIN)
        load()
        return
      }
      if (eventType === 'UPDATE') {
        // Статус изменился (approved/rejected) — убираем из списка
        setLogs(prev => prev.filter(l => l.id !== newLog.id || newLog.status === 'pending'))
      }
    })

    return unsub
  }, [])

  return logs
}

// ============================================================
// useUserHours — статистика часов для PM-панели
// ============================================================
export function useUserHours() {
  const [hours, setHours] = useState<UserHoursSummary[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.userHours()
      setHours(data ?? [])
    }
    load()

    const unsub = subscribeToTimeLogs(() => load())
    return unsub
  }, [])

  return hours
}
