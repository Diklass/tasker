'use client'

import { useEffect, useState } from 'react'
import { X, Clock, CheckSquare, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Chip, Avatar, Badge } from '@/components/ui/atoms'
import { supabase, timeLogsApi } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'

interface TaskModalProps {
  task: any | null
  currentUserId: string
  onClose: () => void
  onUpdate: () => void
}

export default function TaskModal({ task, currentUserId, onClose, onUpdate }: TaskModalProps) {
  const { show } = useToast()
  const [checklist, setChecklist] = useState<any[]>([])
  const [newCheckText, setNewCheckText] = useState('')
  const [logHours, setLogHours] = useState('')
  const [loggingTime, setLoggingTime] = useState(false)

  useEffect(() => {
    if (task) {
      // Приводим поля к единому стандарту .done для интерфейса Клода
      const normalizedChecklist = (task.checklist ?? []).map((c: any) => ({
        ...c,
        done: c.done ?? c.is_done ?? false
      }))
      setChecklist(normalizedChecklist)
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [task])

  if (!task) return null

  const doneCount = checklist.filter(c => c.done).length
  const pendingHours = task.pending_hours ?? 0
  const approvedHours = task.approved_hours ?? 0

  // Управление чекбоксами через прямое обращение к таблице
  const toggleCheck = async (item: any) => {
    const newDone = !item.done
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: newDone } : c))
    
    const { error } = await supabase
      .from('task_checklist')
      .update({ is_done: newDone, done: newDone })
      .eq('id', item.id)

    if (error) {
      show('Не удалось обновить чеклист', 'error')
      setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: !newDone } : c))
    } else {
      onUpdate()
    }
  }

  // Добавление новых пунктов в чеклист
  const addCheckItem = async () => {
    if (!newCheckText.trim()) return
    const text = newCheckText.trim()
    setNewCheckText('')

    const { data, error } = await supabase
      .from('task_checklist')
      .insert({ task_id: task.id, text, sort_order: checklist.length + 1, is_done: false, done: false })
      .select()
      .single()

    if (error) {
      show('Ошибка при добавлении пункта', 'error')
    } else if (data) {
      setChecklist(prev => [...prev, { ...data, done: false }])
      onUpdate()
    }
  }

  // Логирование рабочего времени
  const submitTime = async () => {
    const hours = parseFloat(logHours)
    if (isNaN(hours) || hours <= 0) {
      show('Введите корректное количество часов', 'error')
      return
    }

    setLoggingTime(true)
    const { error } = await timeLogsApi.log({
      task_id: task.id,
      user_id: currentUserId,
      hours,
      status: 'pending',
      description: 'Лог из веб-интерфейса доски',
    })

    setLoggingTime(false)
    if (error) {
      show('Ошибка логирования времени', 'error')
    } else {
      show('Время отправлено на утверждение руководителю', 'success')
      setLogHours('')
      onUpdate()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#FBFAF6] w-full max-w-[540px] rounded-[32px] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.16)] overflow-y-auto max-h-[90vh] border border-black/[0.04]">
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#79747E] hover:bg-black/[0.06] transition-colors">
          <X size={18} />
        </button>

        <h2 className="font-display font-black text-[20px] text-[#1C1B1F] leading-tight pr-8 mb-4">
          {task.title}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-5 bg-black/[0.02] p-3 rounded-[20px]">
          <div>
            <span className="text-[11px] font-bold text-[#79747E] block mb-1">Исполнитель</span>
            {task.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar initials={task.assignee.initials} color={task.assignee.color} colorBg={task.assignee.color_bg} size="sm" />
                <span className="text-[13px] font-medium text-[#1C1B1F]">{task.assignee.name}</span>
              </div>
            ) : <span className="text-[13px] text-[#79747E]">—</span>}
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#79747E] block mb-1">Сцена / Локация</span>
            <span className="text-[13px] font-semibold text-[#49454F]">
              🎬 {task.scene?.title || task.scene?.name || 'Общая'}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-[12px] font-bold text-[#79747E] mb-1.5">Описание задачи</h4>
          <div className="bg-white rounded-[18px] p-3.5 border border-black/[0.04] text-[13px] text-[#49454F] leading-relaxed min-h-[60px] whitespace-pre-wrap">
            {task.description || <span className="text-gray-400 italic">Описание отсутствует</span>}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[12px] font-bold text-[#79747E]">Критерии готовности (DoD)</h4>
            <span className="text-[11px] font-bold text-[#79747E] bg-black/[0.04] px-2 py-0.5 rounded-full">
              {doneCount}/{checklist.length}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 mb-2.5 max-h-[200px] overflow-y-auto pr-1">
            {checklist.map(item => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item)}
                className="flex items-start gap-3 w-full text-left p-2.5 rounded-[14px] hover:bg-black/[0.03] transition-colors group"
              >
                <CheckSquare size={16} className={clsx('mt-0.5 shrink-0 transition-colors', item.done ? 'text-[#6750A4]' : 'text-[#79747E] group-hover:text-[#49454F]')} />
                <span className={clsx('text-[13px] transition-all', item.done ? 'line-through text-[#9E9E9E]' : 'text-[#1C1B1F]')}>
                  {item.text}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCheckText}
              onChange={e => setNewCheckText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCheckItem()}
              placeholder="Добавить критерий..."
              className="flex-1 text-[13px] border border-black/[0.08] rounded-[14px] px-3 py-2 outline-none focus:border-[#C3B1E1] bg-white font-sans"
            />
            <button onClick={addCheckItem} className="w-9 h-9 bg-[#E8DEF8] text-[#6750A4] rounded-[14px] flex items-center justify-center hover:bg-[#D0BCFF] transition-colors shrink-0">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="border-t border-black/[0.06] pt-4">
          <h4 className="text-[12px] font-bold text-[#79747E] mb-2 flex items-center gap-1">
            <Clock size={13} /> Трекинг рабочего времени
          </h4>

          {(pendingHours > 0 || approvedHours > 0) && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {pendingHours > 0 && (
                <Badge variant="pending">⏳ {pendingHours} ч. ожидает</Badge>
              )}
              {approvedHours > 0 && (
                <Badge variant="approved">✓ {approvedHours} ч. утверждено</Badge>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="number"
              value={logHours}
              onChange={e => setLogHours(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitTime()}
              placeholder="Часов (напр. 2.5)"
              min="0.5"
              max="24"
              step="0.5"
              className="flex-1 text-sm border border-[#FFCC80] rounded-[12px] px-3 py-2 outline-none focus:border-[#FFA000] bg-white font-sans"
            />
            <button
              onClick={submitTime}
              disabled={loggingTime}
              className="px-4 py-2 bg-[#FFE0B2] text-[#E65100] rounded-[12px] text-sm font-display font-bold hover:bg-[#FFCC80] transition-colors disabled:opacity-50"
            >
              {loggingTime ? '...' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}