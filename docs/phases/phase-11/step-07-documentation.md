# Step 07 — Документация

> [⬅️ Phase 11](../phase-11-admin-panel-refactoring.md)

## Цель

Обновить wiki, чтобы она отражала новую архитектуру admin panel.

## Что нужно сделать

1. Обновить `docs/architecture/module-map.md`:
   - Новая структура routes: `app/(admin)/...`
   - `admin/components/ui/` и `admin/components/products/`
   - Auth flow: `AuthProvider → AuthGuard → (admin)/layout.tsx`
   - Rendering strategy: client-first, `'use client'` boundary
2. Обновить `docs/phases/README.md`:
   - Phase 11 статус → `[x]` completed
3. Синхронизировать Phase 3 (`docs/phases/phase-3-admin-auth-and-api-security.md`):
   - Убрать противоречие по JWT TTL (Result "8 часов" vs фактические 24h в коде)

## Результат шага

- Wiki отражает реальную архитектуру admin panel.
- Roadmap обновлён.
- Phase 3 TTL синхронизирован с фактическим кодом.

## Зависимости

- Step 06 (все изменения завершены).

## Статус

`completed`

## Файлы

- `docs/architecture/module-map.md`
- `docs/phases/README.md`
- `docs/phases/phase-3-admin-auth-and-api-security.md` — fix TTL

## Тестирование / Верификация

- Все ссылки в wiki валидны.
- README.md фаз содержит Phase 11 с корректным статусом.
- Phase 3 не содержит противоречий по JWT TTL.
