'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, ChevronUp, MessageCircle, Mail, Smartphone } from 'lucide-react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

interface FAQ {
  question: string
  answer: string
}

const faqs: FAQ[] = [
  {
    question: 'Что такое eSIM?',
    answer: 'eSIM (embedded SIM) — это встроенная в устройство виртуальная SIM-карта. Она позволяет подключаться к мобильным сетям без физической SIM-карты. Просто сканируете QR-код и готово!'
  },
  {
    question: 'Как установить eSIM?',
    answer: 'После оплаты вы получите QR-код. Перейдите в Настройки → Сотовая связь → Добавить тарифный план → Сканировать QR-код. Следуйте инструкциям на экране.'
  },
  {
    question: 'Какие устройства поддерживают eSIM?',
    answer: 'eSIM поддерживают: iPhone XS и новее, Samsung Galaxy S20 и новее, Google Pixel 3 и новее, а также многие другие современные смартфоны и планшеты.'
  },
  {
    question: 'Можно ли использовать eSIM и обычную SIM вместе?',
    answer: 'Да! Большинство современных устройств поддерживают Dual SIM — вы можете использовать физическую SIM для звонков, а eSIM для интернета за границей.'
  },
  {
    question: 'Когда активируется eSIM?',
    answer: 'eSIM активируется сразу после установки. Некоторые тарифы начинают отсчёт с момента первого подключения к сети в стране назначения.'
  },
  {
    question: 'Можно ли продлить или пополнить eSIM?',
    answer: 'Да, для многих тарифов доступно пополнение. Вы можете докупить дополнительный трафик или продлить срок действия в разделе "Мои eSIM".'
  },
  {
    question: 'Что делать если eSIM не работает?',
    answer: 'Проверьте, что: 1) Включён роуминг данных, 2) Выбран правильный тарифный план для интернета, 3) Устройство перезагружено. Если проблема сохраняется — напишите в поддержку.'
  },
  {
    question: 'Как получить возврат?',
    answer: 'Если eSIM не был активирован, мы можем оформить полный возврат в течение 30 дней. Напишите в поддержку с номером заказа.'
  },
]

export default function HelpPage() {
  const router = useRouter()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/70">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900">Помощь</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        
        {/* Check Device Support */}
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
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Свяжитесь с нами
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="https://t.me/support" 
              target="_blank" 
              rel="noopener noreferrer"
              className="card-accent p-4"
            >
              <MessageCircle size={28} className="mb-2" />
              <p className="font-semibold">Telegram</p>
              <p className="text-sm text-white/80">Быстрый ответ</p>
            </a>
            <a
              href="mailto:support@esim.travel"
              className="card-accent p-4"
            >
              <Mail size={28} className="mb-2" />
              <p className="font-semibold">Email</p>
              <p className="text-sm text-white/80">support@esim.travel</p>
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Частые вопросы
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="card-neutral overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left"
                >
                  <span className="font-medium text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  {openIndex === index ? (
                    <ChevronUp className="text-gray-400 shrink-0" size={20} />
                  ) : (
                    <ChevronDown className="text-gray-400 shrink-0" size={20} />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-gray-600 text-sm leading-relaxed">
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
