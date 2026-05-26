// src/app/board/page.tsx
'use client'

import Board from '@/components/Board'

export default function BoardPage() {
  return (
    <div className="min-h-screen bg-[#FBFAF6]">
      {/* Рендерим нашу интерактивную доску с drag-and-drop */}
      <Board />
    </div>
  )
}