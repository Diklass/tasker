'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, BarChart2, Clock, TrendingUp } from 'lucide-react'
import { Avatar } from '@/components/ui/atoms'
import { timeLogsApi } from '@/lib/supabase'
import { usePendingTimeLogs, useUserHours } from '@/hooks/useRealtimeTasks'
import { useToast } from '@/components/ui/ToastProvider'

const MANAGER_ID = 'ruslam-placeholder-id'

const LOAD_DATA = [
  { name: 'Эльдар',     color: '#D4897A', bg: '#FAF0ED', initials: 'ЭЛ', tasks: 4, max: 6 },
  { name: 'Вячеслав',   color: '#7AA8D4', bg: '#EDF3FA', initials: 'ВЯ', tasks: 3, max: 6 },
  { name: 'Константин', color: '#8DAE7A', bg: '#EFF5EC', initials: 'КО', tasks: 2, max: 6 },
]

export default function PMPage() {
  const pendingLogs = usePendingTimeLogs()
  const userHours   = useUserHours()
  const { show }    = useToast()
  const [rejectId, setRejectId]     = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const approve = async (id: string, name: string, hours: number) => {
    const { error } = await timeLogsApi.approve(id, MANAGER_ID)
    if (error) { show('Ошибка', 'error'); return }
    show(`✅ Утверждено! ${name} +${hours} ч. → +50 XP`, 'success')
  }

  const reject = async (id: string) => {
    if (!rejectReason.trim()) { show('Укажите причину отклонения', 'error'); return }
    await timeLogsApi.reject(id, MANAGER_ID, rejectReason)
    show('❌ Отклонено. Уведомление отправлено', 'info')
    setRejectId(null)
    setRejectReason('')
  }

  // Если нет данных из БД — показываем mock
  const mockPending = [
    { id: 'm1', user: { name: 'Эльдар',     initials: 'ЭЛ', color: '#D4897A', color_bg: '#FAF0ED' }, task: { title: 'Котурны — 3D-модель' }, hours: 3.5, created_at: '2 ч. назад', source: 'telegram' },
    { id: 'm2', user: { name: 'Вячеслав',   initials: 'ВЯ', color: '#7AA8D4', color_bg: '#EDF3FA' }, task: { title: 'Grab-логика стола'   }, hours: 2,   created_at: '4 ч. назад', source: 'telegram' },
    { id: 'm3', user: { name: 'Константин', initials: 'КО', color: '#8DAE7A', color_bg: '#EFF5EC' }, task: { title: 'Запись звука — очаг' }, hours: 2.5, created_at: 'вчера',       source: 'telegram' },
  ]
  const logs = pendingLogs.length > 0 ? pendingLogs : mockPending

  const mockHours = [
    { id: '1', name: 'Эльдар',     initials: 'ЭЛ', color: '#D4897A', total_hours: 11.5 },
    { id: '2', name: 'Вячеслав',   initials: 'ВЯ', color: '#7AA8D4', total_hours: 8 },
    { id: '3', name: 'Константин', initials: 'КО', color: '#8DAE7A', total_hours: 8 },
  ]
  const hours = userHours.length > 0 ? userHours : mockHours

  return (
    <div className="p-5">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-0.5">
          <h1 className="font-display font-black text-2xl">PM Dashboard</h1>
          <span className="text-[11px] bg-[#E8DEF8] text-[#4A3F78] px-2.5 py-1 rounded-[8px] font-display font-bold">
            Только для руководителя
          </span>
        </div>
        <p className="text-sm text-[#79747E]">Аналитика команды · Утверждение времени</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Стат: задачи */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5 text-center">
          <div className="font-display font-black text-4xl text-[#4A3F78] mb-1">14</div>
          <div className="text-[12px] text-[#79747E] font-semibold">Закрыто задач за спринт</div>
        </div>

        {/* Стат: прогресс */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5 text-center">
          <div className="font-display font-black text-4xl text-[#4A3F78] mb-1">47%</div>
          <div className="text-[12px] text-[#79747E] font-semibold">Общий прогресс проекта</div>
        </div>

        {/* Загрузка команды */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-4">
            <BarChart2 size={17} /> Загрузка команды
          </div>
          <div className="space-y-3">
            {LOAD_DATA.map(m => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="text-[12px] font-bold w-24 shrink-0" style={{ color: m.color }}>{m.name}</span>
                <div className="flex-1 h-3 bg-[#F2EDE6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full progress-animated"
                    style={{ width: `${(m.tasks / m.max) * 100}%`, background: m.color }}
                  />
                </div>
                <span className="text-[11px] text-[#79747E] w-10 text-right">{m.tasks} зад.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Часы за спринт */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-4">
            <Clock size={17} /> Часы за спринт
          </div>
          <div className="flex gap-5 flex-wrap mb-3">
            {hours.map((u: any) => (
              <div key={u.id} className="text-center">
                <div className="font-display font-black text-2xl" style={{ color: u.color }}>
                  {u.total_hours}
                </div>
                <div className="text-[11px] text-[#79747E]">{u.name}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#E3F2FD] rounded-[12px] px-3 py-2 text-[12px] text-[#0D47A1] font-semibold">
            📱 Через бот: <code className="bg-white px-1.5 rounded text-[#E65100]">/time 3.5 Котурны</code>
          </div>
        </div>

        {/* Апрув времени */}
        <div className="col-span-2 bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-4">
            <TrendingUp size={17} /> Апрув времени
            {logs.length > 0 && (
              <span className="ml-1 text-[11px] bg-[#FFF3E0] text-[#E65100] px-2 py-0.5 rounded-[8px] font-bold">
                {logs.length} ожидают
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {logs.map((log: any) => (
              <div key={log.id}>
                <div className="flex items-center gap-3 p-3.5 bg-[#F7F4EF] rounded-[18px]">
                  <Avatar
                    initials={log.user?.initials ?? '?'}
                    color={log.user?.color ?? '#999'}
                    colorBg={log.user?.color_bg ?? '#eee'}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate">{log.task?.title ?? 'Задача'}</p>
                    <p className="text-[11px] text-[#79747E]">
                      {log.user?.name} · {log.created_at} · {log.source === 'telegram' ? '📱 через бот' : '🌐 веб'}
                    </p>
                  </div>
                  <span className="font-display font-black text-xl text-[#1C1B1F] mx-2">{log.hours} ч.</span>
                  <button
                    onClick={() => approve(log.id, log.user?.name, log.hours)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#C8E6C9] text-[#1B5E20] rounded-[12px] text-[12px] font-display font-bold hover:bg-[#A5D6A7] transition-colors mr-1.5"
                  >
                    <CheckCircle size={14} /> Утвердить
                  </button>
                  <button
                    onClick={() => setRejectId(log.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#FFCDD2] text-[#7B1F2A] rounded-[12px] text-[12px] font-display font-bold hover:bg-[#EF9A9A] transition-colors"
                  >
                    <XCircle size={14} /> Отклонить
                  </button>
                </div>

                {/* Форма отклонения */}
                {rejectId === log.id && (
                  <div className="mt-2 p-3 bg-[#FFEBEE] rounded-[14px] flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && reject(log.id)}
                      placeholder="Причина отклонения..."
                      className="flex-1 text-[13px] border border-[#EF9A9A] rounded-[10px] px-3 py-1.5 outline-none focus:border-[#EF5350] bg-white"
                    />
                    <button onClick={() => reject(log.id)} className="px-3 py-1.5 bg-[#FFCDD2] text-[#7B1F2A] rounded-[10px] text-[12px] font-display font-bold hover:bg-[#EF9A9A] transition-colors">
                      Отклонить
                    </button>
                    <button onClick={() => setRejectId(null)} className="px-3 py-1.5 bg-[#F2EDE6] text-[#79747E] rounded-[10px] text-[12px] font-bold hover:bg-[#E0D6CC] transition-colors">
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
