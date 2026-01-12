'use client'

import { useEffect, useState } from 'react'
import { usersApi } from '@/lib/api'
import { Users as UsersIcon } from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadUsers()
  }, [page])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await usersApi.getAll(page, 20)
      
      if (response.data) {
        setUsers(response.data.data || [])
        setTotalPages(response.data.meta?.totalPages || 1)
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error)
    } finally {
      setLoading(false)
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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Пользователи</h2>
        <button
          onClick={loadUsers}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Обновить
        </button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <UsersIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Пока нет пользователей</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Имя</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Telegram</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Баланс</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Потрачено</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Уровень</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Дата</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 hover:bg-white/50 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono text-sm">
                      #{user.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-4 font-medium">
                      {user.firstName || user.username || 'Без имени'}
                      {user.lastName && ` ${user.lastName}`}
                    </td>
                    <td className="py-4 px-4 text-blue-600">
                      {user.username ? `@${user.username}` : user.telegramId}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <div>₽{Number(user.balance || 0).toLocaleString()}</div>
                        <div className="text-green-600">
                          +₽{Number(user.bonusBalance || 0).toLocaleString()} бонусов
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold">
                      ₽{Number(user.totalSpent || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                        {user.loyaltyLevel?.name || 'Новичок'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-white/50 hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Назад
              </button>
              <span className="px-4 py-2 text-sm text-slate-600">
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-white/50 hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Вперед
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
