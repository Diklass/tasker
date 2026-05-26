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

// ID текущего пользователя — в рамках теста подставляем Эльдара (Lead)
const CURRENT_USER_ID = 'eldar-placeholder-id'
const CURRENT_USER_NAME = 'Эльдар'

const STATUSES = ['backlog', 'in_progress', 'review', 'done'] as const
type TaskStatus = typeof STATUSES[number]

export default function Board() {
  const { tasks, loading, byStatus } = useTasks()
  const { show } = useToast()
  
  const [activeTask, setActiveTask] = useState<any | null>(null)
  const [modalTask, setModalTask] = useState<any | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // dnd-kit логика для плавного перемещения между колонками
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // Если уронили в ту же колонку или на тот же статус
    let newStatus: TaskStatus | null = null
    if (STATUSES.includes(overId as any)) {
      newStatus = overId as TaskStatus
    } else {
      const overTask = tasks.find(t => t.id === overId)
      if (overTask) newStatus = overTask.status as TaskStatus
    }

    if (newStatus && task.status !== newStatus) {
      // 1. Оптимистично обновляем статус в базе данных через Supabase
      const oldStatus = task.status
      task.status = newStatus 

      const { error } = await tasksApi.updateStatus(taskId, newStatus)

      if (error) {
        task.status = oldStatus // Откат при ошибке
        show('Не удалось сохранить позицию задачи', 'error')
        return
      }

      // 2. 🔥 Триггерим Telegram-бота через наш новый Activity API Route!
      try {
        await fetch('/api/tasks/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: taskId,
            newStatus: newStatus,
            actorName: CURRENT_USER_NAME
          }),
        })
      } catch (err) {
        console.error('Ошибка логирования активности для бота:', err)
      }
    }
  }

  const filteredByStatus = (status: string) => {
    return tasks.filter((t: any) => t.status === status)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-sm font-medium text-[#79747E] animate-pulse">Загрузка доски...</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-black text-[24px] text-[#1C1B1F] tracking-tight mb-1">
            Рабочее пространство
          </h1>
          <p className="text-[12px] text-[#79747E]">
            Перетаскивай карточки для изменения статусов. Изменения транслируются в Telegram.
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-3.5">
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status as any}
              tasks={filteredByStatus(status)}
              onTaskClick={setModalTask}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        task={modalTask}
        currentUserId={CURRENT_USER_ID}
        onClose={() => setModalTask(null)}
        onUpdate={() => {}}
      />
    </div>
  )
}