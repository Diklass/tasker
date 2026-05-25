-- ============================================================
-- PROJECT HUB — Полная схема базы данных
-- Supabase / PostgreSQL
-- ============================================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ПОЛЬЗОВАТЕЛИ КОМАНДЫ
-- ============================================================
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id  BIGINT UNIQUE,                    -- Привязка к Telegram-боту
  name         TEXT NOT NULL,
  initials     TEXT NOT NULL,                    -- "ЭЛ", "ВЯ", "КО"
  role         TEXT NOT NULL CHECK (role IN ('member', 'manager')),
  color        TEXT NOT NULL,                    -- hex цвет полосы на карточке
  color_bg     TEXT NOT NULL,                    -- hex фон аватара
  xp           INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- СЦЕНЫ / КОМНАТЫ
-- ============================================================
CREATE TABLE scenes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,                    -- "Кунацкая", "Двор" и т.д.
  slug         TEXT NOT NULL UNIQUE,             -- "kunackaya", "dvor"
  max_objects  INTEGER NOT NULL DEFAULT 0,       -- для расчёта прогресса
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ОБЪЕКТЫ АССЕТ-РЕЕСТРА (37+ объектов)
-- ============================================================
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id        UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                 -- "Котурны", "Стол деревянный"
  description     TEXT,
  -- Три технологических этапа (чек-боксы прогресса)
  stage_3d        BOOLEAN NOT NULL DEFAULT FALSE,
  stage_code      BOOLEAN NOT NULL DEFAULT FALSE,
  stage_content   BOOLEAN NOT NULL DEFAULT FALSE,
  assignee_id     UUID REFERENCES users(id),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Автоматически обновляем updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ЗАДАЧИ (KANBAN)
-- ============================================================
CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'backlog'
               CHECK (status IN ('backlog', 'in_progress', 'review', 'done')),
  priority     TEXT NOT NULL DEFAULT 'normal'
               CHECK (priority IN ('normal', 'urgent')),
  assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  scene_id     UUID REFERENCES scenes(id) ON DELETE SET NULL,
  -- Тег типа работы
  work_type    TEXT CHECK (work_type IN ('3d', 'code', 'sound', 'text', 'other')),
  sort_order   INTEGER NOT NULL DEFAULT 0,       -- позиция внутри колонки
  -- Для виджета "Забытые задачи" — когда последний раз менялся статус
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- При смене статуса — обновляем status_changed_at
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_status_changed
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_status_changed_at();

