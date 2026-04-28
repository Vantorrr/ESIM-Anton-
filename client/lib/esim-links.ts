/**
 * Зеркало `backend/src/common/utils/esim-links.ts` для клиента.
 * Любые правки делать в обоих файлах синхронно.
 */

const APPLE_QUICK_INSTALL_BASE = 'https://esimsetup.apple.com/esim_qrcode_provisioning'

export interface EsimActivationLinks {
  lpa: string | null
  appleUniversalLink: string | null
  androidIntent: string | null
}

export function buildLpaString(
  smdpAddress?: string | null,
  activationCode?: string | null,
): string | null {
  const smdp = (smdpAddress ?? '').trim()
  if (!smdp) return null
  const ac = (activationCode ?? '').trim()
  return ac ? `LPA:1$${smdp}$${ac}` : `LPA:1$${smdp}$`
}

export function buildAppleQuickInstall(lpa: string | null): string | null {
  if (!lpa) return null
  return `${APPLE_QUICK_INSTALL_BASE}?carddata=${encodeURIComponent(lpa)}`
}

export function buildAndroidIntent(lpa: string | null): string | null {
  if (!lpa) return null
  const payload = lpa.startsWith('LPA:') ? lpa.slice(4) : lpa
  return `intent://${encodeURIComponent(payload)}#Intent;scheme=lpa;package=com.android.settings;end`
}

export function buildEsimActivationLinks(
  smdpAddress?: string | null,
  activationCode?: string | null,
): EsimActivationLinks {
  const lpa = buildLpaString(smdpAddress, activationCode)
  return {
    lpa,
    appleUniversalLink: buildAppleQuickInstall(lpa),
    androidIntent: buildAndroidIntent(lpa),
  }
}
