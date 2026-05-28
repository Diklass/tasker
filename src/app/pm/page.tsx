'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, BarChart2, Clock, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { Avatar } from '@/components/ui/atoms'
import { supabase } from '@/lib/supabase'
import { usePendingTimeLogs, useUserHours } from '@/hooks/useRealtimeTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast }        from '@/components/ui/ToastProvider'

const XP_PER_APPROVAL = 20

// ── Динамическая загрузка команды ────────────────────────────

function useTeamWorkload() {
  const [workload, setWorkload] = useState<any[]>([])

  const load = useCallback(async () => {
    // Задачи in_progress + review на каждого участника
    const { data: tasks } = await supabase
      .from('tasks')
      .select('assignee_id, status')
      .in('status', ['in_progress', 'review'])

    // Часы за последние 7 дней
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: logs } = await supabase
      .from('time_logs')
      .select('user_id, hours, status')
      .eq('status', 'approved')
      .gte('created_at', weekAgo)

    // Все участники
    const { data: users } = await supabase
      .from('users')
      .select('id, name, initials, color, color_bg, role')
      .eq('role', 'member')

    if (!users) return

    const result = users.map((u: any) => {
      const activeTasks = (tasks ?? []).filter((t: any) => t.assignee_id === u.id).length
      const weekHours   = (logs  ?? []).filter((l: any) => l.user_id   === u.id)
        .reduce((s: number, l: any) => s + Number(l.hours), 0)
      return { ...u, activeTasks, weekHours }
    })
    setWorkload(result)
  }, [])

  useEffect(() => {
    load()
    // Пересчёт при изменении задач или логов
    const c1 = supabase.channel('pm-tasks-wl')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe()
    const c2 = supabase.channel('pm-logs-wl')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'time_logs' }, load)
      .subscribe()
    return () => { supabase.removeChannel(c1); supabase.removeChannel(c2) }
  }, [load])

  return { workload, reload: load }
}

function useSprintStats() {
  const [stats, setStats] = useState({ closed: 0, overall: 0 })

  useEffect(() => {
    const load = async () => {
      const [{ count: closed }, { data: progress }] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done'),
        supabase.from('scene_progress').select('progress_pct'),
      ])
      const overall = progress?.length
        ? Math.round(progress.reduce((s: number, p: any) => s + Number(p.progress_pct), 0) / progress.length)
        : 0
      setStats({ closed: closed ?? 0, overall })
    }
    load()
  }, [])

  return stats
}

// ── Компонент ─────────────────────────────────────────────────

