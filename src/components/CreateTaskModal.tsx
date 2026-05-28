'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import clsx from 'clsx'
import { tasksApi, supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'
import type { TeamMember } from '@/hooks/useCurrentUser'

// M3 Expressive цвета из ТЗ
const ACCENT = {
  orange: { bg: '#FF8639', light: '#FFF0E8', text: '#7A2E00' },
  blue:   { bg: '#47CAFB', light: '#E6F8FF', text: '#004D70' },
  pink:   { bg: '#FF88BD', light: '#FFF0F6', text: '#7A0040' },
}

const WORK_TYPES = [
  { value: '3d',    label: '3D',    color: '#FF8639', bg: '#FFF0E8' },
  { value: 'code',  label: 'Код',   color: '#47CAFB', bg: '#E6F8FF' },
  { value: 'sound', label: 'Звук',  color: '#FF88BD', bg: '#FFF0F6' },
  { value: 'text',  label: 'Текст', color: '#8DAE7A', bg: '#EFF5EC' },
]

interface CreateTaskModalProps {
  members:     TeamMember[]
  scenes:      { id: string; name: string; slug: string }[]
  currentUser: TeamMember
  onClose:     () => void
  onCreated:   () => void
}

export default function CreateTaskModal({
  members, scenes, currentUser, onClose, onCreated,
}: CreateTaskModalProps) {
  const { show } = useToast()

  const [title,      setTitle]      = useState('')
  const [description, setDesc]      = useState('')
  const [workType,   setWorkType]   = useState<string>('')
  const [assigneeId, setAssigneeId] = useState<string>(currentUser.id)
  const [sceneId,    setSceneId]    = useState<string>('')
  const [priority,   setPriority]   = useState<'normal' | 'urgent'>('normal')
  const [saving,     setSaving]     = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) { show('Введи название задачи', 'error'); return }

    setSaving(true)
    const { error } = await tasksApi.create({
      title:       title.trim(),
      description: description.trim() || null,
      status:      'backlog',
      priority,
      work_type:   workType || null,
      assignee_id: assigneeId || null,
      scene_id:    sceneId   || null,
      sort_order:  0,
      created_by:  currentUser.id,
    })
    setSaving(false)

    if (error) {
      show('Ошибка при создании задачи', 'error')
      console.error(error)
      return
    }

    show(`Задача "${title.trim()}" добавлена в бэклог`, 'success')
    onCreated()
    onClose()
  }

  const assignee = members.find(m => m.id === assigneeId)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="animate-slide-up bg-white rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-[500px] shadow-[0_24px_48px_rgba(0,0,0,0.18)] overflow-hidden">

        {/* Шапка — оранжевый акцент */}
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #FFF0E8 0%, #FFF8F4 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: ACCENT.orange.bg }}>
                <Plus size={20} color="white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-display font-black text-[18px] text-[#1C1B1F]">Новая задача</h2>
                <p className="text-[12px] text-[#79747E]">Попадёт в Бэклог сразу</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-[10px] bg-white/70 flex items-center justify-center hover:bg-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* Название */}
          <div>
            <label className="block text-[11px] font-display font-bold text-[#79747E] uppercase tracking-wider mb-1.5">
              Название *
            </label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder="Что нужно сделать?"
              className="w-full text-[14px] font-semibold border-2 border-[#E0E0E0] rounded-[16px] px-4 py-3 outline-none focus:border-[#FF8639] transition-colors bg-white placeholder:text-[#BDBDBD]"
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-[11px] font-display font-bold text-[#79747E] uppercase tracking-wider mb-1.5">
              Описание
            </label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Детали, критерии приёмки..."
              rows={3}
              className="w-full text-[13px] border-2 border-[#E0E0E0] rounded-[16px] px-4 py-3 outline-none focus:border-[#47CAFB] transition-colors bg-white resize-none placeholder:text-[#BDBDBD] font-sans"
            />
          </div>

          {/* Тип работы */}
          <div>
            <label className="block text-[11px] font-display font-bold text-[#79747E] uppercase tracking-wider mb-1.5">
              Тип работы
            </label>
            <div className="flex gap-2 flex-wrap">
              {WORK_TYPES.map(wt => (
                <button
                  key={wt.value}
                  onClick={() => setWorkType(workType === wt.value ? '' : wt.value)}
                  className={clsx(
                    'px-4 py-2 rounded-[12px] text-[13px] font-display font-bold border-2 transition-all duration-150',
                    workType === wt.value
                      ? 'border-transparent scale-105'
                      : 'border-[#E0E0E0] bg-white text-[#49454F] hover:border-[#BDBDBD]'
                  )}
                  style={workType === wt.value ? { background: wt.bg, color: wt.color, borderColor: wt.color } : {}}
                >
                  {wt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Приоритет */}
          <div>
            <label className="block text-[11px] font-display font-bold text-[#79747E] uppercase tracking-wider mb-1.5">
              Приоритет
            </label>
            <div className="flex gap-2">
              {[
                { value: 'normal', label: '— Обычный' },
                { value: 'urgent', label: '🔥 Срочно',  active: { bg: '#FFCDD2', color: '#7B2121', border: '#EF9A9A' } },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value as 'normal' | 'urgent')}
                  className={clsx(
                    'px-4 py-2 rounded-[12px] text-[13px] font-display font-bold border-2 transition-all duration-150',
                    priority === p.value
                      ? 'scale-105'
                      : 'border-[#E0E0E0] bg-white text-[#49454F] hover:border-[#BDBDBD]'
                  )}
                  style={priority === p.value && p.active
                    ? { background: p.active.bg, color: p.active.color, borderColor: p.active.border }
                    : priority === p.value
                    ? { background: '#F2EDE6', color: '#1C1B1F', borderColor: '#BDBDBD' }
                    : {}
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Сцена */}
          {scenes.length > 0 && (
            <div>
              <label className="block text-[11px] font-display font-bold text-[#79747E] uppercase tracking-wider mb-1.5">
                Сцена / Комната
              </label>
              <select
                value={sceneId}
                onChange={e => setSceneId(e.target.value)}
                className="w-full text-[13px] border-2 border-[#E0E0E0] rounded-[16px] px-4 py-3 outline-none focus:border-[#47CAFB] transition-colors bg-white font-sans cursor-pointer"
              >
                <option value="">— Без сцены</option>
                {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Исполнитель */}
          <div>
            <label className="block text-[11px] font-display font-bold text-[#79747E] uppercase tracking-wider mb-1.5">
              Исполнитель
            </label>
            <div className="flex gap-2 flex-wrap">
              {members.filter(m => m.role === 'member').map(m => (
                <button
                  key={m.id}
                  onClick={() => setAssigneeId(assigneeId === m.id ? '' : m.id)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-[14px] border-2 transition-all duration-150',
                    assigneeId === m.id
                      ? 'scale-105 border-transparent'
                      : 'border-[#E0E0E0] hover:border-[#BDBDBD]'
                  )}
                  style={assigneeId === m.id
                    ? { background: m.color_bg, borderColor: m.color }
                    : {}
                  }
                >
                  <div
                    className="w-6 h-6 rounded-[8px] flex items-center justify-center font-display font-black text-[10px]"
                    style={{ background: m.color_bg, color: m.color }}
                  >
                    {m.initials}
                  </div>
                  <span className="text-[13px] font-semibold text-[#1C1B1F]">{m.name}</span>
                </button>
              ))}
              <button
                onClick={() => setAssigneeId('')}
                className={clsx(
                  'px-3 py-2 rounded-[14px] border-2 text-[13px] font-semibold text-[#79747E] transition-all',
                  assigneeId === ''
                    ? 'bg-[#F2EDE6] border-[#BDBDBD] scale-105'
                    : 'border-[#E0E0E0] hover:border-[#BDBDBD]'
                )}
              >
                Не назначен
              </button>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-6 py-4 border-t border-black/[0.06] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-[16px] text-[14px] font-display font-bold text-[#49454F] bg-[#F2EDE6] hover:bg-[#E8DEF8] transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className={clsx(
              'flex-1 py-3 rounded-[16px] text-[14px] font-display font-bold text-white transition-all',
              saving || !title.trim()
                ? 'opacity-50 cursor-not-allowed bg-[#FF8639]'
                : 'bg-[#FF8639] hover:bg-[#E8762E] active:scale-95 shadow-[0_4px_16px_rgba(255,134,57,0.4)]'
            )}
          >
            {saving ? 'Создаю...' : 'Создать задачу'}
          </button>
        </div>
      </div>
    </div>
  )
}
