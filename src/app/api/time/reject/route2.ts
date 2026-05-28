// app/api/time/reject/route.ts
// Вызывается из PM-панели после отклонения времени
// Отправляет сотруднику уведомление с причиной отказа

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendMessage } from '@/app/api/telegram/bot'

export async function POST(req: NextRequest) {
  const { userId, userName, hours, taskTitle, reason } = await req.json()

  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('telegram_id')
    .eq('id', userId)
    .single()

  const tgId = (user as any)?.telegram_id
  if (tgId) {
    await sendMessage(
      tgId,
      `❌ <b>Запрос отклонён</b>\n\n` +
      `${hours} ч. на задачу «${taskTitle ?? '—'}» — не засчитаны.\n\n` +
      `💬 Причина: <i>${reason}</i>\n\n` +
      `Исправь и отправь снова через <code>/time ${hours} ${taskTitle ?? 'задача'}</code>`
    )
  }

  return NextResponse.json({ ok: true, notified: !!tgId })
}
