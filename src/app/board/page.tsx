'use client'

import { useState } from 'react'
import { Map, Gamepad2, Package, ArrowLeft, Clock, Edit3 } from 'lucide-react'
import clsx from 'clsx'
import dynamic from 'next/dynamic'
import { useAllDocuments } from '@/hooks/useStorage'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

const DocumentEditor = dynamic(() => import('@/components/storage/DocumentEditor'), { ssr: false })
const AssetsRegistry  = dynamic(() => import('@/components/storage/AssetsRegistry'),  { ssr: false })

const DOC_ICONS: Record<string, any> = { roadmap: Map, gdd: Gamepad2, 'assets-registry': Package }
const DOC_ACCENTS: Record<string, { color: string; bg: string; border: string }> = {
  roadmap:          { color: '#FF8639', bg: 'rgba(255,134,57,0.12)',  border: 'rgba(255,134,57,0.25)' },
  gdd:              { color: '#47CAFB', bg: 'rgba(71,202,251,0.12)',  border: 'rgba(71,202,251,0.25)' },
  'assets-registry': { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
}

type View = 'list' | 'editor' | 'assets'

export default function StoragePage() {
  const { docs, loading } = useAllDocuments()
  const [view,       setView]       = useState<View>('list')
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const open = (slug: string) => {
    if (slug === 'assets-registry') { setView('assets'); return }
    setActiveSlug(slug); setView('editor')
  }
  const back = () => { setView('list'); setActiveSlug(null) }

  if (view === 'editor' && activeSlug) return <DocumentEditor slug={activeSlug} onBack={back} />

  if (view === 'assets') return (
    <div>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.07] bg-surface">
        <button onClick={back} className="flex items-center gap-1.5 text-[13px] text-text3 hover:text-text2 font-semibold transition-colors">
          <ArrowLeft size={15} /> Назад
        </button>
        <div className="w-px h-5 bg-white/[0.08]" />
        <Package size={16} className="text-purple" />
        <h2 className="font-display font-black text-[16px] text-text1">Assets Registry</h2>
      </div>
      <AssetsRegistry />
    </div>
  )

  const displayDocs = docs.length > 0 ? docs : [
    { id: '1', slug: 'roadmap',          title: 'RoadMap',         icon: '🗺', tag: 'Актуален',    tag_color: '#0D2A18', tag_text: '#4ADE80', updated_at: new Date(Date.now() - 172800000).toISOString() },
    { id: '2', slug: 'gdd',              title: 'Game Design Doc', icon: '🎮', tag: 'Правки',      tag_color: '#2A1A0D', tag_text: '#FF8639', updated_at: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', slug: 'assets-registry',  title: 'Assets Registry', icon: '📦', tag: '37 объектов', tag_color: '#1A1F35', tag_text: '#A8C4FF', updated_at: new Date().toISOString() },
  ]

  return (
    <div className="p-5">
      <div className="mb-6">
        <h1 className="font-display font-black text-2xl text-text1 mb-0.5">База знаний</h1>
        <p className="text-sm text-text3">Документы проекта · Real-time редактирование</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[160px] bg-surface2 rounded-[20px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {displayDocs.map((doc: any) => {
            const Icon    = DOC_ICONS[doc.slug] ?? Package
            const accent  = DOC_ACCENTS[doc.slug] ?? DOC_ACCENTS.roadmap
            return (
              <button key={doc.id} onClick={() => open(doc.slug)}
                className="bg-surface border border-white/[0.07] rounded-[20px] p-5 text-left hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-card-hover transition-all duration-200 group"
              >
                <div className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-4 transition-all duration-200"
                  style={{ background: accent.bg, border: `1px solid ${accent.border}` }}>
                  <Icon size={22} style={{ color: accent.color }} />
                </div>
                <div className="font-display font-black text-[16px] text-text1 mb-1">{doc.title}</div>
                <div className="flex items-center gap-1 text-[11px] text-text3 mb-3">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(doc.updated_at), { locale: ru, addSuffix: true })}
                </div>
                {doc.tag && (
                  <span className="text-[10px] font-display font-bold px-2 py-1 rounded-[8px]"
                    style={{ background: doc.tag_color ?? '#22263A', color: doc.tag_text ?? '#A8B0C8' }}>
                    {doc.tag}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Подсказки */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0D1F2A] border border-blue/20 rounded-[18px] p-4">
          <div className="flex items-center gap-2 font-display font-bold text-[13px] text-blue mb-1.5">
            <Edit3 size={14} /> Real-time редактирование
          </div>
          <p className="text-[12px] text-text3 leading-relaxed">
            Автосохранение через 1.5 сек. Все участники видят правки мгновенно — без перезагрузки.
          </p>
        </div>
        <div className="bg-[#1A1F35] border border-purple/20 rounded-[18px] p-4">
          <div className="flex items-center gap-2 font-display font-bold text-[13px] text-purple mb-1.5">
            <Package size={14} /> Assets Registry
          </div>
          <p className="text-[12px] text-text3 leading-relaxed">
            Клик по кружку меняет статус этапа. Прогресс на Dashboard обновляется мгновенно.
          </p>
        </div>
      </div>
    </div>
  )
}
