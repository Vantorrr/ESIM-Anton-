'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Smartphone, Tablet, Laptop, ChevronDown, Check, Copy, Info } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

type DeviceCategory = 'apple' | 'samsung' | 'google' | 'other'

interface DeviceList {
  category: string
  icon: string
  devices: string[]
  note?: string
}

const deviceData: Record<DeviceCategory, DeviceList> = {
  apple: {
    category: 'Apple',
    icon: '🍎',
    devices: [
      'iPhone 16 *',
      'iPhone 16 Plus *',
      'iPhone 16 Pro *',
      'iPhone 16 Pro Max *',
      'iPhone 16e *',
      'iPhone 15 *',
      'iPhone 15 Plus *',
      'iPhone 15 Pro *',
      'iPhone 15 Pro Max *',
      'iPhone 14 *',
      'iPhone 14 Plus *',
      'iPhone 14 Pro *',
      'iPhone 14 Pro Max *',
      'iPhone 13 *',
      'iPhone 13 Mini *',
      'iPhone 13 Pro *',
      'iPhone 13 Pro Max *',
      'iPhone 12 *',
      'iPhone 12 Mini *',
      'iPhone 12 Pro *',
      'iPhone 12 Pro Max *',
      'iPhone 11 *',
      'iPhone 11 Pro *',
      'iPhone 11 Pro Max *',
      'iPhone XS *',
      'iPhone XS Max *',
      'iPhone XR *',
      'iPhone SE (2020) *',
      'iPhone SE (2022) *',
      'iPad Air (3rd Gen) *',
      'iPad Air (4th Gen) *',
      'iPad Air (5th Gen) *',
      'iPad Pro 11-inch (1st Gen) *',
      'iPad Pro 11-inch (2nd Gen) *',
      'iPad Pro 11-inch (3rd Gen) *',
      'iPad Pro 11-inch (4th Gen) *',
      'iPad Pro 12.9-inch (3rd Gen) *',
      'iPad Pro 12.9-inch (4th Gen) *',
      'iPad Pro 12.9-inch (5th Gen) *',
      'iPad Pro 12.9-inch (6th Gen) *',
      'iPad (7th Gen) *',
      'iPad (8th Gen) *',
      'iPad (9th Gen) *',
      'iPad (10th Gen) *',
      'iPad Mini (5th Gen) *',
      'iPad Mini (6th Gen) *',
    ],
    note: '* Не поддерживают eSIM: iPhone из материкового Китая, iPhone из Гонконга и Макао (за исключением iPhone 13 mini, iPhone 12 mini, iPhone SE 2020 и iPhone XS). iPad поддерживается только в модификации Wi-Fi + Сотовая связь.'
  },
  samsung: {
    category: 'Samsung',
    icon: '📱',
    devices: [
      'Samsung Galaxy S24 *',
      'Samsung Galaxy S24+ *',
      'Samsung Galaxy S24 Ultra *',
      'Samsung Galaxy S23 *',
      'Samsung Galaxy S23+ *',
      'Samsung Galaxy S23 Ultra *',
      'Samsung Galaxy S22 *',
      'Samsung Galaxy S22+ *',
      'Samsung Galaxy S22 Ultra *',
      'Samsung Galaxy S21 *',
      'Samsung Galaxy S21+ *',
      'Samsung Galaxy S21 Ultra *',
      'Samsung Galaxy S20 *',
      'Samsung Galaxy S20+ *',
      'Samsung Galaxy S20 Ultra *',
      'Samsung Galaxy Z Fold 5 *',
      'Samsung Galaxy Z Fold 4 *',
      'Samsung Galaxy Z Fold 3 *',
      'Samsung Galaxy Z Fold 2 *',
      'Samsung Galaxy Z Flip 5 *',
      'Samsung Galaxy Z Flip 4 *',
      'Samsung Galaxy Z Flip 3 *',
      'Samsung Galaxy Z Flip *',
      'Samsung Galaxy Note 20 *',
      'Samsung Galaxy Note 20 Ultra *',
      'Samsung Galaxy A54 5G *',
      'Samsung Galaxy A34 5G *',
    ],
    note: '* Устройства Samsung из США могут не поддерживать eSIM. Проверьте EID на вашем устройстве.'
  },
  google: {
    category: 'Google Pixel',
    icon: '🔷',
    devices: [
      'Google Pixel 8 *',
      'Google Pixel 8 Pro *',
      'Google Pixel 7 *',
      'Google Pixel 7 Pro *',
      'Google Pixel 7a *',
      'Google Pixel 6 *',
      'Google Pixel 6 Pro *',
      'Google Pixel 6a *',
      'Google Pixel 5 *',
      'Google Pixel 5a *',
      'Google Pixel 4 *',
      'Google Pixel 4 XL *',
      'Google Pixel 4a *',
      'Google Pixel 3 *',
      'Google Pixel 3 XL *',
      'Google Pixel 3a *',
      'Google Pixel 3a XL *',
    ],
    note: '* Pixel из Австралии, Тайваня и Японии не поддерживают eSIM. Pixel 3 из операторов Verizon, US Cellular, Telstra также не поддерживают eSIM.'
  },
  other: {
    category: 'Другие устройства',
    icon: '📲',
    devices: [
      'Huawei P40 *',
      'Huawei P40 Pro *',
      'Huawei Mate 40 Pro *',
      'Xiaomi 13 *',
      'Xiaomi 13 Pro *',
      'Xiaomi 12T Pro *',
      'OPPO Find X5 *',
      'OPPO Find X5 Pro *',
      'OPPO Find X3 Pro *',
      'OnePlus 12 *',
      'OnePlus 11 *',
      'Motorola Razr (2022) *',
      'Motorola Razr+ *',
      'Motorola Edge+ *',
      'Sony Xperia 1 IV *',
      'Sony Xperia 5 IV *',
    ],
    note: '* Поддержка eSIM может зависеть от региона и оператора. Рекомендуем проверить EID на устройстве.'
  }
}

