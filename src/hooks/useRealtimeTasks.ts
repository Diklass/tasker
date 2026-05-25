// ============================================================\
// TASKER — Исправленные Real-time хуки
// src/hooks/useRealtimeTasks.ts
// ============================================================\

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
} from '@/types/database'

export function useTasks() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const { data, error } = await tasksApi.getAll()
    if (error) { setError(error.message); return }
    setTasks((data as unknown as TaskWithRelations[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()

    const unsub = subscribeToTasks(async (payload: any) => {
      const { eventType, new: newRow, old: oldRow } = payload

      if (eventType === 'DELETE' && oldRow) {
        setTasks(prev => prev.filter(t => t.id !== oldRow.id))
        return
      }

      if (!newRow || !newRow.id) return

      const { data } = await supabase
        .from('tasks')
        .select('*, assignee:users(*), scene:scenes(*), checklist:task_checklist(*)')
        .eq('id', newRow.id)
        .single()

      if (!data) return

      setTasks(prev => {
        if (eventType === 'INSERT') return [...prev, data as unknown as TaskWithRelations]
        return prev.map(t => t.id === data.id ? (data as unknown as TaskWithRelations) : t)
      })
    })

    return unsub
  }, [fetchTasks])

  const byStatus = useCallback((status: TaskStatus) =>
    tasks
      .filter(t => t.status === status)
      .sort((a, b) => a.sort_order - b.sort_order),
    [tasks]
  )

  const moveTask = useCallback(async (
    taskId: string,
    newStatus: TaskStatus,
    newSortOrder: number
  ) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, sort_order: newSortOrder }
        : t
    ))
    await tasksApi.updateStatus(taskId, newStatus, newSortOrder)
  }, [])

  return { tasks, loading, error, byStatus, moveTask, refetch: fetchTasks }
}

export function useStaleTasks() {
  const [staleTasks, setStaleTasks] = useState<StaleTask[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.staleTasks()
      setStaleTasks((data as unknown as StaleTask[]) ?? [])
    }
    load()

    const unsub = subscribeToTasks(() => load())
    return unsub
  }, [])

  return staleTasks
}

export function useSceneProgress() {
  const [progress, setProgress] = useState<SceneProgress[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.sceneProgress()
      setProgress((data as unknown as SceneProgress[]) ?? [])
    }
    load()

    const channel = supabase
      .channel('assets-progress')
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'assets' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const overall = progress.length
    ? Math.round(progress.reduce((sum, s) => sum + s.progress_percentage, 0) / progress.length)
    : 0

  return { progress, overall }
}

export function useWallPosts(limit = 50) {
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('wall_posts')
        .select('*, user:users(name, color, initials)')
        .order('created_at', { ascending: true })
        .limit(limit)
      setPosts(data ?? [])
    }
    load()

    const unsub = subscribeToWallPosts(async (payload: any) => {
      const { eventType, new: newPost } = payload
      if (eventType !== 'INSERT' || !newPost) return
      
      const { data } = await supabase
        .from('wall_posts')
        .select('*, user:users(name, color, initials)')
        .eq('id', newPost.id)
        .single()
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
      const { data } = await supabase
        .from('time_logs')
        .select('*, user:users(*), task:tasks(title)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      setLogs(data ?? [])
    }
    load()

    const unsub = subscribeToTimeLogs((payload: any) => {
      const { eventType, new: newLog } = payload
      if (!newLog) return
      if (eventType === 'INSERT' && newLog.status === 'pending') {
        load()
        return
      }
      if (eventType === 'UPDATE') {
        setLogs(prev => prev.filter(l => l.id !== newLog.id || newLog.status === 'pending'))
      }
    })

    return unsub
  }, [])

  return logs
}

export function useUserHours() {
  const [hours, setHours] = useState<UserHoursSummary[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await viewsApi.userHours()
      setHours((data as unknown as UserHoursSummary[]) ?? [])
    }
    load()

    const unsub = subscribeToTimeLogs(() => load())
    return unsub
  }, [])

  return hours
}