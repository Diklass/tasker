// ============================================================
// PROJECT HUB — Telegram Webhook
// app/api/telegram/route.ts
//
// Vercel serverless function — принимает апдейты от Telegram
// POST /api/telegram
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { handleUpdate, type TelegramUpdate } from './bot'

// Защита вебхука секретным токеном
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  // Проверяем секретный заголовок (Telegram поддерживает X-Telegram-Bot-Api-Secret-Token)
  if (SECRET) {
    const token = req.headers.get('x-telegram-bot-api-secret-token')
    if (token !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Обрабатываем асинхронно — Telegram ждёт ответ 200 максимум 5 секунд
  // Используем waitUntil чтобы не блокировать ответ
  try {
    await handleUpdate(update)
  } catch (err) {
    // Логируем ошибку, но возвращаем 200 — иначе Telegram будет слать повторно
    console.error('[TG Bot Error]', err)
  }

  return NextResponse.json({ ok: true })
}

// GET — для проверки что роут живой
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Project Hub Telegram Bot',
    status: 'webhook active',
  })
}
