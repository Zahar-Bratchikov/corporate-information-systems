# Автотестирование ИС УПЗ IT

## Unit-тесты

См. **[TESTS.md](./TESTS.md)** — `dotnet test` для API (xUnit) и `npm run test` для фронта (Vitest).

## Селекторы в UI

- **`data-testid`** — основной способ нахождения элементов в e2e (Playwright, Cypress). Префикс: **`upzit-`**, далее сущность и действие, например:
  - `upzit-login-submit`, `upzit-nav-projects`, `upzit-project-add-button`
  - строки таблиц: `upzit-project-row-{id}`, кнопки: `upzit-project-edit-{id}`
- Классы **`upzit-*`** дублируют назначение для визуальной отладки и при необходимости CSS; стилизация по-прежнему опирается на существующие классы (`crud`, `login-page` и т.д.).

Полный перечень `data-testid` см. в исходниках страниц в `frontend/src/pages/` и `Layout.tsx`, `Login.tsx`, `App.tsx`.

## HTTP API в тестах API/контракта

- Справочник маршрутов: **`docs/API.md`**.
- На фронте единая карта путей: **`frontend/src/api/endpoints.ts`** (импорт `endpoints` — те же URL, что и у backend).

Имена сегментов пути отражают назначение:

| Область | Базовый путь |
|--------|----------------|
| Вход | `POST /api/authentication/login` |
| Справочники | `GET /api/reference-data/{roles\|task-types\|...}` |
| Отчёты (файлы) | `GET /api/reports/{it-projects-summary\|tasks-by-assignee\|...}` |
| Превью отчётов (JSON) | `GET /api/reports/previews/...` (см. `docs/API.md`) |

На странице «Отчёты»: `upzit-report-preview-it-projects-summary`, `upzit-report-preview-panel-it-projects-summary`, `upzit-report-assignee-preview`, `upzit-report-team-workload-preview` и т.п.

## Рекомендуемый стек e2e

1. Поднять стек: `docker compose up --build`.
2. Открыть `http://localhost:18080`.
3. Логин через `upzit-login-username`, `upzit-login-password`, `upzit-login-submit`.
4. Навигация: `upzit-nav-*`.
5. Проверки таблиц — по `upzit-*-table` и строкам с id.

## Рекомендации по API-тестам

- Получить JWT через `POST /api/authentication/login`.
- Проверять CRUD по ресурсам `/api/projects`, `/api/tasks`, `/api/sprints`, `/api/users` с заголовком `Authorization: Bearer …`.
- Отчёты: `GET` с `format` и нужными query (см. `docs/API.md`).
