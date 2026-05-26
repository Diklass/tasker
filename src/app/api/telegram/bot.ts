// ============================================================
// PROJECT HUB — Telegram Bot Core
// app/api/telegram/bot.ts
// ============================================================

import { createServerClient } from '@/lib/supabase'

// ── Типы ────────────────────────────────────────────────────

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramMessage {
  message_id: number
  from: { id: number; first_name: string; username?: string }
  chat: { id: number; type: string }
  text?: string
  date: number
}

export interface TelegramCallbackQuery {
  id: string
  from: { id: number; first_name: string }
  message?: TelegramMessage
  data?: string  // "approve:LOG_ID" | "reject:LOG_ID"
}

// ── Telegram API helper ──────────────────────────────────────

const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function tgCall(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function sendMessage(chat_id: number | string, text: string, extra: object = {}) {
  return tgCall('sendMessage', { chat_id, text, parse_mode: 'HTML', ...extra })
}

export async function editMessage(chat_id: number | string, message_id: number, text: string, extra: object = {}) {
  return tgCall('editMessageText', { chat_id, message_id, text, parse_mode: 'HTML', ...extra })
}

export async function answerCallback(callback_query_id: string, text: string) {
  return tgCall('answerCallbackQuery', { callback_query_id, text })
}

// ── XP константы ────────────────────────────────────────────

const XP_REWARDS = {
  task_done:     50,
  time_approved: 20,
  task_review:   10,
} as const

// ── Главный обработчик апдейтов ──────────────────────────────

export async function handleUpdate(update: TelegramUpdate) {
  if (update.message) {
    await handleMessage(update.message)
  }
  if (update.callback_query) {
    await handleCallback(update.callback_query)
  }
}

// ── Обработка сообщений ─────────────────────────────────────

async function handleMessage(msg: TelegramMessage) {
  const text    = msg.text?.trim() ?? ''
  const chat_id = msg.chat.id
  const tg_id   = msg.from.id

  // /start — регистрация / приветствие
  if (text === '/start') {
    return handleStart(chat_id, tg_id, msg.from.first_name)
  }

  // /time [часы] [название задачи]
  if (text.startsWith('/time')) {
    return handleTimeLog(chat_id, tg_id, text)
  }

  // /status — мои активные задачи
  if (text === '/status') {
    return handleStatus(chat_id, tg_id)
  }

  // /board — ссылка на веб-приложение
  if (text === '/board') {
    return handleBoard(chat_id)
  }

  // /help
  if (text === '/help') {
    return handleHelp(chat_id)
  }

  // Неизвестная команда
  await sendMessage(chat_id,
    '🤔 Не понял команду. Напиши /help чтобы увидеть список команд.'
  )
}

// ── /start ──────────────────────────────────────────────────

async function handleStart(chat_id: number, tg_id: number, firstName: string) {
  const db = createServerClient()

  // Ищем пользователя по telegram_id
  const { data: user } = await db
    .from('users')
    .select('*')
    .eq('telegram_id', tg_id)
    .single()

  if (user) {
    await sendMessage(chat_id,
      `👋 С возвращением, <b>${user.name}</b>!\n\n` +
      `⭐ Твой XP: <b>${user.xp}</b>\n\n` +
      `Напиши /help чтобы увидеть команды.`
    )
  } else {
    await sendMessage(chat_id,
      `👋 Привет, <b>${firstName}</b>!\n\n` +
      `Ты ещё не привязан к Project Hub.\n` +
      `Сообщи руководителю свой Telegram ID: <code>${tg_id}</code>\n\n` +
      `Он привяжет тебя к системе — тогда сможешь логировать время и получать уведомления.`
    )
  }
}

// ── /time [часы] [задача] ────────────────────────────────────

async function handleTimeLog(chat_id: number, tg_id: number, text: string) {
  const db = createServerClient()

  // Найти пользователя
  const { data: user } = await db.from('users').select('*').eq('telegram_id', tg_id).single()
  if (!user) {
    return sendMessage(chat_id,
      '❌ Ты не привязан к системе.\nНапиши /start чтобы узнать как это исправить.'
    )
  }

  // Парсим: /time 3.5 Котурны 3D-модель
  // или:    /time 3.5 "Котурны 3D-модель"
  const match = text.match(/^\/time\s+([\d.]+)\s+(.+)$/)
  if (!match) {
    return sendMessage(chat_id,
      '❌ Неверный формат.\n\n' +
      'Правильно: <code>/time 3.5 Котурны</code>\n' +
      'или: <code>/time 2 "Grab-логика стола"</code>'
    )
  }

  const hours    = parseFloat(match[1])
  const taskName = match[2].replace(/^["']|["']$/g, '').trim()

  if (isNaN(hours) || hours <= 0 || hours > 24) {
    return sendMessage(chat_id, '❌ Некорректное количество часов (от 0.5 до 24).')
  }

  // Ищем задачу по названию (нечёткий поиск)
  const { data: tasks } = await db
    .from('tasks')
    .select('id, title, status')
    .ilike('title', `%${taskName}%`)
    .neq('status', 'done')
    .limit(5)

  if (!tasks || tasks.length === 0) {
    return sendMessage(chat_id,
      `❌ Задача <b>"${taskName}"</b> не найдена.\n\n` +
      `Используй /status чтобы увидеть свои активные задачи и точные названия.`
    )
  }

  // Если нашли несколько — просим уточнить через inline кнопки
  if (tasks.length > 1) {
    const buttons = tasks.map((t: any) => [{
      text: t.title,
      callback_data: `select_task:${t.id}:${hours}`,
    }])
    return sendMessage(chat_id,
      `🔍 Нашёл несколько задач по запросу <b>"${taskName}"</b>.\nВыбери нужную:`,
      { reply_markup: { inline_keyboard: buttons } }
    )
  }

  // Нашли одну — логируем
  const task = tasks[0]
  await createTimeLog(db, user, task, hours, chat_id)
}

// Создаёт time_log и отправляет апрув менеджеру
async function createTimeLog(
  db: ReturnType<typeof createServerClient>,
  user: any,
  task: any,
  hours: number,
  chat_id: number
) {
  // Создаём запись со статусом pending
  const { data: log, error } = await db
    .from('time_logs')
    .insert({
      task_id:  task.id,
      user_id:  user.id,
      hours,
      status:   'pending',
      source:   'telegram',
    })
    .select()
    .single()

  if (error || !log) {
    return sendMessage(chat_id, '❌ Ошибка при сохранении. Попробуй ещё раз.')
  }

  // Подтверждение сотруднику
  await sendMessage(chat_id,
    `⏳ <b>${hours} ч.</b> на задачу <b>"${task.title}"</b> отправлены на апрув.\n\n` +
    `Руководитель получил уведомление — ожидай подтверждения.`
  )

  // Уведомление менеджеру с inline кнопками
  const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID
  if (!managerChatId) return

  const managerMsg = await sendMessage(
    managerChatId,
    `📝 <b>${user.name}</b> хочет залогировать <b>${hours} ч.</b>\n` +
    `📌 Задача: <b>${task.title}</b>\n` +
    `🕐 Статус задачи: ${statusLabel(task.status)}`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Утвердить', callback_data: `approve:${log.id}:${chat_id}` },
          { text: '❌ Отклонить', callback_data: `reject:${log.id}:${chat_id}` },
        ]],
      },
    }
  )

  // Сохраняем message_id для последующего редактирования
  if (managerMsg?.result?.message_id) {
    await db
      .from('time_logs')
      .update({ telegram_message_id: managerMsg.result.message_id })
      .eq('id', log.id)
  }
}

