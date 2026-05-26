'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import { TaskCard } from './TaskCard'
import type { TaskWithRelations, TaskStatus } from '@/types/database'

const COL_CONFIG: Record<TaskStatus, { label: string; color: string; dotColor: string }> = {
  backlog:     { label: 'Бэклог',     color: 'text-[#5D4037]', dotColor: '#BCAAA4' },
  in_progress: { label: 'В работе',   color: 'text-[#1565C0]', dotColor: '#90CAF9' },
  review:      { label: 'На проверке', color: 'text-[#6A1B9A]', dotColor: '#CE93D8' },
  done:        { label: 'Готово',     color: 'text-[#2E7D32]', dotColor: '#A5D6A7' },
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
  onAddTask?: () => void
}

export default function KanbanColumn({ status, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const config = COL_CONFIG[status]
  const taskIds = tasks.map(t => t.id)

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex flex-col bg-[#F2EDE6] rounded-[24px] p-3.5 min-h-[480px] transition-colors duration-200',
        isOver && 'bg-[#EDE7F6] ring-2 ring-[#C3B1E1]'
      )}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: config.dotColor }}
          />
          <h2 className={clsx('font-display font-black text-[14px]', config.color)}>
            {config.label}
          </h2>
          <span className="text-[11px] font-display font-bold px-2 py-0.5 rounded-[8px] bg-black/[0.07] text-[#49454F]">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="w-7 h-7 rounded-[9px] flex items-center justify-center text-[#79747E] hover:bg-black/[0.08] hover:text-[#49454F] transition-colors"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Задачи */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2.5 flex-1">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
            />
          ))}

          {/* Пустая зона — подсказка */}
          {tasks.length === 0 && (
            <div className={clsx(
              'flex-1 rounded-[18px] border-2 border-dashed transition-all duration-200 flex items-center justify-center min-h-[80px]',
              isOver
                ? 'border-[#C3B1E1] bg-[#E8DEF8]'
                : 'border-[#D0C4E8]/60'
            )}>
              <span className="text-[12px] text-[#C3B1E1] font-semibold">
                {isOver ? 'Отпустить здесь' : 'Пусто'}
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
