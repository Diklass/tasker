'use client'

import { useState } from 'react'
import { Activity, Users, AlertCircle, Newspaper, MessageCircle, Send } from 'lucide-react'
import Link from 'next/link'
import {
  PageWrapper, PageHeader, Card, SectionTitle,
  Avatar, ProgressBar,
} from '@/components/ui/design-system'
import { useSceneProgress, useStaleTasks, useWallPosts } from '@/hooks/useRealtimeTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const SCENE_COLORS: Record<string, string> = {
  kunackaya:'#FF8639', devichya:'#47CAFB', hozbolk:'#4ADE80', dvor:'#A78BFA',
}
const MOCK_SCENES = [
  { id:'1', name:'Кунацкая',           slug:'kunackaya', progress_pct:62 },
  { id:'2', name:'Девичья комната',    slug:'devichya',  progress_pct:38 },
  { id:'3', name:'Хозяйственный блок', slug:'hozbolk',   progress_pct:51 },
  { id:'4', name:'Двор',               slug:'dvor',       progress_pct:28 },
]
const MOCK_NEWS = [
  { id:'1', tag:'Технический', tc:'#0D2A18', tt:'#4ADE80', text:'Ассет-реестр: +7 объектов Кунацкой',             time:'2 ч. назад', author:'Руслан' },
  { id:'2', tag:'Важно',       tc:'#2A1A0D', tt:'#FF8639', text:'Созвон в пятницу 17:00 — Grab + звук',           time:'вчера',      author:'Руслан' },
  { id:'3', tag:'GDD',         tc:'#1A1F35', tt:'#A8C4FF', text:'Механики взаимодействия обновлены, телепорт добавлен', time:'3 дня',author:'Вячеслав' },
]
const MOCK_CHAT = [
  { name:'Эльдар',     color:'#FF8A70', text:'Котурны почти готовы, текстуры сегодня' },
  { name:'Вячеслав',   color:'#70C4FF', text:'Grab для стола — жду модель' },
  { name:'Константин', color:'#7AE07A', text:'Амбиенты записаны, заливаю' },
]

