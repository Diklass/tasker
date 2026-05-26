'use client'

import { useState } from 'react'
import { Eye, Edit3, Save, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useDocument } from '@/hooks/useStorage'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

// Динамический импорт MD Editor — тяжёлая либа
import dynamic from 'next/dynamic'
const MDEditor   = dynamic(() => import('@uiw/react-md-editor'), { ssr: false, loading: () => <div className="h-[400px] bg-[#F7F4EF] rounded-[16px] animate-pulse" /> })
const MDPreview  = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false, loading: () => <div className="h-[200px]" /> })

interface DocumentEditorProps {
  slug: string
  onBack: () => void
}

export default function DocumentEditor({ slug, onBack }: DocumentEditorProps) {
  const { doc, loading, saving, savedAt, updateContent } = useDocument(slug)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-[#F2EDE6] rounded-xl animate-pulse mb-4" />
        <div className="h-[500px] bg-[#F2EDE6] rounded-[24px] animate-pulse" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="p-6 text-center text-[#79747E]">
        Документ не найден
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Тулбар */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.06]">
        <button
          onClick={onBack}
          className="text-[13px] text-[#79747E] hover:text-[#1C1B1F] font-semibold transition-colors"
        >
          ← Назад
        </button>
        <div className="w-px h-5 bg-black/[0.10]" />
        <span className="text-xl">{doc.icon}</span>
        <h2 className="font-display font-black text-lg flex-1">{doc.title}</h2>

        {/* Статус сохранения */}
        <div className={clsx(
          'flex items-center gap-1.5 text-[11px] font-semibold transition-all',
          saving ? 'text-[#E65100]' : 'text-[#9E9E9E]'
        )}>
          {saving ? (
            <><div className="w-2 h-2 rounded-full bg-[#E65100] animate-pulse" /> Сохраняю...</>
          ) : savedAt ? (
            <><Clock size={11} /> Сохранено {formatDistanceToNow(savedAt, { locale: ru, addSuffix: true })}</>
          ) : (
            <><Save size={11} /> Автосохранение</>
          )}
        </div>

        {/* Переключатель режима */}
        <div className="flex bg-[#F2EDE6] rounded-[12px] p-0.5">
          <button
            onClick={() => setMode('edit')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-display font-bold transition-all',
              mode === 'edit' ? 'bg-white text-[#1C1B1F] shadow-sm' : 'text-[#79747E]'
            )}
          >
            <Edit3 size={13} /> Редактор
          </button>
          <button
            onClick={() => setMode('preview')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-display font-bold transition-all',
              mode === 'preview' ? 'bg-white text-[#1C1B1F] shadow-sm' : 'text-[#79747E]'
            )}
          >
            <Eye size={13} /> Просмотр
          </button>
        </div>
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-auto p-5">
        {mode === 'edit' ? (
          <div data-color-mode="light">
            <MDEditor
              value={doc.content}
              onChange={val => updateContent(val ?? '')}
              height={560}
              preview="edit"
              style={{
                borderRadius: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                fontFamily: 'Nunito Sans, sans-serif',
              }}
            />
          </div>
        ) : (
          <div
            data-color-mode="light"
            className="bg-white rounded-[20px] border border-black/[0.08] p-8 prose prose-sm max-w-none"
          >
            <MDPreview source={doc.content} />
          </div>
        )}
      </div>
    </div>
  )
}
