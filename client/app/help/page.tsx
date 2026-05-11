'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Mail, Smartphone } from '@/components/icons'
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
    <div className="container animate-fade-in bg-[#f4f5f7] dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#f4f5f7]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800 -mx-5 px-5 pt-3 pb-3 mb-6">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900 dark:text-white">Помощь</h1>
          <div className="w-10" />
        </div>
      </div>


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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Свяжитесь с нами</h2>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Инструкции по установке</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/help/ios">
              <div className="card-neutral p-4 flex flex-col items-center text-center gap-2 active:scale-[0.98] transition-transform">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#1a1a1a">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                </svg>
                <p className="font-semibold text-gray-900 dark:text-white">iPhone / iPad</p>
                <p className="text-xs text-gray-500">iOS — пошагово</p>
              </div>
            </Link>
            <Link href="/help/android">
              <div className="card-neutral p-4 flex flex-col items-center text-center gap-2 active:scale-[0.98] transition-transform">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="#3DDC84">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 0 0-.1521-.5676.416.416 0 0 0-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 0 0-.5677-.1521.4157.4157 0 0 0-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396"/>
                </svg>
                <p className="font-semibold text-gray-900 dark:text-white">Android</p>
                <p className="text-xs text-gray-500">Samsung, Xiaomi, Pixel</p>
              </div>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Частые вопросы</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, index) => (
              <div key={index} className="card-neutral overflow-hidden">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left"
                >
                  <span className="font-medium text-gray-900 dark:text-white pr-4">{faq.question}</span>
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



      <BottomNav />
    </div>
  )
}
