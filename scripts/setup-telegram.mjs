#!/usr/bin/env node
// ============================================================
// PROJECT HUB — Регистрация Telegram Webhook
// scripts/setup-telegram.mjs
//
// Запустить один раз после деплоя:
//   node scripts/setup-telegram.mjs
// ============================================================

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Читаем .env.local вручную (скрипт запускается вне Next.js)
const __dir = dirname(fileURLToPath(import.meta.url))
let env = {}
try {
  const envFile = readFileSync(join(__dir, '../.env.local'), 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) env[key.trim()] = vals.join('=').trim()
  })
} catch {
  console.log('⚠️  .env.local не найден, использую process.env')
}

const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
const APP_URL   = env.NEXT_PUBLIC_APP_URL  || process.env.NEXT_PUBLIC_APP_URL
const SECRET    = env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не задан в .env.local')
  process.exit(1)
}
if (!APP_URL) {
  console.error('❌ NEXT_PUBLIC_APP_URL не задан в .env.local')
  process.exit(1)
}

const WEBHOOK_URL = `${APP_URL}/api/telegram`
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

async function setup() {
  console.log('🚀 Настройка Telegram Webhook...')
  console.log(`📡 URL: ${WEBHOOK_URL}`)

  // 1. Удаляем старый вебхук
  const deleteRes = await fetch(`${TG_API}/deleteWebhook`).then(r => r.json())
  console.log('🗑  Старый вебхук удалён:', deleteRes.ok ? '✅' : '❌')

  // 2. Регистрируем новый
  const body = {
    url: WEBHOOK_URL,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
    ...(SECRET ? { secret_token: SECRET } : {}),
  }

  const setRes = await fetch(`${TG_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json())

  if (setRes.ok) {
    console.log('✅ Webhook зарегистрирован!')
  } else {
    console.error('❌ Ошибка:', setRes.description)
    process.exit(1)
  }

  // 3. Проверяем
  const infoRes = await fetch(`${TG_API}/getWebhookInfo`).then(r => r.json())
  console.log('\n📋 Информация о webhook:')
  console.log(`   URL: ${infoRes.result?.url}`)
  console.log(`   Pending updates: ${infoRes.result?.pending_update_count}`)
  console.log(`   Last error: ${infoRes.result?.last_error_message ?? 'нет'}`)

  // 4. Устанавливаем команды бота
  const commands = [
    { command: 'start',  description: 'Начало работы / проверка подключения' },
    { command: 'time',   description: 'Залогировать время: /time 3.5 Котурны' },
    { command: 'status', description: 'Мои активные задачи' },
    { command: 'board',  description: 'Открыть веб-приложение' },
    { command: 'help',   description: 'Справка по командам' },
  ]

  const cmdRes = await fetch(`${TG_API}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands }),
  }).then(r => r.json())

  console.log(`\n📋 Команды бота: ${cmdRes.ok ? '✅ установлены' : '❌ ошибка'}`)
  console.log('\n🎉 Готово! Бот настроен и готов к работе.')
  console.log(`\n💡 Не забудь привязать telegram_id участников в таблице users:`)
  console.log(`   UPDATE users SET telegram_id = 123456789 WHERE name = 'Эльдар';`)
}

setup().catch(console.error)