// ── /status — мои задачи ─────────────────────────────────────

async function handleStatus(chat_id: number, tg_id: number) {
  const db = createServerClient()

  const { data: user } = await db.from('users').select('*').eq('telegram_id', tg_id).single()
  if (!user) return sendMessage(chat_id, '❌ Ты не привязан к системе. Напиши /start.')

  const { data: tasks } = await db
    .from('tasks')
    .select('title, status, scene:scenes(name)')
    .eq('assignee_id', user.id)
    .neq('status', 'done')
    .order('status')

  if (!tasks || tasks.length === 0) {
    return sendMessage(chat_id,
      `✅ <b>${user.name}</b>, у тебя нет активных задач.\n\nВремя взять что-то новое!`
    )
  }

  const lines = tasks.map((t: any) => {
    const icon = { backlog: '📋', in_progress: '🔨', review: '👀' }[t.status as string] ?? '❓'
    const scene = t.scene?.name ? ` <i>[${t.scene.name}]</i>` : ''
    return `${icon} ${t.title}${scene}`
  })

  await sendMessage(chat_id,
    `📊 <b>Твои задачи, ${user.name}:</b>\n\n${lines.join('\n')}\n\n` +
    `⭐ XP: <b>${user.xp}</b>`
  )
}

// ── /board ───────────────────────────────────────────────────

async function handleBoard(chat_id: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'
  await sendMessage(chat_id,
    '🖥 Открыть Project Hub:',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '📋 Открыть доску', web_app: { url: `${appUrl}/board` } },
          { text: '🏠 Dashboard',    web_app: { url: appUrl } },
        ]],
      },
    }
  )
}

