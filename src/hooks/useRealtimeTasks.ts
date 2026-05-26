'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, tasksApi, subscribeToTasks, subscribeToTimeLogs, subscribeToWallPosts, viewsApi } from '@/lib/supabase'

export function useTasks() {
  const [tasks, setTasks]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    const { data } = await tasksApi.getAll()
    // Обогащаем задачи суммами часов
    const enriched = await Promise.all((data ?? []).map(async (task: any) => {
      const { data: logs } = await supabase.from('time_logs').select('hours, status').eq('task_id', task.id)
      const pending  = (logs ?? []).filter((l: any) => l.status === 'pending').reduce((s: number, l: any) => s + l.hours, 0)
      const approved = (logs ?? []).filter((l: any) => l.status === 'approved').reduce((s: number, l: any) => s + l.hours, 0)
      return { ...task, pending_hours: pending, approved_hours: approved }
    }))
    setTasks(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()
    const unsub = subscribeToTasks(() => fetchTasks())
    return unsub
  }, [fetchTasks])

  const byStatus = useCallback((status: string) =>
    tasks.filter(t => t.status === status).sort((a: any, b: any) => a.sort_order - b.sort_order),
    [tasks]
  )

  const moveTask = useCallback(async (taskId: string, newStatus: string, newSortOrder: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, sort_order: newSortOrder } : t))
    await tasksApi.updateStatus(taskId, newStatus, newSortOrder)
  }, [])

  return { tasks, loading, byStatus, moveTask, refetch: fetchTasks }
}

export function useStaleTasks() {
  const [staleTasks, setStaleTasks] = useState<any[]>([])
  useEffect(() => {
    const load = async () => { const { data } = await viewsApi.staleTasks(); setStaleTasks(data ?? []) }
    load()
    const unsub = subscribeToTasks(() => load())
    return unsub
  }, [])
  return staleTasks
}

export function useSceneProgress() {
  const [progress, setProgress] = useState<any[]>([])
  useEffect(() => {
    const load = async () => { const { data } = await viewsApi.sceneProgress(); setProgress(data ?? []) }
    load()
    const channel = supabase.channel('assets-prog').on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'assets' }, load).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])
  const overall = progress.length ? Math.round(progress.reduce((s, x) => s + x.progress_pct, 0) / progress.length) : 0
  return { progress, overall }
}

export function useWallPosts(limit = 50) {
  const [posts, setPosts] = useState<any[]>([])
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('wall_posts').select('*, user:users(name,color,initials)').order('created_at').limit(limit)
      setPosts(data ?? [])
    }
    load()
    const unsub = subscribeToWallPosts(async ({ eventType, new: n }: any) => {
      if (eventType !== 'INSERT') return
      const { data } = await supabase.from('wall_posts').select('*, user:users(name,color,initials)').eq('id', n.id).single()
      if (data) setPosts(prev => [...prev, data])
    })
    return unsub
  }, [limit])

  const sendPost = useCallback(async (userId: string, text: string) => {
    await supabase.from('wall_posts').insert({ user_id: userId, text })
  }, [])

  return { posts, sendPost }
}

export function usePendingTimeLogs() {
  const [logs, setLogs] = useState<any[]>([])
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('time_logs').select('*, user:users(*), task:tasks(title)').eq('status', 'pending').order('created_at')
      setLogs(data ?? [])
    }
    load()
    const unsub = subscribeToTimeLogs(() => load())
    return unsub
  }, [])
  return logs
}

export function useUserHours() {
  const [hours, setHours] = useState<any[]>([])
  useEffect(() => {
    const load = async () => { const { data } = await viewsApi.userHours(); setHours(data ?? []) }
    load()
    const unsub = subscribeToTimeLogs(() => load())
    return unsub
  }, [])
  return hours
}
