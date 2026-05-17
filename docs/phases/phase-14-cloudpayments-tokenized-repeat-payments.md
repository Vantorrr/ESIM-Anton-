# Phase 14: CloudPayments Tokenized Repeat Payments

> [Корневой документ wiki](../README.md)

## Цель

Реализовать production-grade повторные оплаты через CloudPayments token для **purchase flow** на базе существующего виджета и чекбокса сохранения карты, без хранения сырых карточных данных и без деградации существующих payment/runtime инвариантов.

Фаза должна закрыть практический продуктовый сценарий:

- первая оплата проходит через текущий CloudPayments widget;
- при согласии пользователя CloudPayments возвращает token карты;
- backend сохраняет token и маску карты, привязанные к пользователю;
- при следующей **покупке eSIM** клиент может использовать уже привязанную карту без повторного ввода реквизитов;
- при невалидном токене система безопасно откатывается на обычный widget flow;
- архитектура изначально допускает последующее подключение tokenized top-up и balance top-up без смены базовых контрактов хранения и orchestration.

## Результат

- Текущий checkout/runtime получает production-grade tokenization contour без полной переработки payment domain.
- Backend умеет:
  - запрашивать tokenization через widget flow;
  - принимать token в `Pay`-уведомлении;
  - хранить token + masked card metadata + owner binding;
  - выполнять repeat charge по токену для повторных **purchase** оплат.
- Client умеет:
  - предложить пользователю оплату ранее привязанной картой в purchase checkout;
  - переключиться на новую карту;
  - корректно деградировать на обычный виджет при проблемах с токеном.
- Wiki и runbooks фиксируют:
  - что именно даёт checkbox CloudPayments;
  - какой enterprise-grade contour реализован в этой фазе;
  - какие ограничения и риски остаются вне этой фазы как сознательно отложенные follow-up работы, а не как quality debt;
  - какой extension seam предусмотрен для будущего tokenized top-up / balance top-up.

## Оценка

- Размер фазы: `medium`
- Ожидаемое число шагов: `4`
- Основные риски:
  - неверное понимание реального CloudPayments token contract;
  - регрессия существующего widget/webhook flow;
  - некорректная обработка невалидного токена и повторного fallback;
  - попытка одновременно охватить все card-based контуры без поэтапной валидации production invariants.

## Зависит от

- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md)
- [phase-4-loyalty-and-referral-wiring.md](./phase-4-loyalty-and-referral-wiring.md)
- [phase-10-client-payments-and-provider-hardening.md](./phase-10-client-payments-and-provider-hardening.md)

## Пререквизиты

- Подтверждён current CloudPayments runtime в:
  - `client/lib/cloudpayments.ts`
  - `backend/src/modules/payments/cloudpayments.service.ts`
  - `backend/src/modules/payments/payments.service.ts`
- В ЛК CloudPayments включена настройка сохранения токена карты для терминала, либо заранее подтверждена её точная semantics.
- Подтверждён provider contract:
  - `tokenize: true` / `SaveCard`;
  - обязательность `AccountId` для получения токена;
  - exact поля `Pay`-уведомления с токеном и маской карты;
  - метод оплаты по токену для повторного списания.
- Команда согласна с boundary этой фазы:
  - не строим в этой фазе полноценный wallet management product, если он не нужен для repeat-charge capability;
  - не делаем массовый рефактор payment domain без прямой необходимости;
  - не удаляем Robokassa;
  - в этой фазе `purchase` обязателен как первый production contour, а `top-up` / `balance top-up` явно остаются follow-up расширением поверх уже enterprise-ready storage/orchestration contract.

## Архитектурные решения

- Сохранённая карта в рамках этой фазы — это минимальная сущность `token + mask + owner`, а не отдельная платёжная платформа.
- Несмотря на ограничение первого business contour до `purchase`, реализация должна быть enterprise-grade:
  - с явными ownership rules;
  - с понятной fallback policy;
  - с идемпотентностью;
  - с production-safe logging;
  - с runbook/documentation baseline;
  - с контрактами, которые не придётся ломать при последующем расширении на top-up/balance top-up.
