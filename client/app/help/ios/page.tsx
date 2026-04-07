'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function Step({ num, title, items }: { num: string; title: string; items: string[] }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#f77430] flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">{num}</span>
        </div>
        <h2 className="font-bold text-gray-900 text-base">{title}</h2>
      </div>
      <ul className="space-y-2 pl-11">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-700 leading-relaxed flex gap-2">
            <span className="text-[#f77430] shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 mb-6">
      <p className="text-sm text-amber-800 leading-relaxed">⚠️ {children}</p>
    </div>
  )
}

export default function IosInstallPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/70">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900">Установка на iPhone</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">

        {/* Hero */}
        <div className="card-neutral p-5 mb-6 flex items-center gap-4">
          <span className="text-4xl">🍎</span>
          <div>
            <p className="font-bold text-gray-900">iPhone и iPad</p>
            <p className="text-sm text-gray-500">Пошаговая инструкция по установке eSIM MojoMobile</p>
          </div>
        </div>

        <Note>
          QR-код одноразовый — сканируйте его только на том устройстве, с которым поедете в поездку.
        </Note>

        <Step
          num="1"
          title="Подготовка"
          items={[
            'Обновите iOS / iPadOS до актуальной версии.',
            'Убедитесь, что устройство не привязано к конкретному оператору (разблокировано).',
            'Подключитесь к стабильному Wi-Fi или мобильному интернету.',
            'Откройте письмо или личный кабинет MojoMobile — там QR-код и данные SM-DP+ / Activation Code.',
          ]}
        />

        <Step
          num="2"
          title="Установка по QR-коду (рекомендуется)"
          items={[
            'Откройте Настройки → Сотовая связь.',
            'Нажмите «Добавить eSIM» или «Добавить сотовый тариф».',
            'Выберите «Использовать QR-код».',
            'Наведите камеру на QR-код MojoMobile с экрана другого устройства.',
            'Нажмите «Продолжить» в появившемся окне и дождитесь активации.',
          ]}
        />

        <Step
          num="3"
          title="Установка вручную (если QR не сканируется)"
          items={[
            'Откройте Настройки → Сотовая связь → Добавить eSIM.',
            'Нажмите «Ввести вручную» внизу экрана.',
            'Введите SM-DP+ Address и Activation Code из письма или личного кабинета.',
            'Проверьте, что нет лишних пробелов, и нажмите «Далее».',
          ]}
        />

        <Step
          num="4"
          title="Настройка линий"
          items={[
            'Откройте Настройки → Сотовая связь → SIM-карты.',
            'Дайте профилю понятное имя, например «MojoMobile».',
            'В блоке «Мобильные данные» выберите MojoMobile eSIM.',
            'Основную (домашнюю) SIM оставьте для звонков и SMS.',
            'По желанию включите «Разрешить переключение мобильных данных».',
          ]}
        />

        <Step
          num="5"
          title="Активация по прибытии"
          items={[
            'По прилёте выключите режим «в самолёте».',
            'Откройте Настройки → Сотовая связь → Мобильные данные.',
            'Убедитесь, что выбрана MojoMobile eSIM.',
            'В «Параметрах данных» включите «Роуминг данных» для MojoMobile eSIM.',
            'Отключите мобильные данные и роуминг на домашней SIM, чтобы не было лишних расходов.',
            'Подождите несколько минут — устройство подключится к партнёрской сети.',
          ]}
        />

        <Step
          num="6"
          title="Как временно отключить eSIM (не удаляя)"
          items={[
            'Настройки → Сотовая связь → SIM-карты → MojoMobile eSIM.',
            'Переведите переключатель «Включить эту линию» в положение «Выкл.».',
            'Профиль останется в памяти — его можно включить обратно в любой момент.',
          ]}
        />

        <Note>
          Не удаляйте eSIM без необходимости — повторная установка по тому же QR-коду невозможна.
          Если профиль случайно удалён — напишите в поддержку.
        </Note>

        {/* Support CTA */}
        <div className="card-neutral p-5 text-center">
          <p className="text-sm text-gray-600 mb-3">Что-то пошло не так?</p>
          <a
            href="https://t.me/mojo_mobile_bot"
            target="_blank"
            rel="noreferrer"
            className="inline-block w-full py-3 rounded-2xl bg-[#f77430] text-white font-semibold text-sm"
          >
            Написать в поддержку
          </a>
        </div>

      </div>
    </div>
  )
}
