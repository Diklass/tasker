'use client'

import { useEffect, useState } from 'react'
import { Clock, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import {
  Chip, Avatar, Badge,
  ModalBackdrop, ModalSheet, ModalHeader,
  Button, Input,
} from '@/components/ui/design-system'
import { checklistApi, timeLogsApi } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'

const WORK_LABEL: Record<string, string> = { '3d':'3D', code:'Код', sound:'Звук', text:'Текст' }
const WORK_VARIANT: Record<string, any>  = { '3d':'3d', code:'code', sound:'sound', text:'text' }

export default function TaskModal({ task, currentUserId, onClose, onUpdate }: {
  task: any; currentUserId: string; onClose: () => void; onUpdate: () => void
}) {
  const { show } = useToast()
  const [checklist, setChecklist] = useState<any[]>([])
  const [newText,   setNewText]   = useState('')
  const [logHours,  setLogHours]  = useState('')
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    if (task) { setChecklist(task.checklist ?? []); document.body.style.overflow = 'hidden' }
    return () => { document.body.style.overflow = '' }
  }, [task])

  if (!task) return null

  const doneCount = checklist.filter(c => c.done).length

  const toggleCheck = async (item: any) => {
    const done = !item.done
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done } : c))
    await checklistApi.toggle(item.id, done)
    onUpdate()
  }

  const addCheck = async () => {
    const text = newText.trim()
    if (!text) return
    const { data } = await checklistApi.add(task.id, text, checklist.length)
    if (data) { setChecklist(prev => [...prev, data]); setNewText('') }
  }

  const submitTime = async () => {
    const hours = parseFloat(logHours)
    if (isNaN(hours) || hours <= 0) { show('Введи корректные часы', 'error'); return }
    setSaving(true)
    const { error } = await timeLogsApi.log({
      task_id: task.id, user_id: currentUserId, hours, status: 'pending', source: 'web',
      asset_id: null, telegram_message_id: null, reviewed_by: null, reviewed_at: null, reject_reason: null,
    })
    setSaving(false)
    if (error) { show('Ошибка логирования', 'error'); return }
    show(`${hours} ч. отправлено на апрув ⏳`, 'success')
    setLogHours('')
    onUpdate()
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalSheet className="sm:max-w-[520px] max-h-[88vh] overflow-y-auto">
        <ModalHeader
          icon={task.assignee
            ? <Avatar initials={task.assignee.initials} color={task.assignee.color} size="sm" />
            : <span className="text-lg">📋</span>
          }
          title={task.title}
          subtitle={task.scene?.name}
          accentColor={task.assignee?.color ?? '#FF8639'}
          onClose={onClose}
        />

        <div className="p-6 space-y-5">
          {/* Чипсы */}
          <div className="flex flex-wrap gap-1.5">
            {task.scene      && <Chip label={task.scene.name} variant="room" />}
            {task.work_type  && <Chip label={WORK_LABEL[task.work_type] ?? '—'} variant={WORK_VARIANT[task.work_type] ?? 'default'} />}
            {task.priority === 'urgent' && <Chip label="Срочно" variant="urgent" />}
          </div>

          {/* Описание */}
          {task.description && (
            <p className="text-sm text-[#A8B0C8] leading-relaxed bg-[#22263A] rounded-[12px] p-3 border border-[rgba(255,255,255,0.06)]">
              {task.description}
            </p>
          )}

          {/* Исполнитель */}
          <div>
            <p className="text-[10px] font-display font-bold text-[#6B7494] uppercase tracking-wider mb-2">Исполнитель</p>
            {task.assignee
              ? <div className="flex items-center gap-2.5">
                  <Avatar initials={task.assignee.initials} color={task.assignee.color} size="md" />
                  <span className="font-semibold text-sm text-[#F1F3FA]">{task.assignee.name}</span>
                  <Badge variant="info">{task.assignee.xp} XP</Badge>
                </div>
              : <span className="text-sm text-[#6B7494]">Не назначен</span>
            }
          </div>

          {/* Чеклист DoD */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-display font-bold text-[#6B7494] uppercase tracking-wider">Definition of Done</p>
              <span className="text-[10px] text-[#6B7494] font-semibold">{doneCount}/{checklist.length}</span>
            </div>
            <div className="space-y-1.5">
              {checklist.sort((a, b) => a.sort_order - b.sort_order).map(item => (
                <div key={item.id} onClick={() => toggleCheck(item)}
                  className="flex items-center gap-2.5 p-2.5 bg-[#22263A] rounded-[12px] border border-[rgba(255,255,255,0.05)] cursor-pointer hover:bg-[#2A2F45] transition-colors group/item"
                >
                  <div className={clsx(
                    'w-4 h-4 rounded-[5px] border-2 flex items-center justify-center shrink-0 transition-all',
                    item.done ? 'bg-[rgba(74,222,128,0.2)] border-[#4ADE80]' : 'border-[rgba(255,255,255,0.2)]'
                  )}>
                    {item.done && <span className="text-[#4ADE80] text-[9px] font-black">✓</span>}
                  </div>
                  <span className={clsx('text-[13px] flex-1', item.done ? 'line-through text-[#6B7494]' : 'text-[#F1F3FA]')}>
                    {item.text}
                  </span>
                  <button className="opacity-0 group-hover/item:opacity-100 transition-opacity"
                    onClick={e => { e.stopPropagation(); checklistApi.delete(item.id); setChecklist(p => p.filter(c => c.id !== item.id)) }}>
                    <Trash2 size={11} className="text-[#6B7494] hover:text-[#FF6B6B]" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input type="text" value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCheck()}
                placeholder="Добавить критерий..."
                className="flex-1 text-[13px] bg-[#22263A] border border-[rgba(255,255,255,0.10)] rounded-[12px] px-3 py-2 outline-none focus:border-[rgba(71,202,251,0.50)] text-[#F1F3FA] placeholder:text-[#6B7494] font-sans"
              />
              <Button variant="secondary" size="sm" onClick={addCheck}><Plus size={14} /></Button>
            </div>
          </div>

          {/* Время */}
          <div className="bg-[#22263A] border border-[rgba(255,134,57,0.20)] rounded-[16px] p-4">
            <p className="text-[10px] font-display font-bold text-[#6B7494] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={12} className="text-[#FF8639]" /> Залогировать время
            </p>
            <div className="flex gap-2 mb-2">
              {task.pending_hours  > 0 && <Badge variant="pending">⏳ {task.pending_hours} ч.</Badge>}
              {task.approved_hours > 0 && <Badge variant="approved">✓ {task.approved_hours} ч.</Badge>}
            </div>
            <div className="flex gap-2">
              <input type="number" value={logHours} onChange={e => setLogHours(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitTime()}
                placeholder="Часов (2.5)" min="0.5" max="24" step="0.5"
                className="flex-1 text-sm bg-[#1A1D27] border border-[rgba(255,134,57,0.30)] rounded-[12px] px-3 py-2 outline-none focus:border-[rgba(255,134,57,0.60)] text-[#F1F3FA] placeholder:text-[#6B7494] font-sans"
              />
              <Button variant="primary" size="sm" onClick={submitTime} loading={saving}>
                {!saving && 'Отправить'}
              </Button>
            </div>
            <p className="text-[10px] text-[#6B7494] mt-2">
              Или: <code className="bg-[#1A1D27] px-1.5 py-0.5 rounded text-[#FF8639] text-[10px]">/time {logHours||'X'} {task.title}</code>
            </p>
          </div>
        </div>
      </ModalSheet>
    </ModalBackdrop>
  )
}
