# Шаг 2. UI hardening для `order/[id]`

> [⬅️ Назад к фазе](../phase-10-client-payments-and-provider-hardening.md)

## Цель

Исправить подтверждённый UI bug на странице заказа, где используются legacy `tg-*` классы и разъехавшийся styling contract.

## Что нужно сделать

### 2.1 Провести локальный UI audit страницы

- Проверить `client/app/order/[id]/page.tsx` на использование:
  - `tg-card`;
  - `tg-hint`;
  - `tg-button`;
  - `tg-button-outline`;
  - inline Telegram theme variables.
- Отделить, что нужно реально заменить, а что можно оставить, если это привязано к Telegram theme semantics.

### 2.2 Перевести страницу на текущий design-system baseline

- Использовать текущие классы проекта (`glass-card`, `card-neutral`, `badge-*`, текущие button styles) вместо несуществующих legacy-классов.
- Сохранить UX страницы:
  - status badge;
  - QR section;
  - copy/download actions;
  - activation instructions.
- Не менять business logic страницы и не трогать соседние order/my-esim flows без необходимости.

### 2.3 Проверить mobile-first rendering

- Убедиться, что page остаётся читаемой на мобильном экране внутри Telegram WebView.
- Отдельно проверить completed order с QR, ICCID и activation code.

## Результат шага

- Страница `order/[id]` использует реальный текущий styling contract проекта.
- Подтверждённый visual regression bug устранён локально, без широкого redesign scope.

## Статус

Не начато

## Журнал изменений

- 

## Файлы

- `client/app/order/[id]/page.tsx`
- `client/app/globals.css`

## Тестирование / Верификация

- Открытие `order/[id]` для `PENDING` и `COMPLETED` заказов отображает корректные карточки, кнопки и тексты.
- QR block, copy actions и status badges не теряют функциональность.
- Страница визуально согласована с остальным клиентом на mobile viewport.
