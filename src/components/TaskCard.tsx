'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock } from 'lucide-react'
import clsx from 'clsx'
import { Chip, Avatar } from '@/components/ui/design-system'

const WORK_VARIANT: Record<string, any> = {
  '3d': '3d', code: 'code', sound: 'sound', text: 'text',
}
const WORK_LABEL: Record<string, string> = {
  '3d': '3D', code: 'Код', sound: 'Звук', text: 'Текст', other: '—',
}

export function TaskCard({ task, onClick }: { task: any; onClick: (t: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const done  = task.checklist?.filter((c: any) => c.done).length ?? 0
  const total = task.checklist?.length ?? 0

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes} {...listeners}
      onClick={() => onClick(task)}
      className={clsx(
        'relative bg-[#1A1D27] border border-[rgba(255,255,255,0.07)] rounded-[16px]',
        'p-3.5 pl-[18px] cursor-pointer select-none overflow-hidden',
        'transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.3)]',
        'hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.14)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)] hover:bg-[#22263A]'
      )}
    >
      {task.assignee && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[16px]"
          style={{ background: task.assignee.color }} />
      )}

      <h3 className="font-display font-bold text-[13px] leading-snug mb-2.5 text-[#F1F3FA] pr-1">
        {task.title}
      </h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {task.scene      && <Chip label={task.scene.name} variant="room" />}
        {task.work_type  && <Chip label={WORK_LABEL[task.work_type] ?? task.work_type} variant={WORK_VARIANT[task.work_type] ?? 'default'} />}
        {task.priority === 'urgent' && <Chip label="Срочно" variant="urgent" />}
      </div>

      {total > 0 && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex-1 h-1 bg-[#2A2F45] rounded-full overflow-hidden">
            <div className="h-full bg-[rgba(74,222,128,0.6)] rounded-full transition-all duration-500"
              style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="text-[10px] text-[#6B7494] font-semibold">{done}/{total}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {task.assignee
          ? <Avatar initials={task.assignee.initials} color={task.assignee.color} size="xs" />
          : <div className="w-6 h-6 rounded-[7px] bg-[#2A2F45]" />
        }
        {(task.pending_hours > 0 || task.approved_hours > 0) && (
          <div className={clsx(
            'flex items-center gap-1 text-[10px] font-semibold',
            task.pending_hours > 0 ? 'text-[#FF8639] pulse-pending' : 'text-[#4ADE80]'
          )}>
            <Clock size={10} />
            {task.pending_hours > 0 ? `${task.pending_hours}ч ⏳` : `${task.approved_hours}ч ✓`}
          </div>
        )}
      </div>
    </div>
  )
}

export function TaskCardOverlay({ task }: { task: any }) {
  return (
    <div className="relative bg-[#22263A] border border-[rgba(255,134,57,0.30)] rounded-[16px] p-3.5 pl-[18px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rotate-[2.5deg] scale-105">
      {task.assignee && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[16px]" style={{ background: task.assignee.color }} />
      )}
      <h3 className="font-display font-bold text-[13px] text-[#F1F3FA]">{task.title}</h3>
    </div>
  )
}
