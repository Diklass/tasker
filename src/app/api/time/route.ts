// app/api/time/approve/route.ts
// Вызывается из PM-панели после утверждения времени
// Отправляет пуш-уведомление сотруднику в Telegram

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendMessage } from '@/app/api/telegram/bot'

export async function POST(req: NextRequest) {
  const { userId, userName, hours, taskTitle, xpAwarded } = await req.json()

  // Ищем telegram_id сотрудника
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
      `🎉 <b>Шеф утвердил твои часы!</b>\n\n` +
      `✅ <b>${hours} ч.</b> на задачу «${taskTitle ?? '—'}» — засчитаны.\n` +
      `⭐ +${xpAwarded} XP начислено!`
    )
  }

  // Уведомление в общий чат
  const groupId = process.env.TELEGRAM_GROUP_CHAT_ID
  if (groupId) {
    await sendMessage(
      groupId,
      `✅ ${userName} залогировал <b>${hours} ч.</b> на «${taskTitle ?? '—'}» — утверждено.`
    )
  }

  return NextResponse.json({ ok: true, notified: !!tgId })
}
