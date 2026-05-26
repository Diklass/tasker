import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://placeholder.supabase.co'
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnon)

export function createServerClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnon,
    { auth: { persistSession: false } }
  )
}

// Real-time subscriptions
type Handler = (payload: any) => void

// Измененная функция подписки на Real-time изменения
function subscribe(table: string, handler: Handler) {
  // Добавляем к названию канала случайное число, чтобы каналы никогда не пересекались при переходах между страницами
  const uniqueId = Math.random().toString(36).substring(7);
  const channel = supabase
    .channel(`${table}-rt-${Date.now()}-${uniqueId}`)
    .on('postgres_changes' as any, { event: '*', schema: 'public', table }, handler);
    
  // Сначала полностью конфигурируем канал, и только ПОТОМ вызываем .subscribe()
  channel.subscribe();
  
  return () => { 
    supabase.removeChannel(channel) 
  }
}

export const subscribeToTasks     = (h: Handler) => subscribe('tasks', h)
export const subscribeToTimeLogs  = (h: Handler) => subscribe('time_logs', h)
export const subscribeToAssets    = (h: Handler) => subscribe('assets', h)
export const subscribeToWallPosts = (h: Handler) => subscribe('wall_posts', h)

// API helpers
export const tasksApi = {
  getAll: () =>
    supabase.from('tasks').select(`*, assignee:users(*), scene:scenes(*), checklist:task_checklist(*)`).order('sort_order'),

  create: (task: any) =>
    supabase.from('tasks').insert(task).select().single(),

  updateStatus: (id: string, status: string, sort_order?: number) =>
    supabase.from('tasks').update({ status, ...(sort_order !== undefined ? { sort_order } : {}) }).eq('id', id),

  update: (id: string, updates: any) =>
    supabase.from('tasks').update(updates).eq('id', id),

  delete: (id: string) =>
    supabase.from('tasks').delete().eq('id', id),

  reorder: (updates: { id: string; sort_order: number; status: string }[]) =>
    Promise.all(updates.map(({ id, sort_order, status }) =>
      supabase.from('tasks').update({ sort_order, status }).eq('id', id)
    )),
}

export const checklistApi = {
  toggle: (id: string, done: boolean) =>
    supabase.from('task_checklist').update({ done }).eq('id', id),

  add: (task_id: string, text: string, sort_order: number) =>
    supabase.from('task_checklist').insert({ task_id, text, sort_order }).select().single(),

  delete: (id: string) =>
    supabase.from('task_checklist').delete().eq('id', id),
}

export const timeLogsApi = {
  getPending: () =>
    supabase.from('time_logs').select('*, user:users(*), task:tasks(title)').eq('status', 'pending').order('created_at'),

  approve: (id: string, reviewed_by: string) =>
    supabase.from('time_logs').update({ status: 'approved', reviewed_by, reviewed_at: new Date().toISOString() }).eq('id', id),

  reject: (id: string, reviewed_by: string, reject_reason: string) =>
    supabase.from('time_logs').update({ status: 'rejected', reviewed_by, reviewed_at: new Date().toISOString(), reject_reason }).eq('id', id),

  log: (entry: any) =>
    supabase.from('time_logs').insert(entry).select().single(),
}

export const assetsApi = {
  getByScene: (scene_id: string) =>
    supabase.from('assets').select('*, assignee:users(*), scene:scenes(*)').eq('scene_id', scene_id).order('sort_order'),

  updateStage: (id: string, stage: string, value: boolean) =>
    supabase.from('assets').update({ [stage]: value }).eq('id', id),
}

export const viewsApi = {
  sceneProgress: () => supabase.from('scene_progress').select('*'),
  staleTasks:    () => supabase.from('stale_tasks').select('*'),
  userHours:     () => supabase.from('user_hours_summary').select('*'),
}
