-- ИС УПЗ IT — схема БД (PostgreSQL)
-- При первом запуске контейнера postgres выполняется автоматически

CREATE TABLE IF NOT EXISTS roles (
    id          INTEGER PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    login           VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    role_id         INTEGER NOT NULL REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS projects (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(300) NOT NULL,
    code            VARCHAR(50) NOT NULL UNIQUE,
    release_date    DATE,
    responsible_id  INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_types (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS task_statuses (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS priorities (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sprints (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT sprints_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(500) NOT NULL,
    due_date        DATE,
    type_id         INTEGER NOT NULL REFERENCES task_types(id),
    priority_id     INTEGER NOT NULL REFERENCES priorities(id),
    status_id       INTEGER NOT NULL REFERENCES task_statuses(id),
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id       INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
    assignee_id     INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id   ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id   ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id    ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