-- ============================================================
-- ЧЕКЛИСТ (Definition of Done) к задачам
-- ============================================================
CREATE TABLE task_checklist (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text      TEXT NOT NULL,
  done      BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- ЛОГИРОВАНИЕ ВРЕМЕНИ
-- ============================================================
CREATE TABLE time_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID REFERENCES tasks(id) ON DELETE SET NULL,
  asset_id     UUID REFERENCES assets(id) ON DELETE SET NULL,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours        NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  -- Откуда пришёл запрос
  source       TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram')),
  telegram_message_id BIGINT,                    -- для редактирования сообщения в боте
  reviewed_by  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ЧЕКЛИСТ СООБЩЕНИЙ (Стенгазета / мини-чат)
-- ============================================================
CREATE TABLE wall_posts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- НОВОСТИ (Лента)
-- ============================================================
CREATE TABLE news (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL DEFAULT 'Общее',
  text       TEXT NOT NULL,
  pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ИНДЕКСЫ для быстрых запросов
-- ============================================================
CREATE INDEX idx_tasks_status     ON tasks(status);
CREATE INDEX idx_tasks_assignee   ON tasks(assignee_id);
CREATE INDEX idx_tasks_scene      ON tasks(scene_id);
CREATE INDEX idx_tasks_stale      ON tasks(status, status_changed_at)
  WHERE status = 'in_progress';
CREATE INDEX idx_time_logs_status ON time_logs(status) WHERE status = 'pending';
CREATE INDEX idx_assets_scene     ON assets(scene_id);

-- ============================================================
-- ВЬЮХИ (Views) для удобства
-- ============================================================

-- Прогресс сцены: % закрытых этапов
CREATE VIEW scene_progress AS
SELECT
  s.id,
  s.name,
  s.slug,
  COUNT(a.id) AS total_objects,
  ROUND(
    (
      COUNT(CASE WHEN a.stage_3d      THEN 1 END) +
      COUNT(CASE WHEN a.stage_code    THEN 1 END) +
      COUNT(CASE WHEN a.stage_content THEN 1 END)
    )::NUMERIC
    / NULLIF(COUNT(a.id) * 3, 0) * 100
  , 1) AS progress_pct
FROM scenes s
LEFT JOIN assets a ON a.scene_id = s.id
GROUP BY s.id, s.name, s.slug;

-- Забытые задачи (>4 дней без смены статуса)
CREATE VIEW stale_tasks AS
SELECT
  t.*,
  u.name AS assignee_name,
  u.color AS assignee_color,
  EXTRACT(DAY FROM NOW() - t.status_changed_at)::INTEGER AS days_stale
FROM tasks t
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.status = 'in_progress'
  AND t.status_changed_at < NOW() - INTERVAL '4 days'
ORDER BY t.status_changed_at ASC;

-- Суммарные часы по пользователям (только approved)
CREATE VIEW user_hours_summary AS
SELECT
  u.id,
  u.name,
  u.initials,
  u.color,
  COALESCE(SUM(tl.hours), 0) AS total_hours,
  COUNT(tl.id) AS log_count
FROM users u
LEFT JOIN time_logs tl ON tl.user_id = u.id AND tl.status = 'approved'
GROUP BY u.id, u.name, u.initials, u.color;

-- ============================================================
-- ВКЛЮЧАЕМ REAL-TIME для нужных таблиц
-- (Supabase: добавляем в supabase_realtime publication)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_checklist;
ALTER PUBLICATION supabase_realtime ADD TABLE time_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE assets;
ALTER PUBLICATION supabase_realtime ADD TABLE wall_posts;

-- ============================================================
-- ROW LEVEL SECURITY (базовая защита)
-- ============================================================
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wall_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE news          ENABLE ROW LEVEL SECURITY;

-- Аутентифицированные пользователи могут читать всё
CREATE POLICY "authenticated_read" ON tasks         FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON time_logs     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON assets        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON wall_posts    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read" ON news          FOR SELECT USING (auth.role() = 'authenticated');

-- Писать/изменять могут все авторизованные
CREATE POLICY "authenticated_write" ON tasks      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write" ON assets     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write" ON wall_posts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write" ON news       FOR ALL USING (auth.role() = 'authenticated');

-- time_logs: вставлять может кто угодно, менять статус — только менеджер
CREATE POLICY "insert_time_log" ON time_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_time_log" ON time_logs FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA — начальные данные
-- ============================================================

INSERT INTO scenes (name, slug, max_objects, sort_order) VALUES
  ('Кунацкая',          'kunackaya',       14, 1),
  ('Девичья комната',   'devichya',        10, 2),
  ('Хозяйственный блок','hozbolk',          8, 3),
  ('Двор',              'dvor',             5, 4);

INSERT INTO users (name, initials, role, color, color_bg, xp, telegram_id) VALUES
  ('Эльдар',     'ЭЛ', 'member',  '#D4897A', '#FAF0ED', 720, NULL),
  ('Вячеслав',   'ВЯ', 'member',  '#7AA8D4', '#EDF3FA', 880, NULL),
  ('Константин', 'КО', 'member',  '#8DAE7A', '#EFF5EC', 550, NULL),
  ('Руслан',     'РУ', 'manager', '#7D5ED4', '#F3EDF7', 950, NULL);
