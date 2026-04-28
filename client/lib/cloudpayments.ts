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
  await waitForCloudPayments()

  return new Promise<CloudPaymentsResult>((resolve) => {
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
      },
      {
        onSuccess: (opts: any) => resolve({ success: true, options: opts }),
        onFail: (reason: string, opts: any) =>
          resolve({ success: false, reason, options: opts }),
        onComplete: (paymentResult: any) => {
          // Если onSuccess/onFail не сработали (некоторые скины) — fallback
          if (paymentResult?.success === false) {
            resolve({
              success: false,
              reason: paymentResult?.message,
              reasonCode: paymentResult?.code,
            })
          }
        },
      },
    )
  })
}
