'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, BarChart2, Clock, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import {
  PageWrapper, PageHeader, Card, SectionTitle, StatCard,
  Avatar, Badge, Button, EmptyState, LoadingState,
} from '@/components/ui/design-system'
import { supabase } from '@/lib/supabase'
import { usePendingTimeLogs } from '@/hooks/useRealtimeTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useToast } from '@/components/ui/ToastProvider'

const XP_PER_APPROVAL = 20

function useTeamWorkload() {
  const [workload, setWorkload] = useState<any[]>([])
  const chRef = useRef<any>(null)
  const load = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const [{ data: tasks }, { data: logs }, { data: users }] = await Promise.all([
      supabase.from('tasks').select('assignee_id').in('status', ['in_progress','review']),
      supabase.from('time_logs').select('user_id, hours').eq('status','approved').gte('created_at', weekAgo),
      supabase.from('users').select('id,name,initials,color,role').eq('role','member'),
    ])
    if (!users) return
    setWorkload(users.map((u: any) => ({
      ...u,
      activeTasks: (tasks ?? []).filter((t: any) => t.assignee_id === u.id).length,
      weekHours:   (logs  ?? []).filter((l: any) => l.user_id    === u.id).reduce((s: number, l: any) => s + Number(l.hours), 0),
    })))
  }, [])
  useEffect(() => {
    load()
    if (chRef.current) supabase.removeChannel(chRef.current)
    chRef.current = supabase.channel('pm-wl')
      .on('postgres_changes' as any, { event:'*', schema:'public', table:'tasks' }, load)
      .on('postgres_changes' as any, { event:'*', schema:'public', table:'time_logs' }, load)
      .subscribe()
    return () => { if (chRef.current) { supabase.removeChannel(chRef.current); chRef.current = null } }
  }, [load])
  return workload
}

function useSprintStats() {
  const [stats, setStats] = useState({ closed: 0, overall: 0 })
  useEffect(() => {
    const load = async () => {
      const [{ count }, { data: p }] = await Promise.all([
        supabase.from('tasks').select('id', { count:'exact', head:true }).eq('status','done'),
        supabase.from('scene_progress').select('progress_pct'),
      ])
      const overall = p?.length ? Math.round(p.reduce((s:number,x:any)=>s+Number(x.progress_pct),0)/p.length) : 0
      setStats({ closed: count ?? 0, overall })
    }
    load()
  }, [])
  return stats
}

