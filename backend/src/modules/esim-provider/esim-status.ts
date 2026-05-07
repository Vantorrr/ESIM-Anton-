/**
 * Нормализованный статус eSIM в нашей системе.
 *
 * Источник истины — сырой статус от провайдера eSIM Access (поле `esimStatus`
 * в ответах allocated-profile query вроде `/esim/list` и `/esim/query`).
 * Сырых значений много (NEW,
 * GOT_RESOURCE, RELEASED, INSTALLATION, USING, ENABLED, USED_UP, EXPIRED,
 * REVOKED, CANCEL, …) — они различаются версиями API и слабо стандартизованы.
 * Маппим всё это в небольшой набор бизнес-состояний, которые UI умеет рисовать.
 */
export enum EsimStatus {
  /** eSIM ещё не установлена пользователем (QR не отсканирован). */
  NOT_INSTALLED = 'NOT_INSTALLED',
  /** eSIM установлена и обслуживает трафик. */
  ACTIVE = 'ACTIVE',
  /** eSIM установлена, но временно выключена/заморожена. */
  SUSPENDED = 'SUSPENDED',
  /** Срок действия истёк по времени. */
  EXPIRED = 'EXPIRED',
  /** Весь трафик израсходован (но срок ещё не истёк). */
  USED_UP = 'USED_UP',
  /** Карта отозвана/отменена провайдером. */
  CANCELLED = 'CANCELLED',
  /** Не удалось распознать — UI рисует нейтральный бейдж. */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Маппинг сырого `esimStatus` от eSIM Access в нашу нормализацию.
 *
 * Регистр сырого значения нормализуется в верхний; неизвестные коды → UNKNOWN.
 * Важно: «GOT_RESOURCE»/«RELEASED»/«NEW»/«INSTALLATION» — это все стадии до
 * фактической установки на устройство, для пользователя это «Не активирована».
 */
export function mapEsimAccessStatus(raw: unknown): EsimStatus {
  if (raw === null || raw === undefined) return EsimStatus.UNKNOWN;
  const code = String(raw).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!code) return EsimStatus.UNKNOWN;

  switch (code) {
    case 'PROVISIONING':
    case 'NEW':
    case 'GOT_RESOURCE':
    case 'RELEASED':
    case 'AVAILABLE':
    case 'DOWNLOAD':
    case 'DOWNLOADED':
    case 'INSTALLATION':
    case 'INSTALLED':
      return EsimStatus.NOT_INSTALLED;

    case 'ONBOARD':
    case 'USING':
    case 'INUSE':
    case 'ENABLED':
    case 'IN_USE':
    case 'ACTIVE':
      return EsimStatus.ACTIVE;

    case 'SUSPENDED':
    case 'DISABLED':
      return EsimStatus.SUSPENDED;

    case 'EXPIRED':
      return EsimStatus.EXPIRED;

    case 'USED_UP':
    case 'USEDUP':
    case 'EXHAUSTED':
      return EsimStatus.USED_UP;

    case 'REVOKED':
    case 'CANCEL':
    case 'CANCELLED':
    case 'CANCELED':
      return EsimStatus.CANCELLED;

    default:
      return EsimStatus.UNKNOWN;
  }
}

/**
 * Fallback-мэппинг для SM-DP+ статуса.
 *
 * Важно: это НЕ то же самое, что eSIM data status. По документации eSIM Access
 * SM-DP+ описывает состояние установки профиля на устройстве, а не жизненный
 * цикл тарифного плана. Поэтому используем его только когда provider не прислал
 * явный `esimStatus`/`status`.
 */
export function mapEsimAccessSmdpStatus(raw: unknown): EsimStatus {
  if (raw === null || raw === undefined) return EsimStatus.UNKNOWN;
  const code = String(raw).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!code) return EsimStatus.UNKNOWN;

  switch (code) {
    case 'AVAILABLE':
    case 'DOWNLOAD':
    case 'DOWNLOADED':
      return EsimStatus.NOT_INSTALLED;

    case 'INSTALLATION':
    case 'INSTALLED':
      return EsimStatus.NOT_INSTALLED;

    // Профиль включён на устройстве, но это ещё не гарантирует реальное
    // потребление трафика/активацию data plan. Лучше нейтральный fallback,
    // чем ложная «Активна».
    case 'ENABLED':
      return EsimStatus.UNKNOWN;

    case 'DISABLED':
      return EsimStatus.SUSPENDED;

    // `DELETED` означает, что профиль удалён с устройства, но это не равно
    // provider-cancelled plan. Для бизнес-статуса не врём пользователю.
    case 'DELETED':
    default:
      return EsimStatus.UNKNOWN;
  }
}

/** Человекочитаемый текст для каждого статуса (для логов и Telegram). */
export function describeEsimStatus(status: EsimStatus): string {
  switch (status) {
    case EsimStatus.ACTIVE:
      return 'Активна';
    case EsimStatus.NOT_INSTALLED:
      return 'Не активирована';
    case EsimStatus.SUSPENDED:
      return 'Приостановлена';
    case EsimStatus.EXPIRED:
      return 'Истёк срок';
    case EsimStatus.USED_UP:
      return 'Трафик исчерпан';
    case EsimStatus.CANCELLED:
      return 'Отменена';
    case EsimStatus.UNKNOWN:
    default:
      return 'Статус неизвестен';
  }
}
