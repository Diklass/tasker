'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import clsx from 'clsx'
import KanbanColumn from './Column'
import { TaskCardOverlay } from './TaskCard'
import TaskModal from './TaskModal'
import { useTasks } from '@/hooks/useRealtimeTasks'
import { tasksApi } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'
import type { TaskStatus, TaskWithRelations } from '@/types/database'

// ID текущего пользователя — в реальном приложении берётся из Supabase Auth
const CURRENT_USER_ID = 'eldar-placeholder-id'

const STATUSES: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done']

type FilterMode = 'all' | 'my' | 'rooms'

const TEAM_MEMBERS = [
  { id: 'eldar', initials: 'ЭЛ', color: '#D4897A', bg: '#FAF0ED', name: 'Эльдар' },
  { id: 'vyach',  initials: 'ВЯ', color: '#7AA8D4', bg: '#EDF3FA', name: 'Вячеслав' },
  { id: 'konst',  initials: 'КО', color: '#8DAE7A', bg: '#EFF5EC', name: 'Константин' },
]

export default function KanbanBoard() {
  const { tasks, loading, byStatus, moveTask, refetch } = useTasks()
  const { show } = useToast()

  const [activeTask, setActiveTask]   = useState<TaskWithRelations | null>(null)
  const [modalTask, setModalTask]     = useState<TaskWithRelations | null>(null)
  const [filterMode, setFilterMode]   = useState<FilterMode>('all')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [overId, setOverId]           = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Фильтрация задач
  const filteredByStatus = useCallback((status: TaskStatus): TaskWithRelations[] => {
    let list = byStatus(status)
    if (filterMode === 'my') {
      list = list.filter(t => t.assignee?.id === CURRENT_USER_ID)
    }
    if (selectedMembers.length > 0) {
      list = list.filter(t => t.assignee && selectedMembers.includes(t.assignee.id))
    }
    return list
  }, [byStatus, filterMode, selectedMembers])

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // DnD handlers
  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task ?? null)
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over?.id as string ?? null)
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    setOverId(null)
    if (!over || active.id === over.id) return

    const task = tasks.find(t => t.id === active.id)
    if (!task) return

    const overTask   = tasks.find(t => t.id === over.id)
    const newStatus: TaskStatus = (STATUSES.includes(over.id as TaskStatus)
      ? over.id
      : overTask?.status ?? task.status) as TaskStatus

    const columnTasks = byStatus(newStatus).filter(t => t.id !== task.id)
    const overIndex   = overTask ? columnTasks.findIndex(t => t.id === overTask.id) : columnTasks.length
    const newOrder    = overIndex

    await moveTask(task.id, newStatus, newOrder)

    // Уведомление в UI
    if (newStatus === 'review' && task.status !== 'review') {
      show(`📬 Задача "${task.title}" отправлена на проверку!`, 'success')
    }
    if (newStatus === 'done' && task.status !== 'done') {
      show(`🎉 Задача "${task.title}" закрыта! +50 XP`, 'success')
    }

    // Уведомление в Telegram при смене статуса
    if (newStatus !== task.status) {
      fetch('/api/tasks/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId:    task.id,
          newStatus,
          actorName: 'Эльдар', // TODO: заменить на текущего юзера из Supabase Auth
        }),
      }).catch(() => {}) // fire-and-forget
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#79747E] font-semibold">
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
            {tasks.length} задач · изменения синхронизируются в реальном времени
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">

          {/* Segmented buttons */}
          <div className="flex bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
            {(['all', 'my', 'rooms'] as const).map((mode, i) => {
              const labels = { all: 'Общая доска', my: 'Мой фокус', rooms: 'По комнатам' }
              return (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={clsx(
                    'px-4 py-2 text-[12px] font-display font-bold transition-all duration-200',
                    filterMode === mode
                      ? 'bg-[#E8DEF8] text-primary'
                      : 'text-[#49454F] hover:bg-black/[0.04]'
                  )}
                >
                  {labels[mode]}
                </button>
              )
            })}
          </div>

          {/* Фильтры по участникам */}
          <div className="flex items-center gap-2">
            {TEAM_MEMBERS.map(member => (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                title={member.name}
                className={clsx(
                  'w-9 h-9 rounded-[12px] flex items-center justify-center font-display font-black text-[12px]',
                  'transition-all duration-200',
                  selectedMembers.includes(member.id)
                    ? 'ring-2 ring-[#7D5ED4] scale-110'
                    : 'opacity-70 hover:opacity-100'
                )}
                style={{ background: member.bg, color: member.color }}
              >
                {member.initials}
              </button>
            ))}
            <button
              onClick={() => show('Форма создания задачи (скоро)', 'info')}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#E8DEF8] text-primary rounded-[12px] text-[12px] font-display font-bold hover:bg-[#D0BCFF] transition-colors"
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
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-3">
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={filteredByStatus(status)}
                onTaskClick={setModalTask}
                onAddTask={status === 'backlog' ? () => show('Форма создания задачи', 'info') : undefined}
              />
            ))}
          </div>

          {/* Overlay — карточка в руке */}
          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
          }}>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Модальное окно задачи */}
      <TaskModal
        task={modalTask}
        currentUserId={CURRENT_USER_ID}
        onClose={() => setModalTask(null)}
        onUpdate={refetch}
      />
    </>
  )
}
