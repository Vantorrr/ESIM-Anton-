/**
 * Хелперы для построения ссылок активации eSIM.
 *
 * LPA-строка — это стандарт SGP.22 от GSMA, который понимают все современные
 * iOS/Android. Формат: `LPA:1$<smdpAddress>$<activationCode>` (две части,
 * разделённые знаком `$`). Если matchingId/confirmationCode пустой — третья
 * секция опускается, разделитель остаётся.
 *
 * iOS 17.4+ поддерживает Universal Link от Apple
 * (`https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=...`),
 * который при тапе открывает «Настройки → Добавить eSIM» автоматически.
 *
 * Android универсальной ссылки не имеет (поведение зависит от прошивки).
 * На большинстве устройств работает intent с `scheme=lpa`, но без гарантий —
 * поэтому в UI мы дополнительно даём «Скопировать LPA-код» с инструкцией.
 *
 * Зеркало этого файла лежит в `client/lib/esim-links.ts` — изменяй оба.
 */

const APPLE_QUICK_INSTALL_BASE = 'https://esimsetup.apple.com/esim_qrcode_provisioning';

export interface EsimActivationLinks {
  lpa: string | null;
  appleUniversalLink: string | null;
  androidIntent: string | null;
}

/** Собирает LPA-строку. Возвращает null, если smdp пустой. */
export function buildLpaString(smdpAddress?: string | null, activationCode?: string | null): string | null {
  const smdp = (smdpAddress ?? '').trim();
  if (!smdp) return null;
  const ac = (activationCode ?? '').trim();
  return ac ? `LPA:1$${smdp}$${ac}` : `LPA:1$${smdp}$`;
}

/** Apple Universal Link. Параметр carddata должен быть URL-энкоднутым LPA. */
export function buildAppleQuickInstall(lpa: string | null): string | null {
  if (!lpa) return null;
  return `${APPLE_QUICK_INSTALL_BASE}?carddata=${encodeURIComponent(lpa)}`;
}

/**
 * Android intent. На Pixel и многих других устройствах открывает Settings ->
 * Network & internet -> SIM cards -> Add eSIM. Но это best-effort: ряд
 * прошивок (Samsung старых версий, Xiaomi и т.п.) intent проигнорируют —
 * на этот случай в UI должна быть кнопка «Скопировать код активации».
 */
export function buildAndroidIntent(lpa: string | null): string | null {
  if (!lpa) return null;
  // Удаляем префикс "LPA:" — в Android intent передаётся без него
  const payload = lpa.startsWith('LPA:') ? lpa.slice(4) : lpa;
  return `intent://${encodeURIComponent(payload)}#Intent;scheme=lpa;package=com.android.settings;end`;
}

/** Главная фабрика — собирает сразу все три ссылки. */
export function buildEsimActivationLinks(
  smdpAddress?: string | null,
  activationCode?: string | null,
): EsimActivationLinks {
  const lpa = buildLpaString(smdpAddress, activationCode);
  return {
    lpa,
    appleUniversalLink: buildAppleQuickInstall(lpa),
    androidIntent: buildAndroidIntent(lpa),
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
