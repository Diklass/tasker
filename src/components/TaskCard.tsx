'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, CheckSquare } from 'lucide-react'
import clsx from 'clsx'
import { Chip, Avatar, Badge } from '@/components/ui/atoms'

// Внутреннее локальное расширение типов для 100% стабильности в VS Code
type LocalWorkType = '3d' | 'code' | 'sound' | 'text' | 'other'

interface LocalTask {
  id: string
  title: string
  description: string | null
  status: any
  priority: 'normal' | 'urgent'
  work_type: LocalWorkType
  scene?: { id: string; title: string; [key: string]: any } | null
  assignee?: { id: string; name: string; initials: string; color: string; color_bg: string } | null
  checklist?: Array<{ id: string; done: boolean; text: string; [key: string]: any }>
  pending_hours?: number
  approved_hours?: number
  [key: string]: any
}

const WORK_TYPE_VARIANT: Record<LocalWorkType, string> = {
  '3d':    'type-3d',
  'code':  'type-code',
  'sound': 'type-sound',
  'text':  'type-text',
  'other': 'default',
}
const WORK_TYPE_LABEL: Record<LocalWorkType, string> = {
  '3d': '3D', 'code': 'Код', 'sound': 'Звук', 'text': 'Текст', 'other': 'Другое',
}

interface TaskCardProps {
  task: any // уходим от конфликта внешних типов
  onClick: (task: any) => void
  isDragging?: boolean
}

export function TaskCard({ task: externalTask, onClick, isDragging = false }: TaskCardProps) {
  const task = externalTask as LocalTask // приведение к нашему безопасному типу

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : isDragging ? 0.9 : 1,
  }

  const doneChecklist = task.checklist?.filter((c: any) => c.done || c.is_done).length ?? 0
  const totalChecklist = task.checklist?.length ?? 0
  
  const pendingHours = task.pending_hours ?? 0
  const approvedHours = task.approved_hours ?? 0
  const hasHours = pendingHours > 0 || approvedHours > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={clsx(
        "relative bg-white rounded-[24px] border border-black/[0.06] p-3.5 pl-[18px] transition-all duration-200 cursor-grab active:cursor-grabbing group select-none",
        isDragging ? "shadow-[0_16px_40px_rgba(0,0,0,0.12)] scale-[1.02]" : "hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:border-black/[0.12]"
      )}
    >
      <div className={clsx(
        "absolute left-0 top-0 bottom-0 w-[6px] rounded-l-[24px] transition-colors",
        task.priority === 'urgent' ? "bg-[#FF8A80]" : "bg-black/[0.05] group-hover:bg-black/[0.1]"
      )} />

      <div className="flex items-center justify-between mb-2">
        <Chip variant={WORK_TYPE_VARIANT[task.work_type] || 'default'}>
          {WORK_TYPE_LABEL[task.work_type] || 'Другое'}
        </Chip>
        {task.priority === 'urgent' && <Badge variant="urgent">Срочно</Badge>}
      </div>

      <h3 className="font-display font-black text-[14px] text-[#1C1B1F] leading-snug mb-1.5 break-words">
        {task.title}
      </h3>

      {task.scene && (
        <div className="text-[11px] font-medium text-[#79747E] mb-3">
          🎬 {task.scene.title || (task.scene as any).name || 'Сцена'}
        </div>
      )}

      {totalChecklist > 0 && (
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#79747E] mb-3.5 bg-black/[0.03] w-max px-2 py-0.5 rounded-[8px]">
          <CheckSquare size={12} className={doneChecklist === totalChecklist ? "text-[#388E3C]" : ""} />
          <span className={doneChecklist === totalChecklist ? "text-[#388E3C]" : ""}>
            {doneChecklist}/{totalChecklist}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {task.assignee ? (
          <Avatar
            initials={task.assignee.initials}
            color={task.assignee.color}
            colorBg={task.assignee.color_bg}
            size="sm"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#F2EDE6] flex items-center justify-center text-[#79747E]">
            <span className="text-[10px]">—</span>
          </div>
        )}

        {hasHours && (
          <div className={clsx(
            'flex items-center gap-1 text-[11px] font-semibold',
            pendingHours > 0 ? 'text-[#9E9E9E]' : 'text-[#388E3C]'
          )}>
            <Clock size={11} />
            {pendingHours > 0
              ? `${pendingHours} ч. ⏳`
              : `${approvedHours} ч. ✓`
            }
          </div>
        )}
      </div>
    </div>
  )
}

export function TaskCardOverlay({ task: externalTask }: { task: any }) {
  const task = externalTask as LocalTask
  const doneChecklist = task.checklist?.filter((c: any) => c.done || c.is_done).length ?? 0
  const totalChecklist = task.checklist?.length ?? 0

  return (
    <div className="relative bg-white rounded-[24px] border border-black/[0.08] p-3.5 pl-[18px] shadow-[0_16px_40px_rgba(0,0,0,0.15)] rotate-[2deg] scale-[1.02] pointer-events-none">
      <div className={clsx(
        "absolute left-0 top-0 bottom-0 w-[6px] rounded-l-[24px]",
        task.priority === 'urgent' ? "bg-[#FF8A80]" : "bg-black/[0.1]"
      )} />
      <div className="flex items-center justify-between mb-2">
        <Chip variant={WORK_TYPE_VARIANT[task.work_type] || 'default'}>
          {WORK_TYPE_LABEL[task.work_type] || 'Другое'}
        </Chip>
        {task.priority === 'urgent' && <Badge variant="urgent">Срочно</Badge>}
      </div>
      <h3 className="font-display font-black text-[14px] text-[#1C1B1F] leading-snug mb-1.5">{task.title}</h3>
      {task.scene && <div className="text-[11px] font-medium text-[#79747E] mb-3">🎬 {task.scene.title || (task.scene as any).name || 'Сцена'}</div>}
      {totalChecklist > 0 && (
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#79747E]">
          <CheckSquare size={12} /> {doneChecklist}/{totalChecklist}
        </div>
      )}
    </div>
  )
}