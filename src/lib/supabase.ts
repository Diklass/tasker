// ============================================================\
// TASKER — Стабильный клиент Supabase без конфликтов типов
// src/lib/supabase.ts
// ============================================================\

import { createClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Используем any дженерик для предотвращения жестких конфликтов схем в .insert()/.update()
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export function createServerClient() {
  return createClient<any>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ---- Функции подписок (Realtime) ----
export function subscribeToTasks(handler: (payload: RealtimePostgresChangesPayload<any>) => void) {
  const channel = supabase
    .channel('public:tasks')
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'tasks' }, handler)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export function subscribeToTimeLogs(handler: (payload: RealtimePostgresChangesPayload<any>) => void) {
  const channel = supabase
    .channel('public:time_logs')
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'time_logs' }, handler)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export function subscribeToWallPosts(handler: (payload: RealtimePostgresChangesPayload<any>) => void) {
  const channel = supabase
    .channel('public:wall_posts')
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'wall_posts' }, handler)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

export function subscribeToNews(handler: (payload: RealtimePostgresChangesPayload<any>) => void) {
  const channel = supabase
    .channel('public:news')
    .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'news' }, handler)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// ---- API Хелперы ----
export const tasksApi = {
  getAll: () => 
    supabase
      .from('tasks')
      .select('*, assignee:users(*), scene:scenes(*), checklist:task_checklist(*)')
      .order('sort_order', { ascending: true }),

  create: (task: any) =>
    supabase.from('tasks').insert(task).select().single(),

  updateStatus: (id: string, status: string, sort_order?: number) => {
    const payload: any = { status }
    if (sort_order !== undefined) payload.sort_order = sort_order
    return supabase.from('tasks').update(payload).eq('id', id)
  },

  update: (id: string, changes: any) =>
    supabase.from('tasks').update(changes).eq('id', id),

  toggleChecklistItem: (id: string, is_done: boolean) =>
    supabase.from('task_checklist').update({ is_done }).eq('id', id),

  addChecklistItem: (task_id: string, text: string, sort_order: number) =>
    supabase.from('task_checklist').insert({ task_id, text, is_done: false, sort_order }).select().single()
}

export const viewsApi = {
  staleTasks: () => supabase.from('stale_tasks').select('*'),
  sceneProgress: () => supabase.from('scene_progress').select('*'),
  userHours: () => supabase.from('user_hours_summary').select('*'),
}

export const wallApi = {
  getRecent: () => supabase.from('wall_posts').select('*, user:users(*)').order('created_at', { ascending: false }).limit(50),
  post: (user_id: string, text: string) => supabase.from('wall_posts').insert({ user_id, text }).select().single(),
}

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

  log: (entry: any) =>
    supabase.from('time_logs').insert(entry).select().single(),
}

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