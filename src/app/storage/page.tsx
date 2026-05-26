'use client'

import { useState } from 'react'
import { BookOpen, Map, Gamepad2, Package } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

// Временные заглушки вместо отсутствующих компонентов
const DocumentEditor = ({ slug, onBack }: any) => (
  <div className="p-5">
    <button onClick={onBack} className="mb-4 text-sm text-gray-500">← Назад</button>
    <h2 className="text-xl font-bold">Редактор документа: {slug}</h2>
    <p className="text-gray-400 mt-2">Компонент редактирования находится в разработке...</p>
  </div>
)

const AssetsRegistry = () => (
  <div className="p-5 text-gray-400">Реестр ассетов загружается...</div>
)

// Имитируем хук, пока его нет в папке hooks
const useAllDocuments = () => {
  return { docs: [], loading: false }
}

const DOC_ICONS: Record<string, any> = {
  roadmap: Map,
  gdd: Gamepad2,
  'assets-registry': Package,
}

type ActiveView = 'list' | 'editor' | 'assets'

export default function StoragePage() {
  const { docs, loading } = useAllDocuments()
  const [activeView, setActiveView] = useState<ActiveView>('list')
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const openDoc = (slug: string) => {
    if (slug === 'assets-registry') {
      setActiveView('assets')
    } else {
      setActiveSlug(slug)
      setActiveView('editor')
    }
  }

  const goBack = () => { setActiveView('list'); setActiveSlug(null) }

  if (activeView === 'editor' && activeSlug) {
    return <DocumentEditor slug={activeSlug} onBack={goBack} />
  }

  if (activeView === 'assets') {
    return (
      <div>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.06]">
          <button onClick={goBack} className="text-[13px] text-[#79747E] hover:text-[#1C1B1F] font-semibold transition-colors">← Назад</button>
          <div className="w-px h-5 bg-black/[0.10]" />
          <span className="text-xl">📦</span>
          <h2 className="font-display font-black text-lg">Assets Registry</h2>
        </div>
        <AssetsRegistry />
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="mb-5">
        <h1 className="font-display font-black text-2xl mb-0.5">База знаний</h1>
        <p className="text-sm text-[#79747E]">Документы проекта · Живое редактирование · Real-time синхронизация</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-[140px] bg-[#F2EDE6] rounded-[24px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(docs.length > 0 ? docs : [
            { id: '1', slug: 'roadmap',          title: 'RoadMap',         icon: '🗺', tag: 'Актуален',    tag_color: '#E8F5E9', tag_text: '#1B5E20', updated_at: new Date(Date.now() - 172800000).toISOString() },
            { id: '2', slug: 'gdd',              title: 'Game Design Doc', icon: '🎮', tag: 'Правки',      tag_color: '#FFF3E0', tag_text: '#E65100', updated_at: new Date(Date.now() - 86400000).toISOString() },
            { id: '3', slug: 'assets-registry',  title: 'Assets Registry', icon: '📦', tag: '37 объектов', tag_color: '#EDE7F6', tag_text: '#4A148C', updated_at: new Date().toISOString() },
          ] as any[]).map((doc: any) => {
            const Icon = DOC_ICONS[doc.slug] ?? BookOpen
            return (
              <button key={doc.id} onClick={() => openDoc(doc.slug)}
                className="bg-white rounded-[24px] border border-black/[0.08] p-5 text-left hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-all duration-200 group"
              >
                <Icon size={28} className="mb-3 text-[#79747E] group-hover:text-[#7D5ED4] transition-colors" />
                <div className="font-display font-black text-[16px] mb-1">{doc.title}</div>
                <div className="text-[12px] text-[#79747E] mb-3">
                  Обновлён {formatDistanceToNow(new Date(doc.updated_at), { locale: ru, addSuffix: true })}
                </div>
                {doc.tag && (
                  <span className="text-[11px] font-display font-bold px-2 py-1 rounded-[8px]"
                    style={{ background: doc.tag_color ?? '#F2EDE6', color: doc.tag_text ?? '#49454F' }}>
                    {doc.tag}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#E3F2FD] rounded-[20px] p-4">
          <p className="font-display font-bold text-[13px] text-[#0D47A1] mb-1">🔄 Real-time редактирование</p>
          <p className="text-[12px] text-[#1565C0] leading-relaxed">
            Изменения сохраняются через 1.5 сек автоматически. Все участники видят правки сразу.
          </p>
        </div>
        <div className="bg-[#EDE7F6] rounded-[20px] p-4">
          <p className="font-display font-bold text-[13px] text-[#4A148C] mb-1">✅ Assets Registry</p>
          <p className="text-[12px] text-[#6A1B9A] leading-relaxed">
            Клик по кружку меняет статус этапа. Прогресс на Dashboard обновляется мгновенно.
          </p>
        </div>
      </div>
    </div>
  )
}
