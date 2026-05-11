/**
 * Зеркало `backend/src/common/utils/esim-links.ts` для клиента.
 * Любые правки делать в обоих файлах синхронно.
 */

const APPLE_QUICK_INSTALL_BASE = 'https://esimsetup.apple.com/esim_qrcode_provisioning'
const ANDROID_QUICK_INSTALL_BASE = 'https://esimsetup.android.com/esim_qrcode_provisioning'

export interface EsimActivationLinks {
  lpa: string | null
  appleUniversalLink: string | null
  androidUniversalLink: string | null
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
  return `${APPLE_QUICK_INSTALL_BASE}?carddata=${lpa}`
}

export function buildAndroidQuickInstall(lpa: string | null): string | null {
  if (!lpa) return null
  return `${ANDROID_QUICK_INSTALL_BASE}?carddata=${lpa}`
}

export function buildEsimActivationLinks(
  smdpAddress?: string | null,
  activationCode?: string | null,
): EsimActivationLinks {
  const ac = (activationCode ?? '').trim()
  const smdp = (smdpAddress ?? '').trim()

  const lpa = ac.startsWith('LPA:') ? ac : buildLpaString(smdp, ac)

  return {
    lpa,
    appleUniversalLink: buildAppleQuickInstall(lpa),
    androidUniversalLink: buildAndroidQuickInstall(lpa),
  }
}

export function parseLpaString(lpa?: string | null): { smdp: string; ac: string } | null {
  if (!lpa) return null
  const trimmed = lpa.trim()
  const match = /^LPA:\d+\$([^$]+)\$([^$]*)$/i.exec(trimmed)
  if (!match) return null
  return { smdp: match[1] ?? '', ac: match[2] ?? '' }
}