export default function DashboardPage() {
  const { progress, overall } = useSceneProgress()
  const staleTasks = useStaleTasks()
  const { posts, sendPost } = useWallPosts()
  const { currentUser, members } = useCurrentUser()
  const [chatInput, setChatInput] = useState('')

  const scenes    = progress.length > 0 ? progress : MOCK_SCENES
  const overallPct = progress.length > 0 ? overall
    : Math.round(MOCK_SCENES.reduce((s, x) => s + x.progress_pct, 0) / MOCK_SCENES.length)

  const send = async () => {
    const text = chatInput.trim()
    if (!text || !currentUser) return
    await sendPost(currentUser.id, text)
    setChatInput('')
  }

  return (
    <PageWrapper>
      <PageHeader
        title={<>Project Hub <span className="text-[#FF8639]">●</span> Музей</>}
        subtitle="VR-проект · 4 участника · Текущий спринт"
      />

      <div className="grid grid-cols-3 gap-4">

        {/* Здоровье проекта */}
        <Card className="col-span-2">
          <div className="flex items-center justify-between mb-5">
            <SectionTitle icon={Activity} label="Здоровье проекта" />
            <div className="text-right">
              <div className="font-display font-black text-3xl text-[#FF8639]">{overallPct}%</div>
              <div className="text-[10px] text-[#6B7494]">общий прогресс</div>
            </div>
          </div>
          <div className="space-y-3">
            {scenes.map((s: any) => (
              <ProgressBar key={s.id} label={s.name} value={s.progress_pct}
                color={SCENE_COLORS[s.slug] ?? '#FF8639'} />
            ))}
          </div>
        </Card>

        {/* Команда */}
        <Card>
          <SectionTitle icon={Users} label="Команда" />
          <div className="flex flex-wrap gap-4">
            {(members.length > 0 ? members : []).map(m => (
              <div key={m.id} className="flex flex-col items-center gap-1.5">
                <Avatar initials={m.initials} color={m.color} size="lg" />
                <div className="w-11 h-1 bg-[#2A2F45] rounded-full overflow-hidden">
                  <div className="h-full rounded-full progress-animated"
                    style={{ width:`${Math.min((m.xp/1000)*100,100)}%`, background:m.color }} />
                </div>
                <span className="text-[9px] font-display font-bold" style={{ color:m.color }}>{m.xp} XP</span>
                <span className="text-[10px] text-[#6B7494]">{m.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Забытые задачи */}
        <Card>
          <SectionTitle icon={AlertCircle} label="Забытые задачи"
            extra={staleTasks.length > 0 &&
              <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-[8px] bg-[#2A0D0D] text-[#FF6B6B]">{staleTasks.length}</span>
            }
          />
          <div className="space-y-2">
            {(staleTasks.length > 0 ? staleTasks.map((t: any) => ({ title:t.title, days:t.days_stale, color:t.assignee_color ?? '#6B7494' }))
              : [{ title:'Котурны 3D-модель',color:'#FF8A70',days:6},{ title:'Grab-логика стола',color:'#70C4FF',days:5},{ title:'Запись звука — очаг',color:'#7AE07A',days:4}]
            ).map((t: any, i: number) => (
              <Link key={i} href="/board"
                className="flex items-center gap-2.5 p-2.5 bg-[#22263A] rounded-[14px] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)] hover:translate-x-0.5 transition-all block">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background:t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#F1F3FA] truncate">{t.title}</p>
                  <p className="text-[10px] text-[#6B7494]">🕐 {t.days} дн. без изменений</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Новости */}
        <Card className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={Newspaper} label="Новости проекта" />
            <button className="text-[11px] font-display font-bold px-2.5 py-1 bg-[#22263A] hover:bg-[#2A2F45] border border-[rgba(255,255,255,0.08)] rounded-[8px] text-[#A8B0C8] transition-colors">
              + Добавить
            </button>
          </div>
          <div className="divide-y divide-[rgba(255,255,255,0.05)]">
            {MOCK_NEWS.map(item => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <span className="inline-block text-[9px] font-display font-bold px-2 py-0.5 rounded-[6px] mb-1.5"
                  style={{ background:item.tc, color:item.tt }}>{item.tag}</span>
                <p className="text-[13px] text-[#F1F3FA] leading-relaxed">{item.text}</p>
                <p className="text-[10px] text-[#6B7494] mt-1">{item.author} · {item.time}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Стенгазета */}
        <Card className="flex flex-col">
          <SectionTitle icon={MessageCircle} label="Стенгазета" />
          <div className="flex-1 bg-[#22263A] rounded-[14px] border border-[rgba(255,255,255,0.05)] p-3 overflow-y-auto max-h-[160px] space-y-2.5 mb-3">
            {(posts.length > 0
              ? posts.map((p: any) => ({ name: p.user?.name, color: p.user?.color ?? '#6B7494', text: p.text }))
              : MOCK_CHAT
            ).map((m: any, i: number) => (
              <div key={i} className="text-[12px] leading-relaxed">
                <span className="font-bold" style={{ color:m.color }}>{m.name}:</span>{' '}
                <span className="text-[#A8B0C8]">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Написать заметку..."
              className="flex-1 text-[13px] bg-[#22263A] border border-[rgba(255,255,255,0.10)] rounded-[12px] px-3 py-2 outline-none focus:border-[rgba(71,202,251,0.40)] text-[#F1F3FA] placeholder:text-[#6B7494] font-sans"
            />
            <button onClick={send}
              className="w-9 h-9 bg-[#22263A] border border-[rgba(255,255,255,0.08)] rounded-[12px] flex items-center justify-center text-[#A8B0C8] hover:bg-[rgba(71,202,251,0.15)] hover:text-[#47CAFB] hover:border-[rgba(71,202,251,0.30)] transition-all">
              <Send size={14} />
            </button>
          </div>
        </Card>

      </div>
    </PageWrapper>
  )
}
