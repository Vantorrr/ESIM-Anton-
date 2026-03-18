'use client'

import { useEffect, useState } from 'react'
import { promoCodesApi } from '@/lib/api'
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react'

interface PromoCode {
  id: string
  code: string
  discountPercent: number
  maxUses: number | null
  usedCount: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

export default function PromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState(10)
  const [newMaxUses, setNewMaxUses] = useState('')
  const [newExpires, setNewExpires] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const { data } = await promoCodesApi.getAll()
      setCodes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newCode.trim()) return
    setCreating(true)
    try {
      await promoCodesApi.create({
        code: newCode.trim(),
        discountPercent: newDiscount,
        maxUses: newMaxUses ? parseInt(newMaxUses) : undefined,
        expiresAt: newExpires || undefined,
      })
      setNewCode('')
      setNewDiscount(10)
      setNewMaxUses('')
      setNewExpires('')
      setShowForm(false)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Ошибка создания')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await promoCodesApi.toggle(id, !current)
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !current } : c)),
      )
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить промокод?')) return
    try {
      await promoCodesApi.delete(id)
      setCodes((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (loading) {
    return (
      <div className="glass-card p-8 text-center text-slate-600">
        Загрузка…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Промокоды</h2>
          <p className="text-sm text-slate-500 mt-1">
            Всего: {codes.length} · Активных:{' '}
            {codes.filter((c) => c.isActive).length}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium text-sm hover:opacity-95"
        >
          <Plus size={18} />
          Создать
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">Новый промокод</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Код
              </label>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="TEST100"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Скидка, %
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newDiscount}
                onChange={(e) => setNewDiscount(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Макс. использований
              </label>
              <input
                type="number"
                min={1}
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="∞ (пусто)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Действует до
              </label>
              <input
                type="date"
                value={newExpires}
                onChange={(e) => setNewExpires(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newCode.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium text-sm disabled:opacity-50"
            >
              {creating ? 'Создание…' : 'Создать'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
          {/* Quick presets */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-slate-400 self-center">Быстро:</span>
            {[
              { label: '100% на 1 раз', d: 100, m: 1 },
              { label: '50% на 5 раз', d: 50, m: 5 },
              { label: '20% безлимит', d: 20, m: undefined },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setNewDiscount(p.d)
                  setNewMaxUses(p.m?.toString() ?? '')
                }}
                className="px-3 py-1 rounded-lg bg-slate-100 text-xs text-slate-600 hover:bg-slate-200"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {codes.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-500">
          Нет промокодов. Нажмите «Создать» чтобы добавить.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">
                    Код
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">
                    Скидка
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">
                    Использовано
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">
                    Годен до
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">
                    Статус
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {c.code}
                        </span>
                        <button
                          onClick={() => handleCopy(c.code, c.id)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Скопировать"
                        >
                          {copiedId === c.id ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        {c.discountPercent}%
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {c.usedCount}
                      {c.maxUses !== null ? ` / ${c.maxUses}` : ' / ∞'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.isActive ? 'Активен' : 'Выключен'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(c.id, c.isActive)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          title={c.isActive ? 'Выключить' : 'Включить'}
                        >
                          {c.isActive ? (
                            <ToggleRight size={20} className="text-green-600" />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
