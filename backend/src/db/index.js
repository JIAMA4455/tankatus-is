const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const DB_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'tankatus.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.function('uuid', () => crypto.randomUUID());

function query(text, params = []) {
  const sql = text.replace(/\$(\d+)/g, '?');
  const isReturning = /\bRETURNING\b/i.test(sql);
  const isSelect = /^\s*(SELECT|WITH|EXPLAIN|PRAGMA)/i.test(sql);

  try {
    if (isSelect || isReturning) {
      const rows = db.prepare(sql).all(...params);
      return { rows, rowCount: rows.length };
    }
    const result = db.prepare(sql).run(...params);
    return { rowCount: result.changes, rows: [], lastInsertRowid: result.lastInsertRowid };
  } catch (err) {
    err.message = `${err.message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`;
    throw err;
  }
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY DEFAULT (uuid()),
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      full_name   TEXT NOT NULL,
      role        TEXT NOT NULL CHECK (role IN ('admin','manager','worker','viewer')),
      department  TEXT,
      avatar_url  TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id           TEXT PRIMARY KEY DEFAULT (uuid()),
      name         TEXT NOT NULL,
      description  TEXT,
      status       TEXT NOT NULL DEFAULT 'planning'
                       CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
      priority     TEXT NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('low','medium','high','critical')),
      start_date   TEXT,
      end_date     TEXT,
      budget       REAL,
      manager_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role        TEXT NOT NULL DEFAULT 'member'
                      CHECK (role IN ('manager','member','observer')),
      joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS stages (
      id           TEXT PRIMARY KEY DEFAULT (uuid()),
      project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      description  TEXT,
      order_index  INTEGER NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','in_progress','completed')),
      start_date   TEXT,
      end_date     TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id              TEXT PRIMARY KEY DEFAULT (uuid()),
      project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage_id        TEXT REFERENCES stages(id) ON DELETE SET NULL,
      parent_task_id  TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      title           TEXT NOT NULL,
      description     TEXT,
      status          TEXT NOT NULL DEFAULT 'todo'
                          CHECK (status IN ('todo','in_progress','review','done','cancelled')),
      priority        TEXT NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low','medium','high','critical')),
      assignee_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      creator_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
      budget          REAL,
      actual_cost     REAL,
      estimated_hours REAL,
      actual_hours    REAL,
      start_date      TEXT,
      due_date        TEXT,
      completed_at    TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY DEFAULT (uuid()),
      task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id           TEXT PRIMARY KEY DEFAULT (uuid()),
      task_id      TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      project_id   TEXT REFERENCES projects(id) ON DELETE CASCADE,
      uploader_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename     TEXT NOT NULL,
      file_path    TEXT NOT NULL,
      file_size    INTEGER,
      mime_type    TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (task_id IS NOT NULL OR project_id IS NOT NULL)
    );

    CREATE TABLE IF NOT EXISTS resource_load (
      id            TEXT PRIMARY KEY DEFAULT (uuid()),
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id       TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      date          TEXT NOT NULL,
      planned_hours REAL NOT NULL DEFAULT 0,
      actual_hours  REAL NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, task_id, date)
    );

    CREATE TABLE IF NOT EXISTS project_kpi (
      id                  TEXT PRIMARY KEY DEFAULT (uuid()),
      project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      snapshot_date       TEXT NOT NULL,
      planned_value       REAL NOT NULL DEFAULT 0,
      earned_value        REAL NOT NULL DEFAULT 0,
      actual_cost         REAL NOT NULL DEFAULT 0,
      budget_at_completion REAL,
      spi                 REAL,
      cpi                 REAL,
      cv                  REAL,
      sv                  REAL,
      eac                 REAL,
      etc                 REAL,
      vac                 REAL,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project    ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_stage      ON tasks(stage_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee   ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_comments_task    ON comments(task_id);
    CREATE INDEX IF NOT EXISTS idx_stages_project   ON stages(project_id);
    CREATE INDEX IF NOT EXISTS idx_resource_user    ON resource_load(user_id);
    CREATE INDEX IF NOT EXISTS idx_resource_project ON resource_load(project_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_project      ON project_kpi(project_id);
    CREATE INDEX IF NOT EXISTS idx_kpi_date         ON project_kpi(snapshot_date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_project_date ON project_kpi(project_id, snapshot_date);
  `);

  try { db.exec(`ALTER TABLE tasks ADD COLUMN budget REAL`); } catch (e) {}
  try { db.exec(`ALTER TABLE tasks ADD COLUMN actual_cost REAL`); } catch (e) {}
  try { db.exec(`ALTER TABLE project_kpi ADD COLUMN vac REAL`); } catch (e) {}
}

function initSeed() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();
  if (count.cnt > 0) return;

  const hash = bcrypt.hashSync('Admin123!', 10);
  const now = new Date().toISOString();

  const insUser = db.prepare(
    `INSERT INTO users (id, email, password, full_name, role, department, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const adminId    = crypto.randomUUID();
  const managerId  = crypto.randomUUID();
  const devId      = crypto.randomUUID();
  const analystId  = crypto.randomUUID();

  insUser.run(adminId,   'admin@tankatus.by',   hash, 'Администратор системы',  'admin',   'IT-отдел',       now, now);
  insUser.run(managerId, 'manager@tankatus.by', hash, 'Иванов Иван Иванович',    'manager', 'IT-отдел',       now, now);
  insUser.run(devId,     'dev1@tankatus.by',    hash, 'Петров Пётр Петрович',    'worker',  'IT-отдел',       now, now);
  insUser.run(analystId, 'analyst@tankatus.by', hash, 'Сидорова Анна Юрьевна',   'worker',  'Отдел продаж',   now, now);

  const proj1Id = crypto.randomUUID();
  const proj2Id = crypto.randomUUID();

  const insProject = db.prepare(
    `INSERT INTO projects (id, name, description, status, priority, start_date, end_date, budget, manager_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insProject.run(proj1Id, 'Разработка интернет-магазина v2',
    'Редизайн и переработка платформы электронной коммерции',
    'active', 'high', '2026-01-01', '2026-06-30', 150000, managerId, now, now);
  insProject.run(proj2Id, 'Внедрение CRM-системы',
    'Интеграция CRM для управления клиентской базой',
    'planning', 'medium', '2026-04-01', '2026-09-30', 80000, managerId, now, now);

  const insMember = db.prepare(
    `INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`
  );
  insMember.run(proj1Id, managerId, 'manager');
  insMember.run(proj1Id, devId,     'member');
  insMember.run(proj1Id, analystId, 'member');
  insMember.run(proj2Id, managerId, 'manager');

  const stage1Id = crypto.randomUUID();
  const stage2Id = crypto.randomUUID();
  const stage3Id = crypto.randomUUID();

  const insStage = db.prepare(
    `INSERT INTO stages (id, project_id, name, description, order_index, status, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insStage.run(stage1Id, proj1Id, 'Анализ требований',    'Сбор и документирование требований', 1, 'completed', '2026-01-01', '2026-01-31', now);
  insStage.run(stage2Id, proj1Id, 'Дизайн и прототипирование', 'UI/UX дизайн и прототипы', 2, 'completed', '2026-02-01', '2026-02-28', now);
  insStage.run(stage3Id, proj1Id, 'Разработка',           'Backend и frontend разработка',       3, 'in_progress', '2026-03-01', '2026-05-31', now);

  const insTask = db.prepare(
    `INSERT INTO tasks (id, project_id, stage_id, title, description, status, priority, assignee_id, creator_id, budget, actual_cost, estimated_hours, actual_hours, due_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insTask.run(crypto.randomUUID(), proj1Id, stage1Id, 'Сбор и анализ требований',
    'Провести интервью с заказчиком и составить спецификацию',
    'done', 'high', analystId, managerId, 25000, 24000, 40, 38, '2026-01-20', now, now);
  insTask.run(crypto.randomUUID(), proj1Id, stage3Id, 'Настройка CI/CD pipeline',
    'Настроить автоматическую сборку и деплой через GitHub Actions',
    'in_progress', 'high', devId, managerId, 50000, null, 16, null, '2026-04-15', now, now);
  insTask.run(crypto.randomUUID(), proj1Id, stage3Id, 'Реализация корзины покупок',
    'Разработать модуль корзины с AJAX-обновлением',
    'todo', 'critical', devId, managerId, 75000, null, 24, null, '2026-05-01', now, now);

  const insKpi = db.prepare(
    `INSERT INTO project_kpi (id, project_id, snapshot_date, planned_value, earned_value, actual_cost, budget_at_completion, spi, cpi, cv, sv, eac, etc, vac)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const snapshots = [
    { d: '2026-02-01', pv: 25000, ev: 23000, ac: 24000, bac: 150000 },
    { d: '2026-03-01', pv: 50000, ev: 48000, ac: 47500, bac: 150000 },
    { d: '2026-04-01', pv: 75000, ev: 72000, ac: 71000, bac: 150000 },
  ];
  for (const s of snapshots) {
    const spi = s.pv > 0 ? +(s.ev / s.pv).toFixed(4) : null;
    const cpi = s.ac > 0 ? +(s.ev / s.ac).toFixed(4) : null;
    const cv = s.ev - s.ac;
    const sv = s.ev - s.pv;
    const eac = cpi && cpi > 0 && s.bac > 0 ? +(s.bac / cpi).toFixed(2) : null;
    const etc = eac != null ? +(eac - s.ac).toFixed(2) : null;
    const vac = eac != null && s.bac > 0 ? +(s.bac - eac).toFixed(2) : null;
    insKpi.run(crypto.randomUUID(), proj1Id, s.d, s.pv, s.ev, s.ac, s.bac, spi, cpi, cv, sv, eac, etc, vac);
  }
}

initSchema();
initSeed();

module.exports = { query };
