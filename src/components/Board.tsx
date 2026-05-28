'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import clsx from 'clsx'
import KanbanColumn     from './Column'
import { TaskCardOverlay } from './TaskCard'
import TaskModal         from './TaskModal'
import CreateTaskModal   from './CreateTaskModal'
import { useTasks }      from '@/hooks/useRealtimeTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { tasksApi, supabase } from '@/lib/supabase'
import { useToast }      from '@/components/ui/ToastProvider'
import type { TaskStatus } from '@/types/database'

const STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done']
type FilterMode = 'all' | 'my' | 'rooms'

export default function KanbanBoard() {
  const { tasks, loading, byStatus, moveTask, refetch } = useTasks()
  const { currentUser, members, currentId } = useCurrentUser()
  const { show } = useToast()

  const [activeTask,    setActiveTask]    = useState<any>(null)
  const [modalTask,     setModalTask]     = useState<any>(null)
  const [showCreate,    setShowCreate]    = useState(false)
  const [filterMode,    setFilterMode]    = useState<FilterMode>('all')
  const [selMembers,    setSelMembers]    = useState<string[]>([])
  const [scenes,        setScenes]        = useState<any[]>([])

  // Загружаем сцены для модалки создания
  useEffect(() => {
    supabase.from('scenes').select('id, name, slug').order('sort_order')
      .then(({ data }) => setScenes(data ?? []))
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Фильтрация
  const filteredByStatus = useCallback((status: TaskStatus): any[] => {
    let list = byStatus(status)
    if (filterMode === 'my' && currentId) {
      list = list.filter((t: any) => t.assignee?.id === currentId)
    }
    if (selMembers.length > 0) {
      list = list.filter((t: any) => t.assignee && selMembers.includes(t.assignee.id))
    }
    return list
  }, [byStatus, filterMode, selMembers, currentId])

  const toggleMember = (id: string) =>
    setSelMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // ── Drag & Drop ────────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) =>
    setActiveTask(tasks.find((t: any) => t.id === active.id) ?? null)

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over || active.id === over.id) return

    const task = tasks.find((t: any) => t.id === active.id)
    if (!task) return

    const overTask  = tasks.find((t: any) => t.id === over.id)
    const newStatus = (STATUSES.includes(over.id as TaskStatus)
      ? over.id
      : overTask?.status ?? task.status) as TaskStatus

    const columnTasks = byStatus(newStatus).filter((t: any) => t.id !== task.id)
    const overIndex   = overTask ? columnTasks.findIndex((t: any) => t.id === overTask.id) : columnTasks.length

    // 1. Оптимистичное обновление UI
    await moveTask(task.id, newStatus, overIndex)

    // 2. Реальный запрос к БД (moveTask уже делает updateStatus, но дублируем для надёжности)
    await tasksApi.updateStatus(task.id, newStatus, overIndex)

    // 3. Тост + уведомление в Telegram
    if (newStatus !== task.status) {
      const actorName = currentUser?.name ?? 'Участник'

      if (newStatus === 'review')
        show(`📬 "${task.title}" отправлена на проверку!`, 'success')
      if (newStatus === 'done')
        show(`🎉 "${task.title}" закрыта! +50 XP`, 'success')

      // Fire-and-forget — не блокируем UI
      fetch('/api/tasks/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, newStatus, actorName }),
      }).catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#79747E] font-semibold">
        Загружаем доску...
      </div>
    )
  }

  return (
    <>
      <div className="p-5">
        {/* Шапка */}
        <div className="mb-5">
          <h1 className="font-display font-black text-2xl mb-0.5">Kanban-доска</h1>
          <p className="text-sm text-[#79747E]">
            {tasks.length} задач · real-time синхронизация
            {currentUser && (
              <span> · <span style={{ color: currentUser.color }} className="font-semibold">{currentUser.name}</span></span>
            )}
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          {/* Segmented buttons */}
          <div className="flex bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
            {(['all', 'my', 'rooms'] as const).map(mode => {
              const labels = { all: 'Общая доска', my: 'Мой фокус', rooms: 'По комнатам' }
              return (
                <button key={mode} onClick={() => setFilterMode(mode)}
                  className={clsx(
                    'px-4 py-2 text-[12px] font-display font-bold transition-all duration-200',
                    filterMode === mode ? 'bg-[#E8DEF8] text-[#4A3F78]' : 'text-[#49454F] hover:bg-black/[0.04]'
                  )}
                >
                  {labels[mode]}
                </button>
              )
            })}
          </div>

          {/* Аватары-фильтры (только members из БД) */}
          <div className="flex items-center gap-2">
            {members.filter(m => m.role === 'member').map(m => (
              <button key={m.id} onClick={() => toggleMember(m.id)} title={m.name}
                className={clsx(
                  'w-9 h-9 rounded-[12px] flex items-center justify-center font-display font-black text-[12px] transition-all duration-200',
                  selMembers.includes(m.id) ? 'ring-2 ring-[#7D5ED4] scale-110' : 'opacity-70 hover:opacity-100'
                )}
                style={{ background: m.color_bg, color: m.color }}
              >
                {m.initials}
              </button>
            ))}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FF8639] text-white rounded-[12px] text-[12px] font-display font-bold hover:bg-[#E8762E] transition-colors shadow-[0_2px_8px_rgba(255,134,57,0.35)]"
            >
              + Задача
            </button>
          </div>
        </div>

        {/* Доска */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-3">
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={filteredByStatus(status)}
                onTaskClick={setModalTask}
                onAddTask={status === 'backlog' ? () => setShowCreate(true) : undefined}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Модалка детали задачи */}
      <TaskModal
        task={modalTask}
        currentUserId={currentId}
        onClose={() => setModalTask(null)}
        onUpdate={refetch}
      />

      {/* Модалка создания задачи */}
      {showCreate && currentUser && (
        <CreateTaskModal
          members={members}
          scenes={scenes}
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onCreated={refetch}
        />
      )}
    </>
  )
}
