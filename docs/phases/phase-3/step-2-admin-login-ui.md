# Шаг 2. Подтвердить работоспособность admin login flow

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Убедиться, что admin login UI и token propagation уже работают корректно, перед массовым включением guards.

## Что нужно сделать

- Проверить, что `admin/app/page.tsx` выполняет `POST /api/auth/login` и сохраняет `access_token` в `localStorage`.
- Проверить, что `admin/lib/api.ts` interceptor отправляет `Authorization: Bearer <token>` на каждый запрос.
- Проверить, что 401 response interceptor делает logout (удаление токена + reload).
- Выполнить manual smoke: login → dashboard загружается → данные отображаются.

## Результат шага

Подтверждено: admin UI получает backend JWT и передаёт его во все API запросы. Инфраструктура для включения guards на backend готова.

## Статус

✅ Выполнено (Подтверждено аудитом 2026-05-08)

## Журнал изменений

- **[2026-05-08]** Аудит кода подтвердил:
  - `admin/app/page.tsx` L28-43: `handleLogin()` вызывает `authApi.login(email, password)`, сохраняет `data.access_token` в `localStorage('auth_token')`.
  - `admin/lib/api.ts` L13-21: request interceptor берёт token из `localStorage('auth_token')` и ставит `Authorization: Bearer <token>`.
  - `admin/lib/api.ts` L24-33: response interceptor при 401 удаляет token и делает `window.location.reload()`.
  - Backend `POST /api/auth/login` (`auth.controller.ts` L36-40) вызывает `authService.loginAdmin()`, который проверяет email/password через bcrypt и возвращает JWT.
  - Login flow полностью функционален — шаг закрыт.

## Файлы

- `admin/app/page.tsx` — login form, token storage
- `admin/lib/api.ts` — axios interceptors
- `backend/src/modules/auth/auth.controller.ts` — login endpoint
- `backend/src/modules/auth/auth.service.ts` — loginAdmin logic

## Тестирование / Верификация

- Code review подтвердил корректность flow.
- Manual smoke: login → token сохраняется → API calls отправляют Bearer.
