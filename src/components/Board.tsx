'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import clsx from 'clsx'
import KanbanColumn      from './Column'
import { TaskCardOverlay } from './TaskCard'
import TaskModal          from './TaskModal'
import CreateTaskModal    from './CreateTaskModal'
import { useTasks }       from '@/hooks/useRealtimeTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { supabase }       from '@/lib/supabase'
import { useToast }       from '@/components/ui/ToastProvider'

const STATUSES = ['backlog', 'in_progress', 'review', 'done'] as const
type FilterMode = 'all' | 'my' | 'rooms'

export default function KanbanBoard() {
  const { tasks, loading, byStatus, moveTask, refetch } = useTasks()
  const { currentUser, members, currentId } = useCurrentUser()
  const { show } = useToast()

  const [activeTask,  setActiveTask]  = useState<any>(null)
  const [modalTask,   setModalTask]   = useState<any>(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [filterMode,  setFilterMode]  = useState<FilterMode>('all')
  const [selMembers,  setSelMembers]  = useState<string[]>([])
  const [scenes,      setScenes]      = useState<any[]>([])

  useEffect(() => {
    supabase.from('scenes').select('id,name,slug').order('sort_order')
      .then(({ data }) => setScenes(data ?? []))
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const filteredByStatus = useCallback((status: string): any[] => {
    let list = byStatus(status)
    if (filterMode === 'my' && currentId)
      list = list.filter((t: any) => t.assignee?.id === currentId)
    if (selMembers.length > 0)
      list = list.filter((t: any) => t.assignee && selMembers.includes(t.assignee.id))
    return list
  }, [byStatus, filterMode, selMembers, currentId])

  const toggleMember = (id: string) =>
    setSelMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleDragStart = ({ active }: DragStartEvent) =>
    setActiveTask(tasks.find((t: any) => t.id === active.id) ?? null)

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over || active.id === over.id) return

    const task = tasks.find((t: any) => t.id === active.id)
    if (!task) return

    const overTask  = tasks.find((t: any) => t.id === over.id)
    const newStatus = (STATUSES.includes(over.id as any)
      ? over.id
      : overTask?.status ?? task.status) as string

    const colTasks  = byStatus(newStatus).filter((t: any) => t.id !== task.id)
    const overIndex = overTask ? colTasks.findIndex((t: any) => t.id === overTask.id) : colTasks.length

    await moveTask(task.id, newStatus, overIndex)

    if (newStatus !== task.status) {
      if (newStatus === 'review') show(`👀 "${task.title}" отправлена на проверку`, 'success')
      if (newStatus === 'done')   show(`🎉 "${task.title}" закрыта! +50 XP`, 'success')

      fetch('/api/tasks/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, newStatus, actorName: currentUser?.name ?? 'Участник' }),
      }).catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text3 font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-orange border-t-transparent animate-spin" />
          Загружаем доску...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-5">
        {/* Шапка */}
        <div className="mb-5">
          <h1 className="font-display font-black text-2xl text-text1 mb-0.5">Kanban-доска</h1>
          <p className="text-sm text-text3">
            {tasks.length} задач · real-time
            {currentUser && (
              <span> · <span className="font-semibold" style={{ color: currentUser.color }}>{currentUser.name}</span></span>
            )}
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          {/* Segmented */}
          <div className="flex bg-surface border border-white/[0.08] rounded-[12px] p-0.5">
            {(['all', 'my', 'rooms'] as const).map(mode => {
              const labels = { all: 'Все', my: 'Мои', rooms: 'По комнатам' }
              return (
                <button key={mode} onClick={() => setFilterMode(mode)}
                  className={clsx(
                    'px-3 py-1.5 rounded-[10px] text-[12px] font-display font-bold transition-all',
                    filterMode === mode
                      ? 'bg-orange/20 text-orange'
                      : 'text-text3 hover:text-text2'
                  )}>
                  {labels[mode]}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Аватары */}
            {members.filter(m => m.role === 'member').map(m => (
              <button key={m.id} onClick={() => toggleMember(m.id)} title={m.name}
                className={clsx(
                  'w-8 h-8 rounded-[10px] flex items-center justify-center font-display font-black text-[10px] transition-all',
                  selMembers.includes(m.id)
                    ? 'ring-2 ring-offset-1 ring-offset-bg scale-110'
                    : 'opacity-60 hover:opacity-90'
                )}
                style={{
                  background: `${m.color}22`,
                  color: m.color,
                  outlineColor: m.color,
                }}>
                {m.initials}
              </button>
            ))}

            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange text-white rounded-[12px] text-[12px] font-display font-bold hover:bg-[#E8762E] transition-all shadow-glow active:scale-95">
              + Задача
            </button>
          </div>
        </div>

        {/* Доска */}
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-4 gap-3">
            {STATUSES.map(status => (
              <KanbanColumn key={status} status={status}
                tasks={filteredByStatus(status)}
                onTaskClick={setModalTask}
                onAddTask={status === 'backlog' ? () => setShowCreate(true) : undefined}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2,0,0,1)' }}>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal task={modalTask} currentUserId={currentId}
        onClose={() => setModalTask(null)} onUpdate={refetch} />

      {showCreate && currentUser && (
        <CreateTaskModal members={members} scenes={scenes} currentUser={currentUser}
          onClose={() => setShowCreate(false)} onCreated={refetch} />
      )}
    </>
  )
}
