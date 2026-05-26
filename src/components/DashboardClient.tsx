'use client'

import { useState } from 'react'
import { AlertCircle, Activity, Users, Newspaper, MessageCircle, Send } from 'lucide-react'
import { ProgressBar, Avatar, Badge } from '@/components/ui/atoms'
import {
  useSceneProgress,
  useStaleTasks,
  useWallPosts,
} from '@/hooks/useRealtimeTasks'

const SCENE_COLORS: Record<string, string> = {
  kunackaya: 'linear-gradient(90deg, #D4897A, #E8A898)',
  devichya:  'linear-gradient(90deg, #7AA8D4, #9EC4EA)',
  hozbolk:   'linear-gradient(90deg, #8DAE7A, #A9C797)',
  dvor:      'linear-gradient(90deg, #C4A86A, #D9BF85)',
}

const CURRENT_USER_ID = 'eldar-placeholder-id'

const MOCK_NEWS = [
  { id: '1', tag: 'Технический', tagColor: '#E8F5E9', tagText: '#1B5E20', text: 'Ассет-реестр обновлён: добавлено 7 новых объектов Кунацкой', time: '2 ч. назад', author: 'Руслан' },
  { id: '2', tag: 'Важно', tagColor: '#FFF3E0', tagText: '#E65100', text: 'Созвон в пятницу в 17:00. Повестка: Grab-механики и звуковой дизайн', time: 'вчера', author: 'Руслан' },
  { id: '3', tag: 'GDD', tagColor: '#EDE7F6', tagText: '#4A148C', text: 'Раздел «Механики взаимодействия» обновлён. Схема телепортации добавлена', time: '3 дня', author: 'Вячеслав' },
]

const XP_DATA = [
  { initials: 'ЭЛ', color: '#D4897A', bg: '#FAF0ED', name: 'Эльдар',     xp: 720, max: 1000 },
  { initials: 'ВЯ', color: '#7AA8D4', bg: '#EDF3FA', name: 'Вячеслав',   xp: 880, max: 1000 },
  { initials: 'КО', color: '#8DAE7A', bg: '#EFF5EC', name: 'Константин', xp: 550, max: 1000 },
  { initials: 'РУ', color: '#7D5ED4', bg: '#F3EDF7', name: 'Руслан',     xp: 950, max: 1000 },
]

const MOCK_SCENES = [
  { id: '1', name: 'Кунацкая',           slug: 'kunackaya', progress_pct: 62 },
  { id: '2', name: 'Девичья комната',    slug: 'devichya',  progress_pct: 38 },
  { id: '3', name: 'Хозяйственный блок', slug: 'hozbolk',   progress_pct: 51 },
  { id: '4', name: 'Двор',              slug: 'dvor',       progress_pct: 28 },
]

