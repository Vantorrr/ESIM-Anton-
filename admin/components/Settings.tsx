'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Edit2, Trash2, DollarSign, RefreshCw } from 'lucide-react'
import { systemSettingsApi, loyaltyApi, productsApi } from '@/lib/api'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'referrals' | 'loyalty'>('pricing')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [repricing, setRepricing] = useState(false)
  const [updatingRate, setUpdatingRate] = useState(false)
  const [autoUpdateRate, setAutoUpdateRate] = useState(false)

  // Настройки ценообразования
  const [pricingSettings, setPricingSettings] = useState({
    exchangeRate: 95,
    defaultMarkupPercent: 30,
  })
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null)

  // Реферальная программа
  const [referralSettings, setReferralSettings] = useState({
    bonusPercent: 5,
    minPayout: 500,
    enabled: true,
  })

  // Уровни лояльности
  const [loyaltyLevels, setLoyaltyLevels] = useState<any[]>([])
  const [editingLevel, setEditingLevel] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      
      if (activeTab === 'pricing') {
        const [pricingResponse, rateInfoResponse] = await Promise.all([
          systemSettingsApi.getPricingSettings(),
          systemSettingsApi.getExchangeRateInfo(),
        ])
        if (pricingResponse.data) {
          setPricingSettings(pricingResponse.data)
        }
        if (rateInfoResponse.data?.updatedAt) {
          setRateUpdatedAt(rateInfoResponse.data.updatedAt)
        }
        setAutoUpdateRate(Boolean(rateInfoResponse.data?.autoUpdate))
      } else if (activeTab === 'referrals') {
        const response = await systemSettingsApi.getReferralSettings()
        if (response.data) {
          setReferralSettings(response.data)
        }
      } else {
        const response = await loyaltyApi.getLevels()
        if (response.data) {
          setLoyaltyLevels(response.data)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePricingSettings = async () => {
    try {
      await systemSettingsApi.updatePricingSettings(pricingSettings)
      alert('✅ Настройки ценообразования сохранены!')
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('❌ Ошибка сохранения настроек')
    }
  }

  const handleSyncProducts = async () => {
    try {
      setSyncing(true)
      const response = await productsApi.sync()
      alert(`✅ ${response.data.message}`)
    } catch (error: any) {
      console.error('Ошибка синхронизации:', error)
      alert('❌ Ошибка синхронизации: ' + (error.response?.data?.message || error.message))
    } finally {
      setSyncing(false)
    }
  }

  const handleRepriceProducts = async () => {
    try {
      setRepricing(true)
      const response = await productsApi.repriceAll()
      alert(`✅ ${response.data.message}`)
    } catch (error: any) {
      console.error('Ошибка пересчета цен:', error)
      alert('❌ Ошибка пересчета: ' + (error.response?.data?.message || error.message))
    } finally {
      setRepricing(false)
    }
  }

  const handleUpdateRateFromCBR = async () => {
    try {
      setUpdatingRate(true)
      const response = await systemSettingsApi.updateExchangeRateFromCBR()
      if (response.data.success) {
        setPricingSettings(prev => ({ ...prev, exchangeRate: response.data.rate }))
        setRateUpdatedAt(new Date().toISOString())
        alert(`✅ Курс обновлен: ${response.data.rate}₽ за $1 (ЦБ РФ)`)
      } else {
        alert('❌ Не удалось получить курс с ЦБ РФ')
      }
    } catch (error: any) {
      console.error('Ошибка обновления курса:', error)
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message))
    } finally {
      setUpdatingRate(false)
    }
  }

  const handleToggleAutoUpdateRate = async (enabled: boolean) => {
    try {
      setAutoUpdateRate(enabled)
      const response = await systemSettingsApi.setExchangeRateAutoUpdate(enabled)
      alert(`✅ ${response.data.message}`)
    } catch (error: any) {
      console.error('Ошибка переключения автообновления курса:', error)
      setAutoUpdateRate(!enabled)
      alert('❌ Ошибка: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleSaveReferralSettings = async () => {
    try {
      await systemSettingsApi.updateReferralSettings(referralSettings)
      alert('✅ Настройки реферальной программы сохранены!')
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('❌ Ошибка сохранения настроек')
    }
  }

  const handleSaveLoyaltyLevel = async () => {
    try {
      if (editingLevel.id) {
        // Обновление
        await loyaltyApi.updateLevel(editingLevel.id, editingLevel)
        alert('✅ Уровень лояльности обновлен!')
      } else {
        // Создание
        await loyaltyApi.createLevel(editingLevel)
        alert('✅ Уровень лояльности создан!')
      }
      
      setEditingLevel(null)
      loadData()
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('❌ Ошибка сохранения уровня')
    }
  }

  const handleDeleteLevel = async (id: string) => {
    if (!confirm('Удалить этот уровень?')) return
    
    try {
      await loyaltyApi.deleteLevel(id)
      alert('✅ Уровень удален!')
      loadData()
    } catch (error) {
      console.error('Ошибка удаления:', error)
      alert('❌ Ошибка удаления уровня')
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="glass-card p-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium
              transition-all duration-200
              ${
                activeTab === 'pricing'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'hover:bg-white/50 text-slate-700'
              }
            `}
          >
            💰 Ценообразование
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium
              transition-all duration-200
              ${
                activeTab === 'referrals'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'hover:bg-white/50 text-slate-700'
              }
            `}
          >
            🎁 Реферальная программа
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-medium
              transition-all duration-200
              ${
                activeTab === 'loyalty'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'hover:bg-white/50 text-slate-700'
              }
            `}
          >
            🏆 Система лояльности
          </button>
        </div>
      </div>

      {/* Ценообразование */}
      {activeTab === 'pricing' && (
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-6">Настройки ценообразования</h2>
          
          <div className="space-y-6 max-w-2xl">
            {/* Курс доллара */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Курс USD/RUB
              </label>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="number"
                    value={pricingSettings.exchangeRate}
                    onChange={(e) => setPricingSettings({ ...pricingSettings, exchangeRate: +e.target.value })}
                    className="w-40 pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-xl font-bold"
                    min="1"
                    max="500"
                    step="0.5"
                  />
                </div>
                <span className="text-lg font-bold text-slate-700">₽ за $1</span>
                <button
                  onClick={handleUpdateRateFromCBR}
                  disabled={updatingRate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${updatingRate ? 'animate-spin' : ''}`} />
                  {updatingRate ? 'Загрузка...' : 'Обновить с ЦБ РФ'}
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Используется для пересчета цен от поставщика (в $) в рубли
              </p>
              {rateUpdatedAt && (
                <p className="text-xs text-green-600 mt-1">
                  ✅ Последнее обновление: {new Date(rateUpdatedAt).toLocaleString('ru-RU')}
                </p>
              )}
              <label className="flex items-center gap-3 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoUpdateRate}
                  onChange={(e) => handleToggleAutoUpdateRate(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-medium text-slate-700">
                  Автоматически обновлять курс раз в сутки в 9:00
                </span>
              </label>
            </div>

            {/* Наценка по умолчанию */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Наценка по умолчанию при синхронизации
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={pricingSettings.defaultMarkupPercent}
                  onChange={(e) => setPricingSettings({ ...pricingSettings, defaultMarkupPercent: +e.target.value })}
                  className="w-32 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-xl font-bold text-center"
                  min="0"
                  max="500"
                  step="5"
                />
                <span className="text-lg font-bold text-slate-700">%</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {[10, 20, 30, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => setPricingSettings({ ...pricingSettings, defaultMarkupPercent: val })}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      pricingSettings.defaultMarkupPercent === val 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    +{val}%
                  </button>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Применяется для новых тарифов и при полном пересчете цен
              </p>
            </div>

            {/* Пример расчета */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-700 mb-2">📊 Пример расчета цены:</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p>Цена у поставщика: <strong>$5.00</strong></p>
                <p>+ Наценка {pricingSettings.defaultMarkupPercent}%: <strong>${(5 * (1 + pricingSettings.defaultMarkupPercent / 100)).toFixed(2)}</strong></p>
                <p>× Курс {pricingSettings.exchangeRate}₽/$: <strong className="text-green-600">₽{Math.round(5 * (1 + pricingSettings.defaultMarkupPercent / 100) * pricingSettings.exchangeRate)}</strong></p>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-4 flex-wrap">
              <button
                onClick={handleSavePricingSettings}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <Save className="w-5 h-5" />
                Сохранить настройки
              </button>
              <button
                onClick={handleRepriceProducts}
                disabled={repricing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${repricing ? 'animate-spin' : ''}`} />
                {repricing ? 'Пересчет...' : 'Применить к текущим товарам'}
              </button>
              <button
                onClick={handleSyncProducts}
                disabled={syncing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Синхронизация...' : 'Синхронизировать тарифы'}
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Важно:</strong> После изменения курса или наценки нажмите "Применить к текущим товарам", чтобы пересчитать уже существующие цены. Кнопка синхронизации только подтягивает пакеты от провайдера.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Реферальная программа */}
      {activeTab === 'referrals' && (
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-6">Настройки реферальной программы</h2>
          
          <div className="space-y-6 max-w-2xl">
            {/* Включить/выключить */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={referralSettings.enabled}
                  onChange={(e) => setReferralSettings({ ...referralSettings, enabled: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="font-medium text-lg">Включить реферальную программу</span>
              </label>
            </div>

            {/* Процент бонуса */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Процент бонуса рефереру (от покупки реферала)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={referralSettings.bonusPercent}
                  onChange={(e) => setReferralSettings({ ...referralSettings, bonusPercent: +e.target.value })}
                  className="w-32 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  min="0"
                  max="100"
                  disabled={!referralSettings.enabled}
                />
                <span className="text-lg font-bold text-slate-700">%</span>
                <div className="text-sm text-slate-500">
                  Пример: реферал купил eSIM за ₽1,000 → реферер получит ₽{(1000 * referralSettings.bonusPercent / 100).toFixed(0)}
                </div>
              </div>
            </div>

            {/* Минимальная сумма вывода */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Минимальная сумма для использования бонусов
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={referralSettings.minPayout}
                  onChange={(e) => setReferralSettings({ ...referralSettings, minPayout: +e.target.value })}
                  className="w-32 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  min="0"
                  step="100"
                  disabled={!referralSettings.enabled}
                />
                <span className="text-lg font-bold text-slate-700">₽</span>
                <div className="text-sm text-slate-500">
                  Пользователь сможет использовать бонусы после накопления этой суммы
                </div>
              </div>
            </div>

            {/* Кнопка сохранить */}
            <div className="pt-4">
              <button
                onClick={handleSaveReferralSettings}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <Save className="w-5 h-5" />
                Сохранить настройки
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Система лояльности */}
      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          {/* Кнопка добавить */}
          <div className="glass-card p-6">
            <button
              onClick={() => setEditingLevel({ name: '', minSpent: 0, cashbackPercent: 0, discount: 0 })}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              Добавить уровень
            </button>
          </div>

          {/* Таблица уровней */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold mb-6">Уровни лояльности</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Название</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Минимальная сумма</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Кэшбэк (%)</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Скидка (%)</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {loyaltyLevels.map((level) => (
                    <tr
                      key={level.id}
                      className="border-b border-slate-100 hover:bg-white/50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium">{level.name}</td>
                      <td className="py-4 px-4">₽{Number(level.minSpent).toLocaleString()}</td>
                      <td className="py-4 px-4">{Number(level.cashbackPercent)}%</td>
                      <td className="py-4 px-4">{Number(level.discount)}%</td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingLevel(level)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteLevel(level.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Форма редактирования */}
          {editingLevel && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="glass-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold mb-6">
                  {editingLevel.id ? 'Редактировать уровень' : 'Создать уровень'}
                </h3>

                <div className="space-y-4">
                  {/* Название */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Название уровня
                    </label>
                    <input
                      type="text"
                      value={editingLevel.name}
                      onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                      placeholder="Например: Золото"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>

                  {/* Минимальная сумма */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Минимальная сумма покупок (₽)
                    </label>
                    <input
                      type="number"
                      value={editingLevel.minSpent}
                      onChange={(e) => setEditingLevel({ ...editingLevel, minSpent: +e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      min="0"
                      step="1000"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Пользователь получит этот уровень после покупок на эту сумму
                    </p>
                  </div>

                  {/* Кэшбэк */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Процент кэшбэка (%)
                    </label>
                    <input
                      type="number"
                      value={editingLevel.cashbackPercent}
                      onChange={(e) => setEditingLevel({ ...editingLevel, cashbackPercent: +e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      min="0"
                      max="100"
                      step="0.5"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Например: 5% → при покупке на ₽1,000 вернется ₽50 бонусов
                    </p>
                  </div>

                  {/* Скидка */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Скидка на покупки (%)
                    </label>
                    <input
                      type="number"
                      value={editingLevel.discount}
                      onChange={(e) => setEditingLevel({ ...editingLevel, discount: +e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      min="0"
                      max="100"
                      step="1"
                    />
                    <p className="text-sm text-slate-500 mt-1">
                      Например: 10% → товар за ₽1,000 будет стоить ₽900
                    </p>
                  </div>

                  {/* Кнопки */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveLoyaltyLevel}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                    >
                      <Save className="w-5 h-5" />
                      Сохранить
                    </button>
                    <button
                      onClick={() => setEditingLevel(null)}
                      className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-all"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
