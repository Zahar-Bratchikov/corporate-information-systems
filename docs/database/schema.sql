-- ИС УПЗ IT — схема БД (PostgreSQL)
-- Физическая модель: таблицы с читаемыми именами

-- Справочник ролей пользователей
CREATE TABLE roles (
    id          INTEGER PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE
);

-- Пользователи системы (исполнители, ответственные)
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    login           VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    role_id         INTEGER NOT NULL REFERENCES roles(id)
);

-- IT-проекты
CREATE TABLE projects (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(300) NOT NULL,
    code            VARCHAR(50) NOT NULL UNIQUE,
    release_date    DATE,
    responsible_id  INTEGER REFERENCES users(id)
);

-- Справочник типов задач (фича, баг, техническая задача)
CREATE TABLE task_types (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE
);

-- Справочник статусов задач
CREATE TABLE task_statuses (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE
);

-- Справочник приоритетов
CREATE TABLE priorities (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE
);

-- Спринты / итерации (привязаны к проекту)
CREATE TABLE sprints (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT sprints_dates CHECK (end_date >= start_date)
);

-- Задачи
CREATE TABLE tasks (
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

-- Индексы для частых запросов (отчёты, фильтры)
CREATE INDEX idx_tasks_project_id   ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id   ON tasks(assignee_id);
CREATE INDEX idx_tasks_status_id    ON tasks(status_id);
CREATE INDEX idx_tasks_due_date     ON tasks(due_date);
CREATE INDEX idx_sprints_project_id ON sprints(project_id);