export default function PMPage() {
  const pendingLogs        = usePendingTimeLogs()
  const userHours          = useUserHours()
  const { workload }       = useTeamWorkload()
  const stats              = useSprintStats()
  const { manager, currentUser } = useCurrentUser()
  const { show }           = useToast()

  const [rejectId,     setRejectId]     = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing,   setProcessing]   = useState<string | null>(null)

  // ── Утвердить время ─────────────────────────────────────────
  const approve = async (log: any) => {
    if (!manager) { show('Менеджер не найден в БД', 'error'); return }
    setProcessing(log.id)

    // 1. Обновляем time_log
    const { error } = await supabase
      .from('time_logs')
      .update({
        status:      'approved',
        reviewed_by: manager.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', log.id)

    if (error) { show('Ошибка при утверждении', 'error'); setProcessing(null); return }

    // 2. Начисляем XP
    const { data: user } = await supabase.from('users').select('xp').eq('id', log.user_id).single()
    if (user) {
      await supabase.from('users').update({ xp: (user as any).xp + XP_PER_APPROVAL }).eq('id', log.user_id)
    }

    // 3. Отправляем уведомление через Telegram (fire-and-forget)
    fetch('/api/time/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logId:          log.id,
        userId:         log.user_id,
        userName:       log.user?.name,
        hours:          log.hours,
        taskTitle:      log.task?.title,
        xpAwarded:      XP_PER_APPROVAL,
      }),
    }).catch(() => {})

    show(`✅ Утверждено! ${log.user?.name} +${XP_PER_APPROVAL} XP`, 'success')
    setProcessing(null)
  }

  // ── Отклонить время ─────────────────────────────────────────
  const reject = async (log: any) => {
    if (!rejectReason.trim()) { show('Укажи причину', 'error'); return }
    if (!manager) { show('Менеджер не найден', 'error'); return }
    setProcessing(log.id)

    const { error } = await supabase
      .from('time_logs')
      .update({
        status:        'rejected',
        reviewed_by:   manager.id,
        reviewed_at:   new Date().toISOString(),
        reject_reason: rejectReason.trim(),
      })
      .eq('id', log.id)

    if (error) { show('Ошибка при отклонении', 'error'); setProcessing(null); return }

    // Уведомление в Telegram
    fetch('/api/time/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logId:     log.id,
        userId:    log.user_id,
        userName:  log.user?.name,
        hours:     log.hours,
        taskTitle: log.task?.title,
        reason:    rejectReason.trim(),
      }),
    }).catch(() => {})

    show(`❌ Отклонено. ${log.user?.name} уведомлён`, 'info')
    setRejectId(null)
    setRejectReason('')
    setProcessing(null)
  }

  // Максимальное кол-во активных задач для бара
  const maxTasks = Math.max(...workload.map(w => w.activeTasks), 1)
  const maxHours = Math.max(...workload.map(w => w.weekHours), 1)

  return (
    <div className="p-5">
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-0.5">
          <h1 className="font-display font-black text-2xl">PM Dashboard</h1>
          <span className="text-[11px] bg-[#E8DEF8] text-[#4A3F78] px-2.5 py-1 rounded-[8px] font-display font-bold">
            {currentUser?.role === 'manager' ? '👑 Руководитель' : '🔒 Только для PM'}
          </span>
        </div>
        <p className="text-sm text-[#79747E]">Аналитика команды · Утверждение времени</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* Стат: задачи */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5 text-center">
          <div className="font-display font-black text-4xl text-[#4A3F78] mb-1">{stats.closed}</div>
          <div className="text-[12px] text-[#79747E] font-semibold">Закрыто задач</div>
        </div>

        {/* Стат: прогресс */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5 text-center">
          <div className="font-display font-black text-4xl text-[#4A3F78] mb-1">{stats.overall}%</div>
          <div className="text-[12px] text-[#79747E] font-semibold">Прогресс проекта</div>
        </div>

        {/* Загрузка команды — динамическая */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-4">
            <BarChart2 size={17} /> Загрузка команды
          </div>
          {workload.length === 0 ? (
            <div className="text-sm text-[#79747E] py-4 text-center">Загрузка...</div>
          ) : (
            <div className="space-y-3">
              {workload.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-[12px] font-bold w-24 shrink-0 truncate" style={{ color: m.color }}>{m.name}</span>
                  <div className="flex-1 h-3 bg-[#F2EDE6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(m.activeTasks / maxTasks) * 100}%`, background: m.color }}
                    />
                  </div>
                  <span className="text-[11px] text-[#79747E] w-12 text-right">{m.activeTasks} зад.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Часы за неделю — динамические */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-4">
            <Clock size={17} /> Часы за 7 дней
          </div>
          {workload.length === 0 ? (
            <div className="text-sm text-[#79747E] py-4 text-center">Загрузка...</div>
          ) : (
            <div className="space-y-2.5">
              {workload.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar initials={m.initials} color={m.color} colorBg={m.color_bg} size="sm" />
                  <div className="flex-1 h-2.5 bg-[#F2EDE6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(m.weekHours / Math.max(maxHours, 20)) * 100}%`, background: m.color }}
                    />
                  </div>
                  <span className="text-[12px] font-display font-black w-14 text-right" style={{ color: m.color }}>
                    {m.weekHours.toFixed(1)} ч.
                  </span>
                </div>
              ))}
              <div className="mt-2 bg-[#E3F2FD] rounded-[12px] px-3 py-2 text-[12px] text-[#0D47A1] font-semibold">
                📱 Через бот: <code className="bg-white px-1 rounded text-[#E65100]">/time 3.5 Котурны</code>
              </div>
            </div>
          )}
        </div>

        {/* Апрув времени — реальный */}
        <div className="col-span-2 bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-4">
            <TrendingUp size={17} /> Апрув времени
            {pendingLogs.length > 0 && (
              <span className="ml-1 text-[11px] bg-[#FFF3E0] text-[#E65100] px-2 py-0.5 rounded-[8px] font-bold">
                {pendingLogs.length} ожидают
              </span>
            )}
          </div>

          {pendingLogs.length === 0 ? (
            <div className="text-center py-8 text-[#79747E]">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-semibold text-sm">Всё утверждено</p>
              <p className="text-[12px] mt-1">Новые запросы появятся здесь автоматически</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingLogs.map((log: any) => (
                <div key={log.id}>
                  <div className={clsx(
                    'flex items-center gap-3 p-3.5 bg-[#F7F4EF] rounded-[18px] transition-opacity',
                    processing === log.id && 'opacity-50 pointer-events-none'
                  )}>
                    <Avatar
                      initials={log.user?.initials ?? '?'}
                      color={log.user?.color ?? '#999'}
                      colorBg={log.user?.color_bg ?? '#eee'}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate">{log.task?.title ?? '—'}</p>
                      <p className="text-[11px] text-[#79747E]">
                        {log.user?.name}
                        {log.source === 'telegram' ? ' · 📱 через бот' : ' · 🌐 веб'}
                        {' · '}{new Date(log.created_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="font-display font-black text-xl text-[#1C1B1F] mx-2">
                      {log.hours} ч.
                    </span>
                    <button
                      onClick={() => approve(log)}
                      disabled={processing === log.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#C8E6C9] text-[#1B5E20] rounded-[12px] text-[12px] font-display font-bold hover:bg-[#A5D6A7] transition-colors mr-1.5 disabled:opacity-50"
                    >
                      <CheckCircle size={14} /> Утвердить
                    </button>
                    <button
                      onClick={() => setRejectId(rejectId === log.id ? null : log.id)}
                      disabled={processing === log.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#FFCDD2] text-[#7B1F2A] rounded-[12px] text-[12px] font-display font-bold hover:bg-[#EF9A9A] transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} /> Отклонить
                    </button>
                  </div>

                  {/* Инлайн-форма причины */}
                  {rejectId === log.id && (
                    <div className="mt-2 p-3 bg-[#FFEBEE] rounded-[14px]">
                      <p className="text-[11px] font-display font-bold text-[#C62828] mb-2">Причина отклонения:</p>
                      <div className="flex gap-2 flex-wrap mb-2">
                        {['Задача не готова', 'Слишком много часов', 'Неверная задача', 'Уточни и повтори'].map(r => (
                          <button key={r} onClick={() => setRejectReason(r)}
                            className={clsx(
                              'px-2.5 py-1 rounded-[8px] text-[11px] font-bold border transition-all',
                              rejectReason === r
                                ? 'bg-[#FFCDD2] border-[#EF5350] text-[#7B1F2A]'
                                : 'bg-white border-[#EF9A9A] text-[#9E9E9E] hover:border-[#EF5350]'
                            )}
                          >{r}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && reject(log)}
                          placeholder="Или напиши свою причину..."
                          className="flex-1 text-[13px] border border-[#EF9A9A] rounded-[10px] px-3 py-1.5 outline-none focus:border-[#EF5350] bg-white"
                        />
                        <button onClick={() => reject(log)}
                          className="px-3 py-1.5 bg-[#FFCDD2] text-[#7B1F2A] rounded-[10px] text-[12px] font-display font-bold hover:bg-[#EF9A9A] transition-colors">
                          Отклонить
                        </button>
                        <button onClick={() => { setRejectId(null); setRejectReason('') }}
                          className="px-3 py-1.5 bg-[#F2EDE6] text-[#79747E] rounded-[10px] text-[12px] font-bold hover:bg-[#E8DEF8] transition-colors">
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
