'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Mail, Smartphone } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { useSmartBack } from '@/lib/useSmartBack'

interface FAQ {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: 'Что такое eSIM?',
    answer: 'eSIM (embedded SIM) — это встроенная в устройство виртуальная SIM-карта. Она позволяет подключаться к мобильным сетям без физической SIM-карты. Просто сканируете QR-код — и готово! На eSIM нет телефонного номера, она работает только для мобильного интернета.'
  },
  {
    question: 'Что проверить перед установкой?',
    answer: 'Перед установкой убедитесь, что:\n• Устройство поддерживает eSIM (в настройках есть пункт «Добавить eSIM»).\n• Установлена актуальная версия iOS или Android.\n• Телефон не заблокирован под конкретного оператора.\n• Есть стабильный Wi-Fi или мобильный интернет.\n• Вы устанавливаете eSIM именно на то устройство, с которым поедете — QR-код одноразовый.'
  },
  {
    question: 'Как установить eSIM?',
    answer: 'После оплаты вы получите QR-код в личном кабинете и на email. Установка зависит от устройства:\n• iPhone: Настройки → Сотовая связь → Добавить eSIM → Сканировать QR-код.\n• Android: Настройки → SIM-карты → Добавить eSIM → Сканировать QR-код.\nПодробные инструкции с пошаговыми скриншотами — в разделе «Инструкции» выше.'
  },
  {
    question: 'Какие устройства поддерживают eSIM?',
    answer: 'eSIM поддерживают:\n• iPhone XS и новее (все модели, включая SE 2020+)\n• Samsung Galaxy S20 и новее, Z Fold/Flip\n• Google Pixel 3 и новее\n• Xiaomi/Redmi/POCO ряда моделей\nТочную проверку можно сделать через кнопку «Проверить устройство» выше.'
  },
  {
    question: 'Можно ли использовать eSIM и обычную SIM вместе?',
    answer: 'Да! Большинство современных устройств поддерживают Dual SIM. Вы можете оставить домашнюю SIM для звонков и SMS, а eSIM MojoMobile использовать для интернета за границей. В настройках просто выберите MojoMobile как источник мобильных данных.'
  },
  {
    question: 'Когда активируется eSIM?',
    answer: 'eSIM устанавливается заранее, но лучше активировать её по прибытии в страну назначения:\n1. Выключите режим «в самолёте».\n2. Убедитесь, что для мобильных данных выбрана MojoMobile eSIM.\n3. Включите роуминг данных для MojoMobile eSIM.\n4. Подождите 1–3 минуты — устройство подключится к партнёрской сети.'
  },
  {
    question: 'После установки нет интернета — что делать?',
    answer: 'Проверьте по порядку:\n• Перезагрузите смартфон.\n• В настройках SIM убедитесь, что для мобильных данных выбрана MojoMobile eSIM, а не домашняя SIM.\n• Включите роуминг данных для MojoMobile eSIM.\n• Отключите мобильные данные и роуминг на домашней SIM.\n• Убедитесь, что срок действия тарифа уже начался (проверьте в личном кабинете).\nЕсли ничего не помогло — напишите в поддержку.'
  },
  {
    question: 'QR-код пишет «недействителен» или «уже использован»',
    answer: 'Это значит, что:\n• eSIM-профиль уже был установлен на это или другое устройство — проверьте список SIM-карт, возможно eSIM уже там.\n• Код истёк по времени.\n• Установка прервалась некорректно.\nОдин QR-код нельзя использовать повторно. Если профиль удалён или установка прервалась — обратитесь в поддержку со скриншотом ошибки.'
  },
  {
    question: 'Можно ли перенести eSIM на другой телефон?',
    answer: 'После установки eSIM привязывается к одному устройству. Перенести на другой смартфон без перевыпуска нельзя.\n\nЕсли планируете смену телефона — заранее свяжитесь с поддержкой MojoMobile, чтобы уточнить возможность перевыпуска eSIM.'
  },
  {
    question: 'Можно ли удалить eSIM и установить заново?',
    answer: 'Нет. Удаление eSIM-профиля необратимо — повторная установка по тому же QR-коду невозможна.\n\nЕсли поездка закончилась, лучше не удалять eSIM, а просто отключить её в настройках. Удаляйте только если уверены, что она больше не понадобится, или если попросила поддержка.'
  },
  {
    question: 'Как временно отключить eSIM, не удаляя?',
    answer: '• iPhone: Настройки → Сотовая связь → SIM-карты → MojoMobile eSIM → отключить «Включить эту линию».\n• Android: Настройки → SIM-карты → выключить переключатель рядом с MojoMobile eSIM.\n\nПрофиль остаётся в памяти устройства, включить обратно можно в любой момент.'
  },
  {
    question: 'Как не потратить трафик лишний раз?',
    answer: 'Несколько советов для экономии трафика:\n• Отключите автообновление приложений в App Store / Google Play.\n• Ограничьте фоновую передачу данных для соцсетей и облачных галерей.\n• По возможности используйте Wi-Fi в отеле для тяжёлых задач (скачивание карт, резервные копии).\n• Отключите мобильные данные на домашней SIM, чтобы не платить за роуминг у домашнего оператора.'
  },
  {
    question: 'Можно ли продлить или пополнить eSIM?',
    answer: 'Да, для ряда тарифов доступно пополнение трафика или продление. Уточните в поддержке MojoMobile для конкретного тарифа. Новые eSIM всегда можно купить в разделе «Магазин».'
  },
  {
    question: 'Как получить возврат?',
    answer: 'Если eSIM не был активирован и не использован, мы можем оформить возврат. Напишите в поддержку с номером заказа. Срок рассмотрения — до 10 рабочих дней.'
  },
]

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const handleBack = useSmartBack('/profile')

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/70">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={handleBack} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900">Помощь</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">

        {/* Check Device */}
        <section className="mb-6">
          <Link href="/devices">
            <div className="card-accent p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Smartphone size={28} />
                </div>
                <div>
                  <p className="font-bold text-lg">Проверить устройство</p>
                  <p className="text-sm text-white/80">Поддерживает ли ваш телефон eSIM</p>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Contact Cards */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Свяжитесь с нами</h2>
          <a
            href="mailto:mojomobile@yandex.ru"
            className="card-accent p-5 flex items-center gap-4"
          >
            <Mail size={28} className="shrink-0" />
            <div>
              <p className="font-semibold text-lg">Email</p>
              <p className="text-sm text-white/80">mojomobile@yandex.ru</p>
            </div>
          </a>
        </section>

        {/* Installation Guides */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Инструкции по установке</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/help/ios">
              <div className="card-neutral p-4 flex flex-col items-center text-center gap-2 active:scale-[0.98] transition-transform">
                <svg viewBox="0 0 814 1000" className="w-10 h-10" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.4-150.3-113.4C173.6 831.6 128 739.4 128 651.6c0-141.4 91.6-216.3 181.3-216.3 67.1 0 116.1 43.8 155.5 43.8 37.5 0 93.2-46.6 168.7-46.6 21.5 0 123.9 2 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                </svg>
                <p className="font-semibold text-gray-900">iPhone / iPad</p>
                <p className="text-xs text-gray-500">iOS — пошагово</p>
              </div>
            </Link>
            <Link href="/help/android">
              <div className="card-neutral p-4 flex flex-col items-center text-center gap-2 active:scale-[0.98] transition-transform">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#3DDC84">
                  <path d="M17.523 15.341a.676.676 0 0 1-.676.676H7.153a.676.676 0 0 1-.676-.676V9.01h11.046v6.331zm-9.369 3.312a.901.901 0 1 1-1.802 0v-2.636h1.802v2.636zm7.692 0a.901.901 0 1 1-1.802 0v-2.636h1.802v2.636zM7.133 8.332l-1.23-2.11a.27.27 0 0 1 .468-.27l1.246 2.14a7.312 7.312 0 0 1 4.383-1.4 7.312 7.312 0 0 1 4.383 1.4l1.246-2.14a.27.27 0 0 1 .468.27l-1.23 2.11a7.304 7.304 0 0 1 3.133 5.678H4c0-2.375 1.182-4.47 3.133-5.678zM9.927 5.674a.585.585 0 1 1-1.17 0 .585.585 0 0 1 1.17 0zm5.316 0a.585.585 0 1 1-1.17 0 .585.585 0 0 1 1.17 0z"/>
                </svg>
                <p className="font-semibold text-gray-900">Android</p>
                <p className="text-xs text-gray-500">Samsung, Xiaomi, Pixel</p>
              </div>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Частые вопросы</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="card-neutral overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left"
                >
                  <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                  {openIndex === index ? (
                    <ChevronUp className="text-gray-400 shrink-0" size={20} />
                  ) : (
                    <ChevronDown className="text-gray-400 shrink-0" size={20} />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>

      <BottomNav />
    </div>
  )
}
