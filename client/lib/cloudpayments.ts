/**
 * Тонкая обёртка над CloudPayments-виджетом, который грузится скриптом
 * из layout.tsx (`https://widget.cloudpayments.ru/bundles/cloudpayments.js`).
 *
 * Виджет глобально доступен как `window.cp.CloudPayments` после загрузки.
 * Эта обёртка:
 *  - ждёт, пока скрипт реально подгрузится (с разумным таймаутом);
 *  - оборачивает callback-API виджета в Promise;
 *  - даёт типизированную точку вызова `payCloudPayments(...)`.
 */

declare global {
  interface Window {
    cp?: { CloudPayments: new () => any }
  }
}

export interface CloudPaymentsChargeOptions {
  publicId: string
  description: string
  amount: number
  currency?: string
  invoiceId: string
  accountId: string
  email?: string
  data?: Record<string, any>
  skin?: 'classic' | 'modern' | 'mini'
  saveCard?: boolean
}

export interface CloudPaymentsResult {
  success: boolean
  /** Полные данные опций виджета (callback-аргумент CloudPayments). */
  options?: any
  /** Причина отказа (заполнено только для success=false). */
  reason?: string
  reasonCode?: number | string
}

const SCRIPT_LOAD_TIMEOUT_MS = 8000

async function dismissMobileKeyboard(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const active = document.activeElement as HTMLElement | null
  if (active && typeof active.blur === 'function') {
    active.blur()
  }

  // iOS Safari/WebView can keep the software keyboard alive even after blur.
  // Focusing a temporary readonly input is a pragmatic workaround before opening
  // a third-party payment iframe / 3DS challenge.
  const isIOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent)
  if (isIOS) {
    const shim = document.createElement('input')
    shim.setAttribute('readonly', 'readonly')
    shim.setAttribute('aria-hidden', 'true')
    shim.tabIndex = -1
    shim.style.position = 'fixed'
    shim.style.opacity = '0'
    shim.style.pointerEvents = 'none'
    shim.style.height = '0'
    shim.style.width = '0'
    shim.style.top = '0'
    shim.style.left = '0'
    shim.style.fontSize = '16px'
    document.body.appendChild(shim)
    shim.focus()
    shim.blur()
    shim.remove()
  }

  window.scrollTo({ top: 0, behavior: 'auto' })
  await new Promise((resolve) => window.setTimeout(resolve, 80))
}

async function waitForCloudPayments(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('CloudPayments доступен только в браузере')
  }
  if (window.cp?.CloudPayments) return

  const start = Date.now()
  await new Promise<void>((resolve, reject) => {
    const interval = setInterval(() => {
      if (window.cp?.CloudPayments) {
        clearInterval(interval)
        resolve()
        return
      }
      if (Date.now() - start > SCRIPT_LOAD_TIMEOUT_MS) {
        clearInterval(interval)
        reject(new Error('CloudPayments-виджет не загрузился. Проверьте подключение к сети.'))
      }
    }, 100)
  })
}

/**
 * Открывает виджет CloudPayments в режиме `charge` (одноразовое списание).
 * Возвращает Promise, который резолвится после закрытия виджета.
 */
export async function payCloudPayments(
  options: CloudPaymentsChargeOptions,
): Promise<CloudPaymentsResult> {
  await dismissMobileKeyboard()
  await waitForCloudPayments()

  return new Promise<CloudPaymentsResult>((resolve) => {
    let settled = false
    const finish = (result: CloudPaymentsResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const widget = new window.cp!.CloudPayments()
    widget.pay(
      'charge',
      {
        publicId: options.publicId,
        description: options.description,
        amount: options.amount,
        currency: options.currency || 'RUB',
        invoiceId: options.invoiceId,
        accountId: options.accountId,
        email: options.email,
        skin: options.skin || 'modern',
        data: options.data || {},
        // CloudPayments docs use SaveCard in API tables; the widget surface in the
        // wild is inconsistent between examples, so we pass both spellings.
        saveCard: options.saveCard,
        SaveCard: options.saveCard,
      },
      {
        onSuccess: (opts: any) => {
          void dismissMobileKeyboard()
          finish({ success: true, options: opts })
        },
        onFail: (reason: string, opts: any) =>
          {
            void dismissMobileKeyboard()
            finish({ success: false, reason, options: opts })
          },
        onComplete: (paymentResult: any) => {
          void dismissMobileKeyboard()
          // Если onSuccess/onFail не сработали (некоторые скины) — fallback
          if (paymentResult?.success === false) {
            finish({
              success: false,
              reason: paymentResult?.message,
              reasonCode: paymentResult?.code,
            })
          } else if (paymentResult?.success === true) {
            finish({ success: true, options: paymentResult })
          }
        },
      },
    )
  })
}
