# TODO

Минимальное fullstack TODO-приложение: регистрация и вход по email и паролю, список личных задач с созданием, редактированием, удалением и отметкой о выполнении.

## Стек

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router
- Backend: Node.js 24 LTS, TypeScript, Express, Zod
- База данных: PostgreSQL, Prisma ORM (миграции Prisma)
- Инфраструктура: Docker, Docker Compose
- Тесты: Vitest, Supertest, React Testing Library

## Запуск через Docker

Нужны только Docker и Docker Compose:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

Миграции применяются автоматически при старте backend. Данные БД хранятся в volume `pgdata`. Пароль БД в `docker-compose.yml` — dev-значение только для локального запуска, не production-секрет.

## Запуск без Docker

Требуется **Node.js 24 LTS** (см. `.nvmrc`) и запущенный PostgreSQL.

1. Скопируйте `.env.example` в `backend/.env` и укажите `DATABASE_URL`.
2. Backend:
   ```bash
   cd backend
   npm ci
   npx prisma migrate deploy
   npm run dev
   ```
3. Frontend (в другом терминале):
   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

## Переменные окружения

| Переменная | Где | Назначение |
| --- | --- | --- |
| `DATABASE_URL` | backend | строка подключения к PostgreSQL |
| `PORT` | backend | порт backend, по умолчанию `3001` |
| `FRONTEND_ORIGIN` | backend | разрешённый Origin для CORS и CSRF-проверки, по умолчанию `http://localhost:3000` |
| `COOKIE_SECURE` | backend | `true`, если backend работает по HTTPS |
| `TEST_DATABASE_URL` | тесты backend | отдельная тестовая БД (имя должно содержать `test`) |
| `VITE_API_URL` | frontend | адрес backend, по умолчанию `http://localhost:3001` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | docker compose | необязательная замена dev-значений БД |

## Тесты

Backend-тесты работают с отдельной тестовой PostgreSQL (порт 5433) и не трогают основную БД:

```bash
docker compose --profile test up -d db-test
cd backend && npm ci && npm test
```

Frontend-тесты:

```bash
cd frontend && npm ci && npm test
```
