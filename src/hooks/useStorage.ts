'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface Document {
  id: string
  slug: string
  title: string
  content: string
  icon: string
  tag: string | null
  tag_color: string | null
  tag_text: string | null
  updated_by: string | null
  updated_at: string
}

// ── useDocument — один документ с real-time и автосохранением ──

export function useDocument(slug: string) {
  const [doc, setDoc]         = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Загрузка документа
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('slug', slug)
        .single()
      setDoc(data as Document ?? null)
      setLoading(false)
    }
    load()

    // Real-time подписка
    const channel = supabase
      .channel(`doc-${slug}`)
      .on('postgres_changes' as any, {
        event: 'UPDATE', schema: 'public', table: 'documents',
        filter: `slug=eq.${slug}`,
      }, (payload: any) => {
        // Не перезаписываем если мы сами только что сохранили (в течение 2 сек)
        setDoc(prev => {
          if (!prev) return payload.new as Document
          // Если contnet пришёл другой — обновляем
          if (payload.new.content !== prev.content) return payload.new as Document
          return prev
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [slug])

  // Автосохранение с дебаунсом 1.5 сек
  const updateContent = useCallback((content: string) => {
    setDoc(prev => prev ? { ...prev, content } : prev)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      await supabase
        .from('documents')
        .update({ content })
        .eq('slug', slug)
      setSaving(false)
      setSavedAt(new Date())
    }, 1500)
  }, [slug])

  return { doc, loading, saving, savedAt, updateContent }
}

// ── useAllDocuments — список всех документов для главной Storage ──

export function useAllDocuments() {
  const [docs, setDocs]   = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('documents').select('*').order('created_at')
      setDocs((data as Document[]) ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('documents-list')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'documents' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { docs, loading }
}

// ── useAssets — assets с real-time и inline-редактированием ──

export function useAssets() {
  const [assets, setAssets]   = useState<any[]>([])
  const [scenes, setScenes]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('assets').select('*, scene:scenes(id,name,slug), assignee:users(id,name,initials,color,color_bg)').order('sort_order'),
      supabase.from('scenes').select('*').order('sort_order'),
    ])
    setAssets(a ?? [])
    setScenes(s ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('assets-rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'assets' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadAll])

  // Тоглим этап — оптимистичное обновление
  const toggleStage = useCallback(async (
    id: string,
    stage: 'stage_3d' | 'stage_code' | 'stage_content',
    current: boolean
  ) => {
    const newVal = !current
    setAssets(prev => prev.map(a => a.id === id ? { ...a, [stage]: newVal } : a))
    await supabase.from('assets').update({ [stage]: newVal }).eq('id', id)
  }, [])

  // Добавить объект
  const addAsset = useCallback(async (name: string, scene_id: string) => {
    const maxOrder = assets.filter(a => a.scene_id === scene_id).length
    const { data } = await supabase
      .from('assets')
      .insert({ name, scene_id, sort_order: maxOrder })
      .select('*, scene:scenes(id,name,slug), assignee:users(id,name,initials,color,color_bg)')
      .single()
    if (data) setAssets(prev => [...prev, data])
    return data
  }, [assets])

  // Переименовать
  const renameAsset = useCallback(async (id: string, name: string) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, name } : a))
    await supabase.from('assets').update({ name }).eq('id', id)
  }, [])

  // Удалить
  const deleteAsset = useCallback(async (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id))
    await supabase.from('assets').delete().eq('id', id)
  }, [])

  // Сгруппировать по сценам
  const byScene = useCallback((sceneId: string) =>
    assets.filter(a => a.scene_id === sceneId || a.scene?.id === sceneId),
    [assets]
  )

  // Прогресс сцены
  const sceneProgress = useCallback((sceneId: string) => {
    const list = byScene(sceneId)
    if (!list.length) return 0
    const total = list.length * 3
    const done  = list.reduce((s: number, a: any) =>
      s + (a.stage_3d ? 1 : 0) + (a.stage_code ? 1 : 0) + (a.stage_content ? 1 : 0), 0)
    return Math.round((done / total) * 100)
  }, [byScene])

  return { assets, scenes, loading, toggleStage, addAsset, renameAsset, deleteAsset, byScene, sceneProgress }
}