export default function DevicesPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory>('apple')
  const [showDropdown, setShowDropdown] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText('*#06#')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentData = deviceData[selectedCategory]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900 dark:text-white">Поддержка eSIM</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        
        {/* Check eSIM Support Card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-start gap-3 mb-4">
            <Info size={24} />
            <div>
              <h2 className="font-bold text-lg mb-1">Как проверить поддержку eSIM?</h2>
              <p className="text-sm text-white/80">
                Наберите на телефоне код и посмотрите, есть ли строка EID
              </p>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur rounded-xl p-4 flex items-center justify-between">
            <code className="text-2xl font-mono font-bold">*#06#</code>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
          
          <p className="text-xs text-white/70 mt-3">
            Если в результате есть строка EID — ваше устройство поддерживает eSIM
          </p>
        </div>

        {/* Device Categories */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Какие устройства поддерживают eSIM
          </h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {(Object.keys(deviceData) as DeviceCategory[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                  selectedCategory === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{deviceData[key].icon}</span>
                <span className="font-medium">{deviceData[key].category}</span>
              </button>
            ))}
          </div>

          {/* Device List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="max-h-[400px] overflow-y-auto">
              {currentData.devices.map((device, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index !== currentData.devices.length - 1 
                      ? 'border-b border-gray-100 dark:border-gray-700' 
                      : ''
                  }`}
                >
                  <Check className="text-green-500 shrink-0" size={18} />
                  <span className="text-gray-900 dark:text-white text-sm">{device}</span>
                </div>
              ))}
            </div>
            
            {/* Note */}
            {currentData.note && (
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ {currentData.note}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Additional Info */}
        <div className="mt-6 bg-gray-100 dark:bg-gray-800 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Не нашли своё устройство?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Наберите <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-sm">*#06#</code> на 
            вашем телефоне. Если в результате отображается EID — ваше устройство поддерживает eSIM.
          </p>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
