// ============================================================
// PROJECT HUB — Supabase клиент + real-time подписки
// src/lib/supabase.ts
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ---- Клиент (браузер / SSR) ---------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

// Серверный клиент (для API routes, с service_role)
export function createServerClient() {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ============================================================
// REAL-TIME ПОДПИСКИ
// Используются в хуках — один вызов, один канал
// ============================================================

type ChangeHandler<T> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: Partial<T>
}) => void

/**
 * Подписка на изменения задач.
 * Возвращает функцию отписки — вызывай в useEffect cleanup.
 *
 * Пример:
 *   const unsub = subscribeToTasks((payload) => {
 *     if (payload.eventType === 'UPDATE') updateTaskInState(payload.new)
 *     if (payload.eventType === 'INSERT') addTaskToState(payload.new)
 *     if (payload.eventType === 'DELETE') removeTaskFromState(payload.old.id!)
 *   })
 *   return () => unsub()
 */
export function subscribeToTasks(handler: ChangeHandler<Database['public']['Tables']['tasks']['Row']>) {
  const channel = supabase
    .channel('tasks-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, handler)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export function subscribeToTimeLogs(handler: ChangeHandler<Database['public']['Tables']['time_logs']['Row']>) {
  const channel = supabase
    .channel('timelogs-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'time_logs' }, handler)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export function subscribeToAssets(handler: ChangeHandler<Database['public']['Tables']['assets']['Row']>) {
  const channel = supabase
    .channel('assets-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, handler)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

export function subscribeToWallPosts(handler: ChangeHandler<Database['public']['Tables']['wall_posts']['Row']>) {
  const channel = supabase
    .channel('wall-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wall_posts' }, handler)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

// ============================================================
// API-ХЕЛПЕРЫ (обёртки над supabase-js)
// ============================================================

// --- Tasks ---

export const tasksApi = {
  getAll: () =>
    supabase
      .from('tasks')
      .select(`
        *,
        assignee:users(*),
        scene:scenes(*),
        checklist:task_checklist(*)
      `)
      .order('sort_order', { ascending: true }),

  getByStatus: (status: string) =>
    supabase
      .from('tasks')
      .select('*, assignee:users(*), scene:scenes(*), checklist:task_checklist(*)')
      .eq('status', status)
      .order('sort_order', { ascending: true }),

  create: (task: Database['public']['Tables']['tasks']['Insert']) =>
    supabase.from('tasks').insert(task).select().single(),

  updateStatus: (id: string, status: string, sort_order?: number) =>
    supabase.from('tasks').update({ status, ...(sort_order !== undefined ? { sort_order } : {}) }).eq('id', id),

  update: (id: string, updates: Database['public']['Tables']['tasks']['Update']) =>
    supabase.from('tasks').update(updates).eq('id', id),

  delete: (id: string) =>
    supabase.from('tasks').delete().eq('id', id),

  /** Пакетное обновление sort_order при drag-and-drop */
  reorder: async (updates: { id: string; sort_order: number; status: string }[]) => {
    const promises = updates.map(({ id, sort_order, status }) =>
      supabase.from('tasks').update({ sort_order, status }).eq('id', id)
    )
    return Promise.all(promises)
  },
}

// --- Checklist ---

export const checklistApi = {
  toggle: (id: string, done: boolean) =>
    supabase.from('task_checklist').update({ done }).eq('id', id),

  add: (task_id: string, text: string, sort_order: number) =>
    supabase.from('task_checklist').insert({ task_id, text, sort_order }).select().single(),

  delete: (id: string) =>
    supabase.from('task_checklist').delete().eq('id', id),
}

// --- Time Logs ---

export const timeLogsApi = {
  getPending: () =>
    supabase
      .from('time_logs')
      .select('*, user:users(*), task:tasks(title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),

  approve: (id: string, reviewed_by: string) =>
    supabase.from('time_logs').update({
      status: 'approved',
      reviewed_by,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id),

  reject: (id: string, reviewed_by: string, reject_reason: string) =>
    supabase.from('time_logs').update({
      status: 'rejected',
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      reject_reason,
    }).eq('id', id),

  log: (entry: Database['public']['Tables']['time_logs']['Insert']) =>
    supabase.from('time_logs').insert(entry).select().single(),
}

// --- Assets ---

export const assetsApi = {
  getByScene: (scene_id: string) =>
    supabase
      .from('assets')
      .select('*, assignee:users(*), scene:scenes(*)')
      .eq('scene_id', scene_id)
      .order('sort_order', { ascending: true }),

  updateStage: (id: string, stage: 'stage_3d' | 'stage_code' | 'stage_content', value: boolean) =>
    supabase.from('assets').update({ [stage]: value }).eq('id', id),
}

// --- Views ---

export const viewsApi = {
  sceneProgress: () =>
    supabase.from('scene_progress').select('*'),

  staleTasks: () =>
    supabase.from('stale_tasks').select('*'),

  userHours: () =>
    supabase.from('user_hours_summary').select('*'),
}
