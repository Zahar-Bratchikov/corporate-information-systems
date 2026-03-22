# Unit-тесты ИС УПЗ IT

## Backend (xUnit + Moq + EF Core InMemory)

**Проект:** `backend/UpzIt.Api.Tests/`  
**Решение:** `backend/UpzIt.sln`

```bash
cd backend
dotnet restore UpzIt.sln
dotnet test UpzIt.sln
```

**Сейчас покрыто:**

- **`AuthService`** — успешный вход, неверный логин, неверный пароль (реальная БД InMemory + BCrypt + JWT-конфиг).
- **`AuthController`** — тело запроса пустое/невалидное, 401 при отказе сервиса, 200 при успехе (мок `IAuthService`).

Добавляйте тесты для других сервисов/контроллеров по тому же принципу: InMemory для кода с EF, моки для тонких контроллеров.

---

## Frontend (Vitest + Testing Library)

**Конфиг:** `frontend/vitest.config.ts`  
**Файлы тестов:** `src/**/*.test.ts(x)` (исключены из production-сборки `tsc` в `tsconfig.json`).

```bash
cd frontend
npm install
npm run test        # один прогон
npm run test:watch  # интерактивно
```

**Сейчас покрыто:**

- **`api/endpoints.ts`** — корректность путей и query-параметров.
- **`api.ts`** — разбор JSON, заголовок `Authorization`, ошибки API, `apiBlob` и `Content-Disposition`.
- **`Login.tsx`** — отправка `POST` на `/api/authentication/login`, отображение ошибки при 401.

---

## CI

В pipeline достаточно вызвать обе команды подходящей версии **.NET 8 SDK** и **Node.js 20+**.
