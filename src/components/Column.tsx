'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import { TaskCard } from './TaskCard'
import { C } from '@/components/ui/design-system'

const COL: Record<string, { label: string; color: string; dot: string }> = {
  backlog:     { label: 'Бэклог',      color: C.text2,   dot: C.text3 },
  in_progress: { label: 'В работе',    color: C.blue,    dot: C.blue  },
  review:      { label: 'На проверке', color: C.pink,    dot: C.pink  },
  done:        { label: 'Готово',      color: C.green,   dot: C.green },
}

export default function KanbanColumn({ status, tasks, onTaskClick, onAddTask }: {
  status: string; tasks: any[]; onTaskClick: (t: any) => void; onAddTask?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const cfg = COL[status] ?? COL.backlog

  return (
    <div ref={setNodeRef}
      className="flex flex-col rounded-[20px] p-3.5 min-h-[480px] transition-all duration-200"
      style={{
        background: isOver ? 'rgba(255,134,57,0.04)' : `${C.surface}99`,
        border: `1px solid ${isOver ? 'rgba(255,134,57,0.25)' : C.border}`,
      }}>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
          <h2 className="text-[13px] font-black" style={{ fontFamily: 'Nunito, sans-serif', color: cfg.color }}>{cfg.label}</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px]"
            style={{ background: C.surface3, color: C.text3, fontFamily: 'Nunito, sans-serif' }}>
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button onClick={onAddTask} className="w-6 h-6 rounded-[8px] flex items-center justify-center transition-colors"
            style={{ color: C.text3 }}>
            <Plus size={13} />
          </button>
        )}
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={onTaskClick} />)}
          {tasks.length === 0 && (
            <div className="flex-1 min-h-[80px] rounded-[14px] border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: isOver ? 'rgba(255,134,57,0.40)' : 'rgba(255,255,255,0.06)', background: isOver ? 'rgba(255,134,57,0.05)' : 'transparent' }}>
              <span className="text-[11px] font-semibold" style={{ color: C.text3 }}>{isOver ? 'Отпустить здесь' : 'Пусто'}</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