// ── /help ────────────────────────────────────────────────────

async function handleHelp(chat_id: number) {
  await sendMessage(chat_id,
    `<b>Project Hub Bot</b> — команды:\n\n` +
    `<code>/time [ч] [задача]</code> — залогировать время\n` +
    `  Пример: <code>/time 3.5 Котурны</code>\n\n` +
    `<code>/status</code> — мои активные задачи\n` +
    `<code>/board</code> — открыть веб-приложение\n` +
    `<code>/help</code> — эта справка\n\n` +
    `<i>Изменения на доске приходят сюда автоматически 🔔</i>`
  )
}

// ── Callback Query (апрув / отклонение) ─────────────────────

async function handleCallback(cq: TelegramCallbackQuery) {
  const data    = cq.data ?? ''
  const manager = cq.from
  const msgId   = cq.message?.message_id
  const chatId  = cq.message?.chat.id
  const db      = createServerClient()

  // Выбор задачи при неоднозначном поиске
  if (data.startsWith('select_task:')) {
    const [, taskId, hoursStr] = data.split(':')
    const hours = parseFloat(hoursStr)
    const { data: user } = await db.from('users').select('*').eq('telegram_id', manager.id).single()
    const { data: task } = await db.from('tasks').select('id, title, status').eq('id', taskId).single()
    if (user && task) {
      await answerCallback(cq.id, '')
      await createTimeLog(db, user, task, hours, manager.id)
    }
    return
  }

  // Апрув
  if (data.startsWith('approve:')) {
    const [, logId, employeeChatId] = data.split(':')
    return handleApprove(cq.id, logId, employeeChatId, chatId, msgId, db)
  }

  // Отклонение — показываем prompt
  if (data.startsWith('reject:')) {
    const [, logId, employeeChatId] = data.split(':')
    return handleRejectPrompt(cq.id, logId, employeeChatId, chatId, msgId, db)
  }

  // Подтверждение отклонения с причиной
  if (data.startsWith('reject_confirm:')) {
    const [, logId, employeeChatId, ...reasonParts] = data.split(':')
    const reason = reasonParts.join(':')
    return handleReject(cq.id, logId, employeeChatId, reason, chatId, msgId, db)
  }
}

async function handleApprove(
  cbId: string, logId: string, employeeChatId: string,
  chatId: number | undefined, msgId: number | undefined,
  db: ReturnType<typeof createServerClient>
) {
  // Найти менеджера
  const { data: manager } = await db.from('users').select('id, name').eq('role', 'manager').single()

  // Обновляем статус лога
  const { data: log } = await db
    .from('time_logs')
    .update({ status: 'approved', reviewed_by: manager?.id, reviewed_at: new Date().toISOString() })
    .eq('id', logId)
    .select('*, user:users(*), task:tasks(title)')
    .single()

  if (!log) return answerCallback(cbId, '❌ Ошибка')

  // Начисляем XP сотруднику
  await db
    .from('users')
    .update({ xp: (log.user as any).xp + XP_REWARDS.time_approved })
    .eq('id', (log.user as any).id)

  await answerCallback(cbId, '✅ Утверждено!')

  // Редактируем сообщение менеджеру (убираем кнопки)
  if (chatId && msgId) {
    await editMessage(chatId, msgId,
      `✅ <b>Утверждено</b>\n` +
      `👤 ${(log.user as any).name} — <b>${log.hours} ч.</b>\n` +
      `📌 ${(log.task as any)?.title ?? '—'}\n` +
      `⭐ +${XP_REWARDS.time_approved} XP начислено`
    )
  }

  // Уведомление сотруднику
  await sendMessage(
    parseInt(employeeChatId),
    `🎉 <b>Шеф утвердил твои часы!</b>\n\n` +
    `✅ <b>${log.hours} ч.</b> на задачу <b>"${(log.task as any)?.title}"</b> — засчитаны.\n` +
    `⭐ +${XP_REWARDS.time_approved} XP начислено!`
  )

  // Уведомление в общий рабочий чат
  await notifyGroupChat(
    db,
    `✅ ${(log.user as any).name} залогировал <b>${log.hours} ч.</b> на задачу "${(log.task as any)?.title}" — утверждено.`
  )
}

