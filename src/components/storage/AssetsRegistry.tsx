'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useAssets } from '@/hooks/useStorage'
import { Avatar } from '@/components/ui/atoms'
import { useToast } from '@/components/ui/ToastProvider'

// Индикатор этапа — кликабельный кружок
function StageCheck({
  done,
  onClick,
  label,
}: {
  done: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={`${label}: ${done ? 'Готово' : 'Не готово'} — нажми чтобы изменить`}
      className={clsx(
        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 mx-auto',
        'hover:scale-110 active:scale-95',
        done
          ? 'bg-[#A5D6A7] border-[#66BB6A] text-[#1B5E20]'
          : 'border-[#D0D0D0] hover:border-[#C3B1E1]'
      )}
    >
      {done && <span className="text-[10px] font-black">✓</span>}
    </button>
  )
}

// Инлайн-редактируемое имя
function EditableName({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText]       = useState(value)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save = () => {
    setEditing(false)
    if (text.trim() && text !== value) onSave(text.trim())
    else setText(value)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setText(value); setEditing(false) } }}
        className="w-full text-[13px] font-semibold border border-[#C3B1E1] rounded-[8px] px-2 py-0.5 outline-none bg-[#F8F4FF]"
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="text-[13px] font-semibold cursor-text hover:text-[#7D5ED4] transition-colors"
      title="Нажми чтобы переименовать"
    >
      {value}
    </span>
  )
}

// Форма добавления нового объекта
function AddAssetRow({
  sceneId,
  onAdd,
  onCancel,
}: {
  sceneId: string
  onAdd: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <tr className="bg-[#F8F4FF]">
      <td className="py-2 px-3" colSpan={2}>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) onAdd(name.trim())
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="Название объекта..."
          className="w-full text-[13px] border border-[#C3B1E1] rounded-[8px] px-2 py-1 outline-none bg-white"
        />
      </td>
      <td className="py-2 px-3 text-center text-[#E0E0E0]">○</td>
      <td className="py-2 px-3 text-center text-[#E0E0E0]">○</td>
      <td className="py-2 px-3 text-center text-[#E0E0E0]">○</td>
      <td className="py-2 px-3">
        <div className="flex gap-1">
          <button
            onClick={() => name.trim() && onAdd(name.trim())}
            disabled={!name.trim()}
            className="px-2 py-1 bg-[#C8E6C9] text-[#1B5E20] rounded-[8px] text-[11px] font-bold disabled:opacity-40"
          >
            ✓
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1 bg-[#F2EDE6] text-[#79747E] rounded-[8px] text-[11px] font-bold"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}

// Строка сцены (группировка)
function SceneHeader({
  scene,
  count,
  progress,
  expanded,
  onToggle,
  onAddAsset,
}: {
  scene: any
  count: number
  progress: number
  expanded: boolean
  onToggle: () => void
  onAddAsset: () => void
}) {
  const SCENE_COLORS: Record<string, string> = {
    kunackaya: '#D4897A',
    devichya:  '#7AA8D4',
    hozbolk:   '#8DAE7A',
    dvor:      '#C4A86A',
  }
  const color = SCENE_COLORS[scene.slug] ?? '#C3B1E1'

  return (
    <tr className="bg-[#F2EDE6] cursor-pointer select-none" onClick={onToggle}>
      <td className="py-2.5 px-3 rounded-l-[10px]" colSpan={2}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="font-display font-black text-[13px]">{scene.name}</span>
          <span className="text-[11px] text-[#79747E] font-semibold">{count} объектов</span>
        </div>
      </td>
      <td className="py-2.5 px-3" colSpan={3}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: color }}
            />
          </div>
          <span className="text-[11px] font-bold" style={{ color }}>{progress}%</span>
        </div>
      </td>
      <td className="py-2.5 px-3 rounded-r-[10px]">
        <button
          onClick={e => { e.stopPropagation(); onAddAsset() }}
          className="w-6 h-6 rounded-[7px] bg-white flex items-center justify-center text-[#79747E] hover:bg-[#E8DEF8] hover:text-[#7D5ED4] transition-colors"
        >
          <Plus size={12} />
        </button>
      </td>
    </tr>
  )
}

// ── Главный компонент ─────────────────────────────────────────

