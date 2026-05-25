export type UserRole = 'member' | 'manager'
export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'normal' | 'urgent'
export type WorkType = '3d' | 'code' | 'sound' | 'text' | 'other'
export type TimeLogStatus = 'pending' | 'approved' | 'rejected'
export type TimeLogSource = 'web' | 'telegram'

export interface User {
  id: string
  telegram_id: number | null
  name: string
  initials: string
  role: UserRole
  color: string
  color_bg: string
  xp: number
  created_at: string
}

export interface Scene {
  id: string
  name: string
  slug: string
  max_objects: number
  sort_order: number
  created_at: string
}

export interface Asset {
  id: string
  scene_id: string
  name: string
  description: string | null
  stage_3d: boolean
  stage_code: boolean
  stage_content: boolean
  assignee_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  work_type: WorkType
  scene_id: string | null
  assignee_id: string | null
  sort_order: number
  logged_hours: number
  created_at: string
  updated_at: string
  status_changed_at: string
}

export interface TaskChecklistItem {
  id: string
  task_id: string
  text: string
  is_done: boolean
  sort_order: number
}

export interface TimeLog {
  id: string
  task_id: string
  user_id: string
  hours: number
  status: TimeLogStatus
  source: TimeLogSource
  description: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  reject_reason: string | null
  created_at: string
}

export interface WallPost {
  id: string
  user_id: string
  text: string
  created_at: string
}

export interface NewsItem {
  id: string
  title: string
  text: string
  is_pinned: boolean
  created_at: string
}

export interface TaskWithRelations extends Task {
  assignee: User | null
  scene: Scene | null
  checklist: TaskChecklistItem[]
}

export interface StaleTask extends Task {
  assignee_name: string | null
  assignee_avatar: string | null
  days_stale: number
}

export interface SceneProgress {
  scene_id: string
  scene_name: string
  total_objects: number
  completed_stages: number
  total_stages: number
  progress_percentage: number
}

export interface UserHoursSummary {
  user_id: string
  user_name: string
  total_hours: number
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'id' | 'created_at' | 'xp'>; Update: Partial<User> }
      scenes: { Row: Scene; Insert: Omit<Scene, 'id' | 'created_at'>; Update: Partial<Scene> }
      assets: { Row: Asset; Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Asset> }
      tasks: { Row: Task; Insert: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status_changed_at'>; Update: Partial<Task> }
      task_checklist: { Row: TaskChecklistItem; Insert: Omit<TaskChecklistItem, 'id'>; Update: Partial<TaskChecklistItem> }
      time_logs: { Row: TimeLog; Insert: Omit<TimeLog, 'id' | 'created_at'>; Update: Partial<TimeLog> }
      wall_posts: { Row: WallPost; Insert: Omit<WallPost, 'id' | 'created_at'>; Update: Partial<WallPost> }
      news: { Row: NewsItem; Insert: Omit<NewsItem, 'id' | 'created_at'>; Update: Partial<NewsItem> }
    }
    Views: {
      stale_tasks: { Row: StaleTask }
      scene_progress: { Row: SceneProgress }
      user_hours_summary: { Row: UserHoursSummary }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}