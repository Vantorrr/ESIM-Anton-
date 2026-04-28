/**
 * Нормализованный статус eSIM в нашей системе.
 *
 * Источник истины — сырой статус от провайдера eSIM Access (поле `esimStatus`
 * в ответе `POST /api/v1/open/esim/query`). Сырых значений много (NEW,
 * GOT_RESOURCE, RELEASED, INSTALLATION, USING, ENABLED, USED_UP, EXPIRED,
 * REVOKED, CANCEL, …) — они различаются версиями API и слабо стандартизованы.
 * Маппим всё это в небольшой набор бизнес-состояний, которые UI умеет рисовать.
 */
export enum EsimStatus {
  /** eSIM ещё не установлена пользователем (QR не отсканирован). */
  NOT_INSTALLED = 'NOT_INSTALLED',
  /** eSIM установлена и обслуживает трафик. */
  ACTIVE = 'ACTIVE',
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
  const code = String(raw).trim().toUpperCase();
  if (!code) return EsimStatus.UNKNOWN;

  switch (code) {
    case 'NEW':
    case 'GOT_RESOURCE':
    case 'RELEASED':
    case 'INSTALLATION':
    case 'INSTALLED':
      return EsimStatus.NOT_INSTALLED;

    case 'USING':
    case 'ENABLED':
    case 'IN_USE':
    case 'ACTIVE':
      return EsimStatus.ACTIVE;

    case 'EXPIRED':
      return EsimStatus.EXPIRED;

    case 'USED_UP':
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

/** Человекочитаемый текст для каждого статуса (для логов и Telegram). */
export function describeEsimStatus(status: EsimStatus): string {
  switch (status) {
    case EsimStatus.ACTIVE:
      return 'Активна';
    case EsimStatus.NOT_INSTALLED:
      return 'Не активирована';
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
