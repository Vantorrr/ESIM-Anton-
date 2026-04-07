'use client'

import { ArrowLeft } from 'lucide-react'
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

function Brand({ emoji, name, items }: { emoji: string; name: string; items: string[] }) {
  return (
    <div className="card-neutral p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <p className="font-semibold text-gray-900">{name}</p>
      </div>
      <ul className="space-y-2">
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

export default function AndroidInstallPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/70">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900">Установка на Android</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">

        {/* Hero */}
        <div className="card-neutral p-5 mb-6 flex items-center gap-4">
          <span className="text-4xl">🤖</span>
          <div>
            <p className="font-bold text-gray-900">Android-смартфоны</p>
            <p className="text-sm text-gray-500">Samsung, Xiaomi, Google Pixel и другие</p>
          </div>
        </div>

        <Note>
          QR-код одноразовый — сканируйте его только на том устройстве, с которым поедете в поездку.
        </Note>

        <Step
          num="1"
          title="Подготовка"
          items={[
            'Убедитесь, что смартфон поддерживает eSIM (в настройках есть пункт «Добавить eSIM»).',
            'Установите актуальные обновления системы (О телефоне → Обновление ПО).',
            'Подключитесь к стабильному Wi-Fi.',
            'Откройте письмо или личный кабинет MojoMobile — там QR-код и данные SM-DP+ / Activation Code.',
          ]}
        />

        {/* By brand */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#f77430] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold">2</span>
            </div>
            <h2 className="font-bold text-gray-900 text-base">Установка по марке устройства</h2>
          </div>

          <Brand
            emoji="📱"
            name="Samsung Galaxy"
            items={[
              'Настройки → Подключения → Диспетчер SIM-карт.',
              'Нажмите «Добавление eSIM» → «Сканировать QR-код поставщика услуг».',
              'Наведите камеру на QR-код MojoMobile и подтвердите добавление.',
              'Откройте Мобильные сети и убедитесь, что для мобильных данных выбрана MojoMobile eSIM.',
            ]}
          />

          <Brand
            emoji="📱"
            name="Xiaomi / Redmi / POCO"
            items={[
              'Настройки → SIM-карты и мобильные сети.',
              'Нажмите «Добавить eSIM» или «Управление eSIM».',
              'Выберите «Сканировать QR-код» и наведите камеру на QR-код MojoMobile.',
              'В разделе «SIM для мобильных данных» выберите MojoMobile eSIM.',
              'При необходимости включите роуминг данных для этой SIM.',
            ]}
          />

          <Brand
            emoji="📱"
            name="Google Pixel и другие"
            items={[
              'Settings → Network & Internet → SIMs.',
              'Нажмите «+ Add eSIM» и выберите «Scan QR code».',
              'Наведите камеру на QR-код MojoMobile.',
              'Убедитесь, что в Mobile data выбрана MojoMobile eSIM.',
            ]}
          />
        </div>

        <Step
          num="3"
          title="Установка вручную (если QR не сканируется)"
          items={[
            'Откройте настройки SIM-карт (см. шаг 2 для вашей марки).',
            'Выберите «Добавить eSIM» → «Ввести код активации вручную».',
            'Введите SM-DP+ Address и Activation Code из письма или личного кабинета.',
            'Проверьте отсутствие лишних пробелов и нажмите «Далее».',
          ]}
        />

        <Step
          num="4"
          title="Настройка мобильных данных и роуминга"
          items={[
            'Настройки → SIM-карты → «SIM для мобильных данных» → выберите MojoMobile eSIM.',
            'Включите «Передача данных» для MojoMobile eSIM.',
            'Включите «Роуминг данных» для этой SIM (если тариф предусматривает международное использование).',
            'Для домашней SIM отключите мобильные данные и роуминг, чтобы не было лишних расходов.',
          ]}
        />

        <Step
          num="5"
          title="Активация по прибытии"
          items={[
            'По прилёте отключите режим «в самолёте».',
            'Убедитесь, что SIM для мобильных данных — MojoMobile eSIM.',
            'Включите передачу данных и роуминг данных для MojoMobile eSIM.',
            'Подождите подключения к партнёрской сети (обычно 1–3 минуты).',
            'Если интернет не появился — перезагрузите устройство и повторите.',
          ]}
        />

        <Step
          num="6"
          title="Как временно отключить eSIM (не удаляя)"
          items={[
            'Откройте настройки SIM-карт.',
            'Выключите переключатель рядом с MojoMobile eSIM или выберите другую SIM для мобильных данных.',
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