export default function DashboardPage() {
  const { progress, overall } = useSceneProgress()
  const staleTasks = useStaleTasks()
  const { posts, sendPost } = useWallPosts()
  const [chatInput, setChatInput] = useState('')

  const scenes = progress.length > 0 ? progress : MOCK_SCENES
  const overallPct = progress.length > 0 ? overall :
    Math.round(MOCK_SCENES.reduce((s, x) => s + x.progress_pct, 0) / MOCK_SCENES.length)

  const handleSend = async () => {
    const text = chatInput.trim()
    if (!text) return
    await sendPost(CURRENT_USER_ID, text)
    setChatInput('')
  }

  return (
    <div className="p-5">
      <div className="mb-5">
        <h1 className="font-display font-black text-2xl mb-0.5">
          Project Hub <span className="text-[#C3B1E1]">●</span> Музей
        </h1>
        <p className="text-sm text-[#79747E]">VR-проект · 4 участника · Текущий спринт</p>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Здоровье проекта */}
        <div className="col-span-2 bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F]">
              <Activity size={17} /> Здоровье проекта
            </div>
            <span className="font-display font-black text-2xl text-[#4A3F78]">{overallPct}%</span>
          </div>
          <div className="space-y-3">
            {scenes.map((scene: any) => (
              <div key={scene.id}>
                <div className="flex justify-between text-xs text-[#79747E] font-semibold mb-1.5">
                  <span>{scene.name}</span>
                  <span>{scene.progress_pct}%</span>
                </div>
                <div className="h-2.5 bg-[#F2EDE6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full progress-animated"
                    style={{ width: `${scene.progress_pct}%`, background: SCENE_COLORS[scene.slug] ?? '#C3B1E1' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Команда + XP */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-4">
            <Users size={17} /> Команда
          </div>
          <div className="flex flex-wrap gap-4">
            {XP_DATA.map(m => (
              <div key={m.initials} className="flex flex-col items-center gap-1.5">
                <Avatar initials={m.initials} color={m.color} colorBg={m.bg} size="lg" />
                <div className="w-11 h-1.5 bg-[#F2EDE6] rounded-full overflow-hidden">
                  <div className="h-full rounded-full progress-animated" style={{ width: `${(m.xp / m.max) * 100}%`, background: m.color }} />
                </div>
                <span className="text-[10px] font-display font-bold" style={{ color: m.color }}>{m.xp} XP</span>
                <span className="text-[10px] text-[#79747E]">{m.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Забытые задачи */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F]">
              <AlertCircle size={17} className="text-red-400" /> Забытые задачи
            </div>
            {staleTasks.length > 0 && (
              <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded-[8px] bg-[#F9DEDC] text-[#7B2121]">{staleTasks.length} шт.</span>
            )}
          </div>
          <div className="space-y-2">
            {staleTasks.length > 0 ? staleTasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-2.5 p-2.5 bg-[#F7F4EF] rounded-[16px] cursor-pointer hover:translate-x-1 transition-transform">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: task.assignee_color ?? '#BDBDBD' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{task.title}</p>
                  <p className="text-[11px] text-[#79747E]">🕐 {task.days_stale} дн. без изменений</p>
                </div>
              </div>
            )) : (
              [
                { title: 'Котурны 3D-модель', days: 6, color: '#D4897A' },
                { title: 'Grab-логика стола',  days: 5, color: '#7AA8D4' },
                { title: 'Запись звука — очаг', days: 4, color: '#8DAE7A' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-[#F7F4EF] rounded-[16px] cursor-pointer hover:translate-x-1 transition-transform">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{t.title}</p>
                    <p className="text-[11px] text-[#79747E]">🕐 {t.days} дн. без изменений</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Новости */}
        <div className="col-span-2 bg-white rounded-[24px] border border-black/[0.08] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F]">
              <Newspaper size={17} /> Новости проекта
            </div>
            <button className="text-[12px] font-display font-bold px-3 py-1.5 bg-[#E8DEF8] text-[#4A3F78] rounded-[10px] hover:bg-[#D0BCFF] transition-colors">
              + Добавить
            </button>
          </div>
          <div className="divide-y divide-black/[0.05]">
            {MOCK_NEWS.map(item => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <span className="inline-block text-[10px] font-display font-bold px-2 py-0.5 rounded-[6px] mb-1.5" style={{ background: item.tagColor, color: item.tagText }}>
                  {item.tag}
                </span>
                <p className="text-[13px] text-[#49454F] leading-relaxed">{item.text}</p>
                <p className="text-[11px] text-[#9E9E9E] mt-1">{item.author} · {item.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Стенгазета */}
        <div className="bg-white rounded-[24px] border border-black/[0.08] p-5 flex flex-col">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] text-[#49454F] mb-3">
            <MessageCircle size={17} /> Стенгазета
          </div>
          <div className="flex-1 bg-[#F7F4EF] rounded-[16px] p-3 overflow-y-auto max-h-[160px] space-y-2.5 mb-3">
            {posts.length > 0 ? posts.map((post: any) => (
              <div key={post.id} className="text-[12px] leading-relaxed">
                <span className="font-bold" style={{ color: post.user?.color ?? '#79747E' }}>{post.user?.name ?? '?'}:</span>{' '}
                <span className="text-[#49454F]">{post.text}</span>
              </div>
            )) : (
              ['Котурны почти готовы, текстуры сегодня', 'Grab для стола — жду модель', 'Амбиенты записаны, заливаю'].map((t, i) => {
                const authors = [{ n: 'Эльдар', c: '#D4897A' }, { n: 'Вячеслав', c: '#7AA8D4' }, { n: 'Константин', c: '#8DAE7A' }]
                return (
                  <div key={i} className="text-[12px] leading-relaxed">
                    <span className="font-bold" style={{ color: authors[i].c }}>{authors[i].n}:</span>{' '}
                    <span className="text-[#49454F]">{t}</span>
                  </div>
                )
              })
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Написать заметку..."
              className="flex-1 text-[13px] border border-[#E0E0E0] rounded-[12px] px-3 py-2 outline-none focus:border-[#C3B1E1] bg-white"
            />
            <button onClick={handleSend} className="w-9 h-9 bg-[#E8DEF8] text-[#4A3F78] rounded-[12px] flex items-center justify-center hover:bg-[#D0BCFF] transition-colors">
              <Send size={15} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