async function handleRejectPrompt(
  cbId: string, logId: string, employeeChatId: string,
  chatId: number | undefined, msgId: number | undefined,
  db: ReturnType<typeof createServerClient>
) {
  await answerCallback(cbId, 'Выбери причину')

  const REASONS = [
    'Задача ещё не сделана',
    'Слишком много часов',
    'Неверная задача',
    'Уточни и отправь снова',
  ]

  const buttons = REASONS.map(reason => [{
    text: reason,
    callback_data: `reject_confirm:${logId}:${employeeChatId}:${reason}`,
  }])
  buttons.push([{ text: '✏️ Другая причина...', callback_data: `reject_confirm:${logId}:${employeeChatId}:Отклонено менеджером` }])

  if (chatId && msgId) {
    await editMessage(chatId, msgId,
      `❌ Отклонить запрос?\nВыбери причину:`,
      { reply_markup: { inline_keyboard: buttons } }
    )
  }
}

async function handleReject(
  cbId: string, logId: string, employeeChatId: string, reason: string,
  chatId: number | undefined, msgId: number | undefined,
  db: ReturnType<typeof createServerClient>
) {
  const { data: manager } = await db.from('users').select('id').eq('role', 'manager').single()

  const { data: log } = await db
    .from('time_logs')
    .update({
      status: 'rejected',
      reviewed_by: manager?.id,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq('id', logId)
    .select('*, user:users(*), task:tasks(title)')
    .single()

  if (!log) return answerCallback(cbId, '❌ Ошибка')

  await answerCallback(cbId, '❌ Отклонено')

  // Редактируем сообщение менеджеру
  if (chatId && msgId) {
    await editMessage(chatId, msgId,
      `❌ <b>Отклонено</b>\n` +
      `👤 ${(log.user as any).name} — ${log.hours} ч.\n` +
      `📌 ${(log.task as any)?.title ?? '—'}\n` +
      `💬 Причина: <i>${reason}</i>`
    )
  }

  // Уведомление сотруднику
  await sendMessage(
    parseInt(employeeChatId),
    `❌ <b>Запрос отклонён</b>\n\n` +
    `${log.hours} ч. на задачу <b>"${(log.task as any)?.title}"</b> — не засчитаны.\n\n` +
    `💬 Причина: <i>${reason}</i>\n\n` +
    `Исправь и отправь снова через /time`
  )
}

// ── Лог активности в общий чат ───────────────────────────────

export async function notifyGroupChat(
  db: ReturnType<typeof createServerClient>,
  text: string
) {
  const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID
  if (!groupChatId) return
  await sendMessage(groupChatId, text)
}

// ── Уведомление при смене статуса задачи ────────────────────

export async function notifyTaskStatusChange(
  db: ReturnType<typeof createServerClient>,
  taskId: string,
  newStatus: string,
  actorName: string
) {
  if (newStatus === 'in_progress') {
    const { data: task } = await db.from('tasks').select('title').eq('id', taskId).single()
    await notifyGroupChat(db, `🔨 <b>${actorName}</b> взял(а) в работу: <b>"${(task as any)?.title}"</b>`)
  }

  if (newStatus === 'review') {
    // Уведомить менеджера персонально
    const managerChatId = process.env.TELEGRAM_MANAGER_CHAT_ID
    if (!managerChatId) return
    const { data: task } = await db.from('tasks').select('title, assignee:users(name)').eq('id', taskId).single()
    const assigneeName = (task as any)?.assignee?.name ?? actorName
    await sendMessage(managerChatId,
      `👀 <b>${assigneeName}</b> отправил(а) задачу на проверку:\n` +
      `📌 <b>"${(task as any)?.title}"</b>\n\n` +
      `Открой доску для проверки:`
    )
    await notifyGroupChat(db, `👀 <b>${assigneeName}</b> отправил(а) на проверку: <b>"${(task as any)?.title}"</b>`)
  }

  if (newStatus === 'done') {
    const { data: task } = await db.from('tasks').select('title, assignee:users(id, xp)').eq('id', taskId).single()
    // Начисляем XP за закрытую задачу
    const assignee = (task as any)?.assignee
    if (assignee) {
      await db.from('users').update({ xp: assignee.xp + XP_REWARDS.task_done }).eq('id', assignee.id)
    }
    await notifyGroupChat(db,
      `🎉 Задача <b>"${(task as any)?.title}"</b> закрыта! ` +
      `${assignee ? `<b>${actorName}</b> +${XP_REWARDS.task_done} XP ⭐` : ''}`
    )
  }
}

// ── Утилиты ──────────────────────────────────────────────────

function statusLabel(status: string): string {
  return { backlog: '📋 Бэклог', in_progress: '🔨 В работе', review: '👀 На проверке', done: '✅ Готово' }[status] ?? status
}
