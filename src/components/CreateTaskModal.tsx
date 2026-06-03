'use client'

import { useState } from 'react'
import { Plus, Zap } from 'lucide-react'
import clsx from 'clsx'
import {
  ModalBackdrop, ModalSheet, ModalHeader,
  Button, Input, Textarea, Select, dim,
} from '@/components/ui/design-system'
import { tasksApi } from '@/lib/supabase'
import { useToast } from '@/components/ui/ToastProvider'
import type { TeamMember } from '@/hooks/useCurrentUser'

const WORK_TYPES = [
  { value: '3d',    label: '3D',    color: '#FF8639' },
  { value: 'code',  label: 'Код',   color: '#47CAFB' },
  { value: 'sound', label: 'Звук',  color: '#FF88BD' },
  { value: 'text',  label: 'Текст', color: '#4ADE80' },
]

export interface CreateTaskModalProps {
  members:     TeamMember[]
  scenes:      { id: string; name: string; slug: string }[]
  currentUser: TeamMember
  onClose:     () => void
  onCreated:   () => void
}

export default function CreateTaskModal({ members, scenes, currentUser, onClose, onCreated }: CreateTaskModalProps) {
  const { show } = useToast()
  const [title,       setTitle]      = useState('')
  const [description, setDesc]       = useState('')
  const [workType,    setWorkType]   = useState('')
  const [assigneeId,  setAssigneeId] = useState(currentUser.id)
  const [sceneId,     setSceneId]    = useState('')
  const [priority,    setPriority]   = useState<'normal' | 'urgent'>('normal')
  const [saving,      setSaving]     = useState(false)

  const submit = async () => {
    if (!title.trim()) { show('Введи название задачи', 'error'); return }
    setSaving(true)
    const { error } = await tasksApi.create({
      title: title.trim(), description: description.trim() || null,
      status: 'backlog', priority,
      work_type: workType || null, assignee_id: assigneeId || null,
      scene_id: sceneId || null, sort_order: 0, created_by: currentUser.id,
    })
    setSaving(false)
    if (error) { show('Ошибка при создании', 'error'); return }
    show(`"${title.trim()}" добавлена в бэклог`, 'success')
    onCreated(); onClose()
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalSheet>
        <ModalHeader
          icon={<Plus size={20} color="#FF8639" strokeWidth={2.5} />}
          title="Новая задача"
          subtitle="Попадёт в Бэклог · Видно всей команде"
          accentColor="#FF8639"
          onClose={onClose}
        />

        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[62vh]">

          <Input label="Название *" value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submit() }}
            placeholder="Что нужно сделать?" autoFocus />

          <Textarea label="Описание" value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Детали, ссылки, критерии приёмки..." rows={3} />

          {/* Тип работы */}
          <div>
            <p className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B7494', fontFamily: 'Nunito, sans-serif' }}>Тип работы</p>
            <div className="flex gap-2 flex-wrap">
              {WORK_TYPES.map(wt => {
                const sel = workType === wt.value
                return (
                  <button key={wt.value} onClick={() => setWorkType(sel ? '' : wt.value)}
                    className="px-4 py-2 rounded-[12px] text-[13px] font-bold border-2 transition-all"
                    style={sel
                      ? { background: dim(wt.color, 0.15), color: wt.color, borderColor: dim(wt.color, 0.35), transform: 'scale(1.05)', fontFamily: 'Nunito, sans-serif' }
                      : { background: 'transparent', color: '#6B7494', borderColor: 'rgba(255,255,255,0.10)', fontFamily: 'Nunito, sans-serif' }
                    }>
                    {wt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Приоритет */}
          <div>
            <p className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B7494', fontFamily: 'Nunito, sans-serif' }}>Приоритет</p>
            <div className="flex gap-2">
              <Button variant={priority === 'normal' ? 'secondary' : 'ghost'} size="md"
                className="flex-1" onClick={() => setPriority('normal')}>— Обычный</Button>
              <Button variant={priority === 'urgent' ? 'danger' : 'ghost'} size="md"
                icon={<Zap size={13} />} className="flex-1" onClick={() => setPriority('urgent')}>Срочно</Button>
            </div>
          </div>

          {scenes.length > 0 && (
            <Select label="Сцена / Комната" value={sceneId} onChange={e => setSceneId((e.target as HTMLSelectElement).value)}>
              <option value="">— Без сцены</option>
              {scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}

          {/* Исполнитель */}
          <div>
            <p className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#6B7494', fontFamily: 'Nunito, sans-serif' }}>Исполнитель</p>
            <div className="flex gap-2 flex-wrap">
              {members.filter(m => m.role === 'member').map(m => {
                const sel = assigneeId === m.id
                return (
                  <button key={m.id} onClick={() => setAssigneeId(sel ? '' : m.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-[12px] border-2 transition-all"
                    style={sel
                      ? { background: dim(m.color, 0.15), borderColor: dim(m.color, 0.40), transform: 'scale(1.03)' }
                      : { borderColor: 'rgba(255,255,255,0.08)' }
                    }>
                    <div className="w-6 h-6 rounded-[8px] flex items-center justify-center text-[10px] font-black"
                      style={{ background: dim(m.color, 0.22), color: m.color, fontFamily: 'Nunito, sans-serif' }}>
                      {m.initials}
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: sel ? '#F1F3FA' : '#A8B0C8', fontFamily: 'Nunito, sans-serif' }}>
                      {m.name}
                    </span>
                  </button>
                )
              })}
              <button onClick={() => setAssigneeId('')}
                className="px-3 py-2 rounded-[12px] border-2 text-[13px] font-semibold transition-all"
                style={{
                  background: assigneeId === '' ? '#2A2F45' : 'transparent',
                  borderColor: assigneeId === '' ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.08)',
                  color: assigneeId === '' ? '#F1F3FA' : '#6B7494',
                  fontFamily: 'Nunito, sans-serif',
                }}>
                Не назначен
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Отмена</Button>
          <Button variant="primary"   size="lg" className="flex-1" onClick={submit}
            loading={saving} disabled={!title.trim()}>
            {!saving && '+ Создать задачу'}
          </Button>
        </div>
      </ModalSheet>
    </ModalBackdrop>
  )
}
