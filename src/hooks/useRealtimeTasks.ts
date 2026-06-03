'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, viewsApi } from '@/lib/supabase'

// ── Единый запрос задачи с полными JOIN-ами ─────────────────
async function fetchTaskWithRelations(id: string) {
  const { data } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users(*),
      scene:scenes(*),
      checklist:task_checklist(*)
    `)
    .eq('id', id)
    .single()
  if (!data) return null

  // Часы одним запросом
  const { data: logs } = await supabase
    .from('time_logs')
    .select('hours, status')
    .eq('task_id', id)

  return {
    ...data,
    pending_hours:  (logs ?? []).filter((l: any) => l.status === 'pending') .reduce((s: number, l: any) => s + Number(l.hours), 0),
    approved_hours: (logs ?? []).filter((l: any) => l.status === 'approved').reduce((s: number, l: any) => s + Number(l.hours), 0),
  }
}

// ── Загрузка ВСЕХ задач (начальная) ─────────────────────────
async function fetchAllTasks() {
  const { data } = await supabase
    .from('tasks')
    .select(`*, assignee:users(*), scene:scenes(*), checklist:task_checklist(*)`)
    .order('sort_order')

  if (!data) return []

  // Часы одним батч-запросом, не N+1
  const taskIds = data.map((t: any) => t.id)
  const { data: logs } = taskIds.length
    ? await supabase.from('time_logs').select('task_id, hours, status').in('task_id', taskIds)
    : { data: [] }

  return data.map((task: any) => {
    const taskLogs = (logs ?? []).filter((l: any) => l.task_id === task.id)
    return {
      ...task,
      pending_hours:  taskLogs.filter((l: any) => l.status === 'pending') .reduce((s: number, l: any) => s + Number(l.hours), 0),
      approved_hours: taskLogs.filter((l: any) => l.status === 'approved').reduce((s: number, l: any) => s + Number(l.hours), 0),
    }
  })
}

// ── useTasks ─────────────────────────────────────────────────
export function useTasks() {
  const [tasks,   setTasks]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Реф чтобы избежать двойных подписок в StrictMode
  const channelRef = useRef<any>(null)

  const refetch = useCallback(async () => {
    const enriched = await fetchAllTasks()
    setTasks(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()

    // Один стабильный канал (не Date.now() в имени)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    channelRef.current = supabase
      .channel('tasks-board')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'tasks' },
        async (payload: any) => {
          // Получаем задачу с полными JOIN-ами — realtime даёт только raw row
          const full = await fetchTaskWithRelations(payload.new.id)
          if (full) setTasks(prev =>
            prev.find(t => t.id === full.id) ? prev : [...prev, full]
          )
        }
      )
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'tasks' },
        async (payload: any) => {
          const full = await fetchTaskWithRelations(payload.new.id)
          if (full) setTasks(prev => prev.map(t => t.id === full.id ? full : t))
        }
      )
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload: any) => {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id))
        }
      )
      // Обновление часов при изменении time_logs
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'time_logs' },
        async (payload: any) => {
          const taskId = payload.new?.task_id ?? payload.old?.task_id
          if (!taskId) return
          const full = await fetchTaskWithRelations(taskId)
          if (full) setTasks(prev => prev.map(t => t.id === full.id ? full : t))
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [refetch])

  const byStatus = useCallback((status: string) =>
    tasks
      .filter(t => t.status === status)
      .sort((a: any, b: any) => a.sort_order - b.sort_order),
    [tasks]
  )

  const moveTask = useCallback(async (taskId: string, newStatus: string, newSortOrder: number) => {
    // Оптимистично
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, sort_order: newSortOrder } : t
    ))
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, sort_order: newSortOrder })
      .eq('id', taskId)
    // Откат при ошибке
    if (error) refetch()
  }, [refetch])

  return { tasks, loading, byStatus, moveTask, refetch }
}

// ── useStaleTasks ─────────────────────────────────────────────
export function useStaleTasks() {
  const [staleTasks, setStaleTasks] = useState<any[]>([])
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.staleTasks()
      setStaleTasks(data ?? [])
    }
    load()

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel('stale-tasks')
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'tasks' }, load)
      .subscribe()

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [])

  return staleTasks
}

// ── useSceneProgress ──────────────────────────────────────────
export function useSceneProgress() {
  const [progress, setProgress] = useState<any[]>([])
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.sceneProgress()
      setProgress(data ?? [])
    }
    load()

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel('scene-progress')
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'assets' }, load)
      .subscribe()

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [])

  const overall = progress.length
    ? Math.round(progress.reduce((s, x) => s + Number(x.progress_pct), 0) / progress.length)
    : 0

  return { progress, overall }
}

// ── useWallPosts ──────────────────────────────────────────────
export function useWallPosts(limit = 50) {
  const [posts, setPosts] = useState<any[]>([])
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('wall_posts')
        .select('*, user:users(name,color,initials)')
        .order('created_at')
        .limit(limit)
      setPosts(data ?? [])
    }
    load()

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel('wall-posts')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'wall_posts' },
        async (payload: any) => {
          const { data } = await supabase
            .from('wall_posts')
            .select('*, user:users(name,color,initials)')
            .eq('id', payload.new.id)
            .single()
          if (data) setPosts(prev => [...prev, data])
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [limit])

  const sendPost = useCallback(async (userId: string, text: string) => {
    await supabase.from('wall_posts').insert({ user_id: userId, text })
  }, [])

  return { posts, sendPost }
}

// ── usePendingTimeLogs ────────────────────────────────────────
export function usePendingTimeLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('time_logs')
        .select('*, user:users(*), task:tasks(title)')
        .eq('status', 'pending')
        .order('created_at')
      setLogs(data ?? [])
    }
    load()

    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel('pending-logs')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'time_logs' }, load)
      .subscribe()

    return () => {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    }
  }, [])

  return logs
}

// ── useUserHours ──────────────────────────────────────────────
export function useUserHours() {
  const [hours, setHours] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.userHours()
      setHours(data ?? [])
    }
    load()

    const channel = supabase
      .channel('user-hours')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'time_logs' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return hours
}
