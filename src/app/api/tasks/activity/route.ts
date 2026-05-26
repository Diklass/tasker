// ============================================================
// PROJECT HUB — Task Activity API
// app/api/tasks/activity/route.ts
//
// Вызывается с фронтенда при смене статуса задачи
// POST /api/tasks/activity
// Body: { taskId, newStatus, actorName }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { notifyTaskStatusChange } from '@/app/api/telegram/bot'

export async function POST(req: NextRequest) {
  const { taskId, newStatus, actorName } = await req.json()

  if (!taskId || !newStatus) {
    return NextResponse.json({ error: 'taskId and newStatus required' }, { status: 400 })
  }

  const db = createServerClient()
  await notifyTaskStatusChange(db, taskId, newStatus, actorName ?? 'Кто-то')

  return NextResponse.json({ ok: true })
}