export default function PMPage() {
  const pendingLogs          = usePendingTimeLogs()
  const workload             = useTeamWorkload()
  const stats                = useSprintStats()
  const { manager, currentUser } = useCurrentUser()
  const { show }             = useToast()
  const [rejectId,     setRejectId]     = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing,   setProcessing]   = useState<string | null>(null)

  const approve = async (log: any) => {
    if (!manager) { show('Менеджер не найден', 'error'); return }
    setProcessing(log.id)
    await supabase.from('time_logs').update({ status:'approved', reviewed_by:manager.id, reviewed_at:new Date().toISOString() }).eq('id', log.id)
    const { data: u } = await supabase.from('users').select('xp').eq('id', log.user_id).single()
    if (u) await supabase.from('users').update({ xp: (u as any).xp + XP_PER_APPROVAL }).eq('id', log.user_id)
    fetch('/api/time/approve', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId:log.user_id, userName:log.user?.name, hours:log.hours, taskTitle:log.task?.title, xpAwarded:XP_PER_APPROVAL }) }).catch(()=>{})
    show(`✅ ${log.user?.name} +${XP_PER_APPROVAL} XP`, 'success')
    setProcessing(null)
  }

  const reject = async (log: any) => {
    if (!rejectReason.trim()) { show('Укажи причину', 'error'); return }
    if (!manager) { show('Менеджер не найден', 'error'); return }
    setProcessing(log.id)
    await supabase.from('time_logs').update({ status:'rejected', reviewed_by:manager.id, reviewed_at:new Date().toISOString(), reject_reason:rejectReason.trim() }).eq('id', log.id)
    fetch('/api/time/reject', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId:log.user_id, userName:log.user?.name, hours:log.hours, taskTitle:log.task?.title, reason:rejectReason.trim() }) }).catch(()=>{})
    show(`❌ ${log.user?.name} уведомлён`, 'info')
    setRejectId(null); setRejectReason(''); setProcessing(null)
  }

  const maxTasks = Math.max(...workload.map(w => w.activeTasks), 1)
  const maxHours = Math.max(...workload.map(w => w.weekHours), 1)

  return (
    <PageWrapper>
      <PageHeader
        title={<>PM Dashboard <span className="text-[#FF8639]">●</span></>}
        subtitle="Аналитика команды · Утверждение времени"
      >
        <Badge variant={currentUser?.role === 'manager' ? 'approved' : 'default'}>
          {currentUser?.role === 'manager' ? '👑 Руководитель' : '🔒 PM Only'}
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4">

        <StatCard value={stats.closed}          label="Задач закрыто"     color="#FF8639" />
        <StatCard value={`${stats.overall}%`}   label="Прогресс проекта"  color="#47CAFB" />

        {/* Загрузка */}
        <Card>
          <SectionTitle icon={BarChart2} label="Загрузка команды" />
          {workload.length === 0 ? <LoadingState /> : (
            <div className="space-y-3">
              {workload.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-[12px] font-bold w-24 shrink-0 truncate" style={{ color: m.color }}>{m.name}</span>
                  <div className="flex-1 h-2.5 bg-[#2A2F45] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(m.activeTasks / maxTasks) * 100}%`, background: m.color }} />
                  </div>
                  <span className="text-[11px] text-[#6B7494] w-10 text-right">{m.activeTasks} зад.</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Часы */}
        <Card>
          <SectionTitle icon={Clock} label="Часы за 7 дней" />
          {workload.length === 0 ? <LoadingState /> : (
            <div className="space-y-3">
              {workload.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar initials={m.initials} color={m.color} size="xs" />
                  <div className="flex-1 h-2 bg-[#2A2F45] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(m.weekHours / Math.max(maxHours, 20)) * 100}%`, background: m.color }} />
                  </div>
                  <span className="text-[12px] font-display font-black w-14 text-right" style={{ color: m.color }}>
                    {m.weekHours.toFixed(1)} ч.
                  </span>
                </div>
              ))}
              <div className="mt-1 bg-[#0D1F2A] border border-[rgba(71,202,251,0.20)] rounded-[12px] px-3 py-2 text-[11px] text-[#47CAFB]">
                📱 <code className="bg-[#1A1D27] px-1 rounded text-[#FF8639]">/time 3.5 Котурны</code>
              </div>
            </div>
          )}
        </Card>

        {/* Апрув */}
        <Card className="col-span-2">
          <SectionTitle icon={TrendingUp} label="Апрув времени"
            extra={pendingLogs.length > 0 &&
              <Badge variant="pending">{pendingLogs.length} ожидают</Badge>
            }
          />

          {pendingLogs.length === 0
            ? <EmptyState emoji="✅" title="Все запросы обработаны" subtitle="Новые появятся здесь автоматически" />
            : (
              <div className="space-y-2.5">
                {pendingLogs.map((log: any) => (
                  <div key={log.id}>
                    <div className={clsx(
                      'flex items-center gap-3 p-3.5 bg-[#22263A] rounded-[16px] border border-[rgba(255,255,255,0.06)] transition-opacity',
                      processing === log.id && 'opacity-40 pointer-events-none'
                    )}>
                      <Avatar initials={log.user?.initials ?? '?'} color={log.user?.color ?? '#6B7494'} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#F1F3FA] truncate">{log.task?.title ?? '—'}</p>
                        <p className="text-[11px] text-[#6B7494]">
                          {log.user?.name} · {log.source === 'telegram' ? '📱 бот' : '🌐 веб'} ·{' '}
                          {new Date(log.created_at).toLocaleString('ru', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                      <span className="font-display font-black text-2xl text-[#F1F3FA] mx-2">{log.hours}ч</span>
                      <Button variant="success" size="sm" icon={<CheckCircle size={13} />}
                        onClick={() => approve(log)} disabled={!!processing}>Утвердить</Button>
                      <Button variant="danger"  size="sm" icon={<XCircle size={13} />}
                        onClick={() => setRejectId(rejectId === log.id ? null : log.id)} disabled={!!processing} className="ml-1.5">Отклонить</Button>
                    </div>

                    {rejectId === log.id && (
                      <div className="mt-2 p-3 bg-[#2A0D0D] border border-[rgba(255,107,107,0.20)] rounded-[14px]">
                        <p className="text-[10px] font-display font-bold text-[#FF6B6B] uppercase tracking-wider mb-2">Причина:</p>
                        <div className="flex gap-1.5 flex-wrap mb-2">
                          {['Задача не готова','Много часов','Неверная задача','Уточни и повтори'].map(r => (
                            <button key={r} onClick={() => setRejectReason(r)}
                              className={clsx(
                                'px-2 py-1 rounded-[8px] text-[11px] font-bold border transition-all',
                                rejectReason === r
                                  ? 'bg-[rgba(255,107,107,0.20)] border-[rgba(255,107,107,0.50)] text-[#FF6B6B]'
                                  : 'bg-[#1A1D27] border-[rgba(255,255,255,0.10)] text-[#6B7494]'
                              )}>{r}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input autoFocus type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && reject(log)}
                            placeholder="Или напиши свою причину..."
                            className="flex-1 text-[13px] bg-[#1A1D27] border border-[rgba(255,107,107,0.30)] rounded-[10px] px-3 py-1.5 outline-none text-[#F1F3FA] placeholder:text-[#6B7494] font-sans"
                          />
                          <Button variant="danger" size="sm" onClick={() => reject(log)}>Отклонить</Button>
                          <Button variant="ghost"  size="sm" onClick={() => { setRejectId(null); setRejectReason('') }}>Отмена</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      </div>
    </PageWrapper>
  )
}
