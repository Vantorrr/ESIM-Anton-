'use client'

import { useEffect, useState } from 'react'
import { promoCodesApi } from '@/lib/api'
import { isUnauthorizedError } from '@/lib/auth'
import { getErrorMessage } from '@/lib/errors'
import type { PromoCode } from '@/lib/types'
import Button from '@/components/ui/Button'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table'
import { useToast } from '@/components/ui/ToastProvider'
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react'

export default function PromoCodes() {
  const toast = useToast()
  const confirmDialog = useConfirmDialog()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [newCode, setNewCode] = useState('')
  const [newDiscount, setNewDiscount] = useState(10)
  const [newMaxUses, setNewMaxUses] = useState('')
  const [newExpires, setNewExpires] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setError(null)
      const { data } = await promoCodesApi.getAll()
      setCodes(data)
    } catch (e) {
      if (isUnauthorizedError(e)) return
      console.error(e)
      setError('Не удалось загрузить промокоды')
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
      toast.success('Промокод создан')
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Ошибка создания'))
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
      toast.success(!current ? 'Промокод активирован' : 'Промокод отключен')
    } catch (e) {
      console.error(e)
      toast.error('Не удалось изменить статус промокода')
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Удаление промокода',
      description: 'Удалить промокод?',
      confirmLabel: 'Удалить',
      variant: 'destructive',
    })
    if (!confirmed) return

    try {
      await promoCodesApi.delete(id)
      setCodes((prev) => prev.filter((c) => c.id !== id))
      toast.success('Промокод удален')
    } catch (e) {
      console.error(e)
      toast.error('Не удалось удалить промокод')
    }
  }

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    toast.info(`Код ${code} скопирован`)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (loading) {
    return (
      <div className="glass-card p-8 text-center text-slate-600">
        <Spinner centered />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card glass-card--static p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Не удалось загрузить промокоды</h2>
        <p className="mt-2 text-slate-600">{error}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={load}>Повторить</Button>
        </div>
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
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={18} />
          Создать
        </Button>
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
            <Button onClick={handleCreate} disabled={creating || !newCode.trim()}>
              {creating ? 'Создание…' : 'Создать'}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary">
              Отмена
            </Button>
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
        <div className="glass-card glass-card--static overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow className="bg-slate-50/50">
                  <TableHeaderCell className="px-6">Код</TableHeaderCell>
                  <TableHeaderCell className="px-6">Скидка</TableHeaderCell>
                  <TableHeaderCell className="px-6">Использовано</TableHeaderCell>
                  <TableHeaderCell className="px-6">Годен до</TableHeaderCell>
                  <TableHeaderCell className="px-6">Статус</TableHeaderCell>
                  <TableHeaderCell className="px-6 text-right">Действия</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y divide-slate-100">
                {codes.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50">
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {c.code}
                        </span>
                        <Button
                          onClick={() => handleCopy(c.code, c.id)}
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label="Скопировать промокод"
                          className="text-slate-400 hover:bg-transparent hover:text-slate-600"
                        >
                          {copiedId === c.id ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        {c.discountPercent}%
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-slate-600">
                      {c.usedCount}
                      {c.maxUses !== null ? ` / ${c.maxUses}` : ' / ∞'}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-slate-600">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString('ru-RU')
                        : '—'}
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.isActive ? 'Активен' : 'Выключен'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleToggle(c.id, c.isActive)}
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label={c.isActive ? 'Выключить промокод' : 'Включить промокод'}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          {c.isActive ? (
                            <ToggleRight size={20} className="text-green-600" />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDelete(c.id)}
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label="Удалить промокод"
                          className="text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
