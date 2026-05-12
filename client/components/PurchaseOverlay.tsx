'use client'

import { useEffect, useState } from 'react'

export type PurchaseStage =
  | 'creating'     // Создаём заказ
  | 'paying'       // Обрабатываем оплату
  | 'provisioning' // Выдаём eSIM у провайдера
  | 'done'         // Готово!
  | 'error'        // Ошибка

interface PurchaseOverlayProps {
  /** null = оверлей скрыт */
  stage: PurchaseStage | null
  errorMessage?: string
  onClose?: () => void
}

const STAGE_META: Record<Exclude<PurchaseStage, 'error'>, { label: string; hint: string; order: number }> = {
  creating: { label: 'Создаём заказ', hint: 'Секунду…', order: 0 },
  paying: { label: 'Обрабатываем оплату', hint: 'Проверяем промокод и списываем средства', order: 1 },
  provisioning: { label: 'Выдаём eSIM', hint: 'Запрашиваем у провайдера — это может занять до 30 секунд', order: 2 },
  done: { label: 'Готово!', hint: 'Переходим к вашей eSIM…', order: 3 },
}

const ALL_STAGES: Exclude<PurchaseStage, 'error'>[] = ['creating', 'paying', 'provisioning', 'done']

export function PurchaseOverlay({ stage, errorMessage, onClose }: PurchaseOverlayProps) {
  const [visible, setVisible] = useState(false)

  // Появление/скрытие с анимацией
  useEffect(() => {
    if (stage) {
      // Микро-задержка, чтобы CSS-transition сработал
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [stage])

  if (!stage) return null

  const isError = stage === 'error'
  const currentOrder = isError ? -1 : STAGE_META[stage].order

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 backdrop-blur-sm p-6 transition-opacity duration-300 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      role="dialog"
      aria-modal="true"
      aria-label="Обработка покупки"
    >
      <div
        className={`w-full max-w-[360px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/60 dark:border-white/10 rounded-3xl shadow-2xl px-6 pt-8 pb-7 text-center transition-transform duration-300 ${visible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.97]'
          }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Иконка / спиннер */}
        <div className="flex justify-center mb-5">
          {isError ? (
            <div className="w-14 h-14 rounded-full bg-red-500/15 dark:bg-red-500/20 flex items-center justify-center text-red-500 animate-overlay-pop">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          ) : stage === 'done' ? (
            <div className="w-14 h-14 rounded-full bg-green-500/15 dark:bg-green-500/20 flex items-center justify-center text-green-500 animate-overlay-pop">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full border-[3px] border-[#f77430]/20 dark:border-[#f77430]/30 border-t-[#f77430] animate-spin" />
          )}
        </div>

        {/* Заголовок */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
          {isError ? 'Что-то пошло не так' : STAGE_META[stage].label}
        </h2>

        {/* Подсказка */}
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mb-6">
          {isError
            ? (errorMessage || 'Попробуйте ещё раз или обратитесь в поддержку')
            : STAGE_META[stage].hint}
        </p>

        {/* Степпер */}
        {!isError && stage !== 'done' && (
          <div className="flex flex-col gap-3 mb-5 text-left">
            {ALL_STAGES.filter(s => s !== 'done').map((s) => {
              const meta = STAGE_META[s]
              const isCurrent = meta.order === currentOrder
              const isPast = meta.order < currentOrder
              return (
                <div
                  key={s}
                  className={`flex items-center gap-2.5 transition-opacity duration-300 ${isCurrent || isPast ? 'opacity-100' : 'opacity-30'
                    }`}
                >
                  {/* Точка шага */}
                  <div
                    className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${isPast
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                        ? 'border-[#f77430] dark:border-[#f77430]'
                        : 'border-gray-300 dark:border-gray-600'
                      }`}
                  >
                    {isPast ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-[#f77430] animate-overlay-pulse" />
                    ) : null}
                  </div>

                  {/* Название шага */}
                  <span
                    className={`text-[13px] font-medium transition-colors duration-300 ${isPast
                      ? 'text-green-500'
                      : isCurrent
                        ? 'text-gray-900 dark:text-white font-semibold'
                        : 'text-gray-500 dark:text-gray-400'
                      }`}
                  >
                    {meta.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Предупреждение */}
        {!isError && stage !== 'done' && (
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-[#f77430]/[0.08] dark:bg-[#f77430]/[0.12] rounded-xl py-2 px-3.5">
            Пожалуйста, не закрывайте страницу
          </p>
        )}

        {/* Кнопка при ошибке */}
        {isError && onClose && (
          <button
            onClick={onClose}
            className="mt-2 px-7 py-3 bg-[#f77430] hover:bg-[#f2622a] text-white rounded-2xl text-[15px] font-semibold transition-opacity shadow-lg shadow-orange-500/30 active:opacity-85"
          >
            Закрыть
          </button>
        )}
      </div>
    </div>
  )
}
