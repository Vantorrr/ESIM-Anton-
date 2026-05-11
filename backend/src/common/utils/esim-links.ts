/**
 * Хелперы для построения ссылок активации eSIM.
 *
 * LPA-строка — это стандарт SGP.22 от GSMA, который понимают все современные
 * iOS/Android. Формат: `LPA:1$<smdpAddress>$<activationCode>` (две части,
 * разделённые знаком `$`). Если matchingId/confirmationCode пустой — третья
 * секция опускается, разделитель остаётся.
 *
 * iOS 17.4+ поддерживает Universal Link от Apple
 * (`https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA:1$smdp$ac`),
 * который при тапе открывает «Настройки → Добавить eSIM» автоматически.
 *
 * Android поддерживает аналогичный Universal Link
 * (`https://esimsetup.android.com/esim_qrcode_provisioning?carddata=LPA:1$smdp$ac`),
 * который работает на большинстве устройств с Android 10+ (Samsung, Pixel, etc).
 *
 * carddata передаётся без URL-энкодинга, так как `$` не является
 * зарезервированным символом в query string — это соответствует формату,
 * который использует провайдер eSIM Access в своём дашборде.
 *
 * Зеркало этого файла лежит в `client/lib/esim-links.ts` — изменяй оба.
 */

const APPLE_QUICK_INSTALL_BASE = 'https://esimsetup.apple.com/esim_qrcode_provisioning';
const ANDROID_QUICK_INSTALL_BASE = 'https://esimsetup.android.com/esim_qrcode_provisioning';

export interface EsimActivationLinks {
  lpa: string | null;
  appleUniversalLink: string | null;
  androidUniversalLink: string | null;
}

/** Собирает LPA-строку. Возвращает null, если smdp пустой. */
export function buildLpaString(smdpAddress?: string | null, activationCode?: string | null): string | null {
  const smdp = (smdpAddress ?? '').trim();
  if (!smdp) return null;
  const ac = (activationCode ?? '').trim();
  return ac ? `LPA:1$${smdp}$${ac}` : `LPA:1$${smdp}$`;
}

/** Apple Universal Link. carddata = LPA-строка без URL-энкодинга. */
export function buildAppleQuickInstall(lpa: string | null): string | null {
  if (!lpa) return null;
  return `${APPLE_QUICK_INSTALL_BASE}?carddata=${lpa}`;
}

/** Android Universal Link. Формат идентичен Apple. */
export function buildAndroidQuickInstall(lpa: string | null): string | null {
  if (!lpa) return null;
  return `${ANDROID_QUICK_INSTALL_BASE}?carddata=${lpa}`;
}

/** Главная фабрика — собирает сразу все три ссылки. */
export function buildEsimActivationLinks(
  smdpAddress?: string | null,
  activationCode?: string | null,
): EsimActivationLinks {
  const ac = (activationCode ?? '').trim();
  const smdp = (smdpAddress ?? '').trim();

  // Если activationCode уже является готовой LPA-строкой (например, от eSIM Access), используем её напрямую
  const lpa = ac.startsWith('LPA:') ? ac : buildLpaString(smdp, ac);

  return {
    lpa,
    appleUniversalLink: buildAppleQuickInstall(lpa),
    androidUniversalLink: buildAndroidQuickInstall(lpa),
  };
}

/**
 * Если в БД есть только activationCode, который уже содержит LPA-формат
 * (некоторые провайдеры так делают), вытаскиваем оттуда smdp и matching.
 * Это fallback — основной путь всё-таки через явный smdpAddress.
 */
export function parseLpaString(lpa?: string | null): { smdp: string; ac: string } | null {
  if (!lpa) return null;
  const trimmed = lpa.trim();
  // Формат: LPA:1$smdp.example.com$XXXX  (третья часть опциональна)
  const match = /^LPA:\d+\$([^$]+)\$([^$]*)$/i.exec(trimmed);
  if (!match) return null;
  return { smdp: match[1] ?? '', ac: match[2] ?? '' };
}
