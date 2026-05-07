# Шаг 3. Довести client `my-esim` отображение

> [⬅️ Назад к фазе](../phase-5-esim-usage-status-and-activation.md)

## Цель

Показать пользователю расход, срок действия, статус и activation options.

## Что нужно сделать

- проверить страницы active eSIM/orders;
- вывести progress, remaining data, expiry, status reason;
- добавить activation links/instructions из backend данных.

## Результат шага

Пользователь может понять, активна ли eSIM, сколько осталось трафика и как её установить.

## Статус

Частично выполнено

## Журнал изменений

- `client/app/my-esim/page.tsx` уже использует backend usage/status contract и теперь показывает именно остаток трафика и остаток срока с прогрессбарами;
- добавлен отдельный UI-status `SUSPENDED` (`Приостановлена`) для provider snapshots, где eSIM установлена, но временно выключена/заморожена;
- ручное обновление usage остаётся на месте, но в случае валидного snapshot карточка больше не обязана ждать `usedBytes > 0`, чтобы показать остаток.

## Файлы

- `client/app/my-esim/page.tsx`
- `client/lib/api.ts`

## Тестирование / Верификация

- `pnpm --filter client lint -- --file app/my-esim/page.tsx`
- Общий `npx tsc --noEmit -p client/tsconfig.json` по-прежнему падает на уже существующих типовых проблемах в `client/app/page.tsx` и `client/components/MojoSplash.tsx`, не связанных с этим шагом.
