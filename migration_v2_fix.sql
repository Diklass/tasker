-- ============================================================
-- PROJECT HUB — Миграция v2: полная схема
-- Запускай целиком в Supabase SQL Editor
-- Идемпотентна: безопасно запускать повторно
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── update_updated_at (универсальный триггер) ─────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  initials    TEXT        NOT NULL DEFAULT '',
  role        TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('member','manager')),
  color       TEXT        NOT NULL DEFAULT '#999999',
  color_bg    TEXT        NOT NULL DEFAULT '#F5F5F5',
  telegram_id BIGINT      UNIQUE,
  xp          INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS initials    TEXT        NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role        TEXT        NOT NULL DEFAULT 'member';
ALTER TABLE users ADD COLUMN IF NOT EXISTS color       TEXT        NOT NULL DEFAULT '#999999';
ALTER TABLE users ADD COLUMN IF NOT EXISTS color_bg    TEXT        NOT NULL DEFAULT '#F5F5F5';
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp          INT         NOT NULL DEFAULT 0;

-- ── scenes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  max_objects INT         NOT NULL DEFAULT 0,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT        NOT NULL,
  description       TEXT,
  status            TEXT        NOT NULL DEFAULT 'backlog'
                                CHECK (status IN ('backlog','in_progress','review','done')),
  priority          TEXT        NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('normal','urgent')),
  work_type         TEXT        CHECK (work_type IN ('3d','code','sound','text','other')),
  assignee_id       UUID        REFERENCES users(id)  ON DELETE SET NULL,
  scene_id          UUID        REFERENCES scenes(id) ON DELETE SET NULL,
  sort_order        INT         NOT NULL DEFAULT 0,
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID        REFERENCES users(id)  ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description       TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_type         TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority          TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order        INT  NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES users(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS tasks_updated_at      ON tasks;
DROP TRIGGER IF EXISTS tasks_status_changed  ON tasks;
CREATE TRIGGER tasks_updated_at     BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_status_changed BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_status_changed_at();

-- ── task_checklist ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_checklist (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID    NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text       TEXT    NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT     NOT NULL DEFAULT 0
);

-- ── time_logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_logs (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id             UUID         REFERENCES tasks(id) ON DELETE SET NULL,
  asset_id            UUID,
  user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours               NUMERIC(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  status              TEXT         NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','approved','rejected')),
  reject_reason       TEXT,
  source              TEXT         NOT NULL DEFAULT 'web' CHECK (source IN ('web','telegram')),
  telegram_message_id BIGINT,
  reviewed_by         UUID         REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS reject_reason       TEXT;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS reviewed_at         TIMESTAMPTZ;
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS source              TEXT NOT NULL DEFAULT 'web';

-- ── assets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  scene_id      UUID        NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  stage_3d      BOOLEAN     NOT NULL DEFAULT FALSE,
  stage_code    BOOLEAN     NOT NULL DEFAULT FALSE,
  stage_content BOOLEAN     NOT NULL DEFAULT FALSE,
  assignee_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS assets_updated_at ON assets;
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── wall_posts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wall_posts (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── news ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag        TEXT        NOT NULL DEFAULT 'Общее',
  text       TEXT        NOT NULL,
  pinned     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── documents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT        NOT NULL UNIQUE,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL DEFAULT '',
  icon       TEXT        NOT NULL DEFAULT '📄',
  tag        TEXT,
  tag_color  TEXT,
  tag_text   TEXT,
  updated_by UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Индексы ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scene    ON tasks(scene_id);
CREATE INDEX IF NOT EXISTS idx_tl_status      ON time_logs(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_assets_scene   ON assets(scene_id);

-- ── Views ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW scene_progress AS
SELECT
  s.id, s.name, s.slug,
  COUNT(a.id) AS total_objects,
  ROUND(
    (COUNT(CASE WHEN a.stage_3d      THEN 1 END) +
     COUNT(CASE WHEN a.stage_code    THEN 1 END) +
     COUNT(CASE WHEN a.stage_content THEN 1 END)
    )::NUMERIC / NULLIF(COUNT(a.id) * 3, 0) * 100
  , 1) AS progress_pct
FROM scenes s LEFT JOIN assets a ON a.scene_id = s.id
GROUP BY s.id, s.name, s.slug;

CREATE OR REPLACE VIEW stale_tasks AS
SELECT t.*, u.name AS assignee_name, u.color AS assignee_color,
  EXTRACT(DAY FROM NOW() - t.status_changed_at)::INT AS days_stale
FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.status = 'in_progress'
  AND t.status_changed_at < NOW() - INTERVAL '4 days'
ORDER BY t.status_changed_at;

CREATE OR REPLACE VIEW user_hours_summary AS
SELECT u.id, u.name, u.initials, u.color,
  COALESCE(SUM(tl.hours), 0) AS total_hours,
  COUNT(tl.id) AS log_count
FROM users u
LEFT JOIN time_logs tl ON tl.user_id = u.id AND tl.status = 'approved'
GROUP BY u.id, u.name, u.initials, u.color;

-- ── Real-time publications ───────────────────────────────────
-- Supabase обрабатывает дубли сам
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_checklist;
ALTER PUBLICATION supabase_realtime ADD TABLE time_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE assets;
ALTER PUBLICATION supabase_realtime ADD TABLE wall_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- ── RLS — открытый доступ для разработки ─────────────────────
-- В продакшне замените USING (true) на USING (auth.uid() IS NOT NULL)
ALTER TABLE tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wall_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE news      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY['tasks','time_logs','assets','wall_posts','news','documents'])
LOOP
  EXECUTE format('DROP POLICY IF EXISTS open_read  ON %I', t);
  EXECUTE format('DROP POLICY IF EXISTS open_write ON %I', t);
  EXECUTE format('CREATE POLICY open_read  ON %I FOR SELECT USING (true)', t);
  EXECUTE format('CREATE POLICY open_write ON %I FOR ALL    USING (true)', t);
END LOOP; END $$;

-- ── Seed ─────────────────────────────────────────────────────
INSERT INTO scenes (name, slug, max_objects, sort_order) VALUES
  ('Кунацкая',           'kunackaya', 14, 1),
  ('Девичья комната',    'devichya',  10, 2),
  ('Хозяйственный блок', 'hozbolk',    8, 3),
  ('Двор',               'dvor',       5, 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (name, initials, role, color, color_bg, xp) VALUES
  ('Эльдар',     'ЭЛ', 'member',  '#D4897A', '#FAF0ED', 720),
  ('Вячеслав',   'ВЯ', 'member',  '#7AA8D4', '#EDF3FA', 880),
  ('Константин', 'КО', 'member',  '#8DAE7A', '#EFF5EC', 550),
  ('Руслан',     'РУ', 'manager', '#7D5ED4', '#F3EDF7', 950)
ON CONFLICT DO NOTHING;

INSERT INTO documents (slug, title, icon, tag, tag_color, tag_text, content) VALUES
('roadmap', 'RoadMap', '🗺', 'Актуален', '#E8F5E9', '#1B5E20',
 E'# RoadMap\n\n## Спринт 1\n- [ ] 3D-модели\n- [ ] Grab-логика\n\n## Спринт 2\n- [ ] Телепортация'),
('gdd', 'Game Design Doc', '🎮', 'Правки', '#FFF3E0', '#E65100',
 E'# GDD\n\n### Механики\n- **Grab**\n- **Телепортация**\n- **Audio Trigger**'),
('assets-registry', 'Assets Registry', '📦', '37 объектов', '#EDE7F6', '#4A148C',
 E'# Assets Registry\n\nСм. таблицу assets для прогресса по этапам.')
ON CONFLICT (slug) DO NOTHING;