- Сырые карточные данные (`PAN`, `CVV`) не хранятся и не логируются.
- Existing widget flow остаётся основным способом первой оплаты и fallback-путём при проблемах с токеном.
- Repeat payment по токену должен быть привязан к существующей order/payment state machine, а не обходить её.
- Реализация должна строиться как `purchase-first`, но с extension seam:
  - storage model токена не должна быть жёстко завязана только на purchase page;
  - backend token charge helper должен проектироваться так, чтобы его можно было потом переиспользовать в top-up и balance-topup flows без смены базового контракта хранения токена;
  - при этом сама логика повторного списания в этой фазе внедряется только в purchase flow.
- Scope этой фазы ограничен repeat charge capability:
  - одна или несколько привязанных карт допускаются только в объёме, необходимом для использования токена;
  - богатый профильный UI управления картами не является обязательным условием завершения этой фазы, если capability repeat-charge закрыта production-grade способом.

## Scope

### Входит в фазу

- Добавление tokenization параметров в текущий widget flow.
- Захват токена и маски карты из CloudPayments `Pay`-уведомления.
- Минимальная persistence-модель для tokenized repeat payments.
- Backend path для оплаты по токену через CloudPayments API.
- Backend/token storage contract, пригодный для последующего переиспользования в top-up / balance-topup.
- Минимальный checkout UX для **purchase** выбора:
  - привязанная карта;
  - новая карта.
- Fallback policy при invalid/expired/broken token в purchase flow.
- Минимальные wiki/runbook обновления.

### Не входит в фазу

- Полноценный раздел "способы оплаты" с богатым управлением картами.
- Расширенный admin/support кабинет для saved cards.
- Сложная reconciliation platform для token lifecycle.
- Полная абстракция payment methods/providers.
- Автоматическое удаление токенов у провайдера, если это не нужно для repeat charge сценария.
- Повторная оплата по токену для eSIM top-up и balance top-up в рамках этой фазы.
- Компромиссные или временные решения уровня MVP, которые ломают будущий contract shape или требуют последующего переписывания storage/orchestration.

## Шаги (журналы)

1. [Шаг 1. CloudPayments token contract и минимальная data model](./phase-14/step-01-token-contract-and-model.md)
2. [Шаг 2. Widget tokenization и webhook token capture](./phase-14/step-02-widget-tokenization-and-webhook.md)
3. [Шаг 3. Repeat charge orchestration и fallback policy](./phase-14/step-03-repeat-charge-and-fallback.md)
4. [Шаг 4. Minimal checkout UX, verification и wiki updates](./phase-14/step-04-checkout-ux-and-verification.md)

## Верификация

- Первая оплата через widget с включённым checkbox приводит к получению токена от CloudPayments.
- Token и card mask сохраняются у правильного пользователя.
- Повторная **purchase** оплата может пройти по токену без повторного ввода карты.
- При проблеме с токеном purchase checkout корректно предлагает обычную оплату новой картой.
- Existing top-up/balance semantics не ломаются и не затрагиваются новой repeat-charge логикой.
- Data/API contract, добавленный в этой фазе, не мешает потом расширить token charge на top-up/balance.
- Реализация не требует архитектурного переписывания при будущем подключении top-up / balance top-up.
- Backend/client build и основные smoke flows проходят.

## Журнал

### 2026-05-17

- Исходная широкая saved-cards фаза была заменена на более узкую фазу под repeat payments через CloudPayments token.
- Scope сознательно сфокусирован на первом production contour `purchase`, но без MVP-компромиссов в storage/orchestration contracts.
- Фаза оставляет совместимый extension seam для будущего подключения tokenized top-up и balance-topup без обязательного переписывания базовой модели.

## Ссылки

- [Корневой документ wiki](../README.md)
- [Project Phases & Roadmap](./README.md)
- [Payment Flow Audit](../architecture/payment-flow-audit.md)
- [CloudPayments Runbook](../operations/cloudpayments-runbook.md)
- [Phase 10: Client Runtime, Payments & Provider Hardening](./phase-10-client-payments-and-provider-hardening.md)