export default function AssetsRegistry() {
  const { assets, scenes, loading, toggleStage, addAsset, renameAsset, deleteAsset, byScene, sceneProgress } = useAssets()
  const { show } = useToast()
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({})
  const [addingFor, setAddingFor]       = useState<string | null>(null)
  const [hoveredRow, setHoveredRow]     = useState<string | null>(null)

  // По умолчанию все развёрнуты
  useEffect(() => {
    if (scenes.length && Object.keys(expanded).length === 0) {
      const init: Record<string, boolean> = {}
      scenes.forEach(s => { init[s.id] = true })
      setExpanded(init)
    }
  }, [scenes])

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const handleAdd = async (name: string, sceneId: string) => {
    await addAsset(name, sceneId)
    setAddingFor(null)
    show(`Объект "${name}" добавлен`, 'success')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить объект "${name}"?`)) return
    await deleteAsset(id)
    show(`Объект "${name}" удалён`, 'info')
  }

  // Статистика
  const totalObjects   = assets.length
  const totalStages    = totalObjects * 3
  const completedStages = assets.reduce((s: number, a: any) =>
    s + (a.stage_3d ? 1 : 0) + (a.stage_code ? 1 : 0) + (a.stage_content ? 1 : 0), 0)
  const overallProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-[#F2EDE6] rounded-[12px] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-5">
      {/* Шапка с прогрессом */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-black text-xl mb-0.5">Assets Registry</h2>
          <p className="text-sm text-[#79747E]">
            {totalObjects} объектов · {completedStages}/{totalStages} этапов · {overallProgress}% готово
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Легенда */}
          <div className="flex items-center gap-3 text-[11px] text-[#79747E] font-semibold">
            <span className="flex items-center gap-1"><span className="text-[#388E3C]">●</span> Готово</span>
            <span className="flex items-center gap-1"><span className="text-[#E0E0E0]">○</span> В процессе</span>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-[24px] border border-black/[0.08] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F7F4EF] border-b border-black/[0.06]">
              <th className="text-left py-3 px-3 font-display font-bold text-[12px] text-[#49454F] w-[200px]">Объект</th>
              <th className="text-left py-3 px-3 font-display font-bold text-[12px] text-[#49454F]">Исполнитель</th>
              <th className="text-center py-3 px-3 font-display font-bold text-[12px] text-[#49454F] w-[80px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#FFCC80]" />3D
                </span>
              </th>
              <th className="text-center py-3 px-3 font-display font-bold text-[12px] text-[#49454F] w-[80px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#90CAF9]" />Код
                </span>
              </th>
              <th className="text-center py-3 px-3 font-display font-bold text-[12px] text-[#49454F] w-[80px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#CE93D8]" />Звук/Текст
                </span>
              </th>
              <th className="w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {scenes.map(scene => {
              const sceneAssets = byScene(scene.id)
              const progress = sceneProgress(scene.id)
              const isExpanded = expanded[scene.id] ?? true

              return (
                <>
                  {/* Заголовок сцены */}
                  <SceneHeader
                    key={`scene-${scene.id}`}
                    scene={scene}
                    count={sceneAssets.length}
                    progress={progress}
                    expanded={isExpanded}
                    onToggle={() => toggle(scene.id)}
                    onAddAsset={() => {
                      setExpanded(p => ({ ...p, [scene.id]: true }))
                      setAddingFor(scene.id)
                    }}
                  />

                  {/* Строки объектов */}
                  {isExpanded && sceneAssets.map((asset: any) => (
                    <tr
                      key={asset.id}
                      className="border-b border-black/[0.04] hover:bg-[#FAFAFA] transition-colors group"
                      onMouseEnter={() => setHoveredRow(asset.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="py-2.5 px-3 pl-8">
                        <EditableName
                          value={asset.name}
                          onSave={name => renameAsset(asset.id, name)}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        {asset.assignee ? (
                          <Avatar
                            initials={asset.assignee.initials}
                            color={asset.assignee.color}
                            colorBg={asset.assignee.color_bg}
                            size="sm"
                          />
                        ) : (
                          <span className="text-[11px] text-[#BDBDBD]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StageCheck
                          done={asset.stage_3d}
                          label="3D-модель"
                          onClick={() => toggleStage(asset.id, 'stage_3d', asset.stage_3d)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StageCheck
                          done={asset.stage_code}
                          label="Код/Логика"
                          onClick={() => toggleStage(asset.id, 'stage_code', asset.stage_code)}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StageCheck
                          done={asset.stage_content}
                          label="Звук/Текст"
                          onClick={() => toggleStage(asset.id, 'stage_content', asset.stage_content)}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleDelete(asset.id, asset.name)}
                          className={clsx(
                            'w-6 h-6 rounded-[7px] flex items-center justify-center transition-all',
                            hoveredRow === asset.id
                              ? 'opacity-100 bg-[#FFCDD2] text-[#7B1F2A]'
                              : 'opacity-0'
                          )}
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Строка добавления */}
                  {isExpanded && addingFor === scene.id && (
                    <AddAssetRow
                      key={`add-${scene.id}`}
                      sceneId={scene.id}
                      onAdd={name => handleAdd(name, scene.id)}
                      onCancel={() => setAddingFor(null)}
                    />
                  )}

                  {/* Пустой спейсер между сценами */}
                  <tr key={`gap-${scene.id}`}><td colSpan={6} className="h-2" /></tr>
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
