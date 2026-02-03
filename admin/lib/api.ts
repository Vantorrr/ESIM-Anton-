import axios from 'axios'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: `${apiUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor для добавления токена авторизации
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// API методы
export const dashboardApi = {
  getStats: () => api.get('/analytics/dashboard'),
}

export const usersApi = {
  getAll: (page = 1, limit = 20) => api.get(`/users?page=${page}&limit=${limit}`),
  getById: (id: string) => api.get(`/users/${id}`),
  getStats: (id: string) => api.get(`/users/${id}/stats`),
}

export const ordersApi = {
  getAll: (params?: any) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  getByUser: (userId: string) => api.get(`/orders/user/${userId}`),
}

export const productsApi = {
  getAll: (country?: string) => api.get('/products', { params: { country } }),
  getCountries: () => api.get('/products/countries'),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  sync: () => api.post('/products/sync'),
  // Массовые операции
  bulkToggleActive: (ids: string[], isActive: boolean) => 
    api.post('/products/bulk/toggle-active', { ids, isActive }),
  bulkToggleByType: (tariffType: 'standard' | 'unlimited', isActive: boolean) =>
    api.post('/products/bulk/toggle-by-type', { tariffType, isActive }),
  bulkSetBadge: (ids: string[], badge: string | null, badgeColor: string | null) => 
    api.post('/products/bulk/set-badge', { ids, badge, badgeColor }),
  bulkSetMarkup: (ids: string[], markupPercent: number) => 
    api.post('/products/bulk/set-markup', { ids, markupPercent }),
}

export const paymentsApi = {
  getAll: (params?: any) => api.get('/payments', { params }),
  getByUser: (userId: string) => api.get(`/payments/user/${userId}`),
}

export const analyticsApi = {
  getDashboard: (params?: any) => api.get('/analytics/dashboard', { params }),
  getTopProducts: (params?: any) => api.get('/analytics/top-products', { params }),
  getSalesChart: (params: any) => api.get('/analytics/sales-chart', { params }),
}

export const referralsApi = {
  getStats: (userId: string) => api.get(`/referrals/stats/${userId}`),
  getTop: () => api.get('/referrals/top'),
}

export const loyaltyApi = {
  getLevels: () => api.get('/loyalty/levels'),
  createLevel: (data: any) => api.post('/loyalty/levels', data),
  updateLevel: (id: string, data: any) => api.put(`/loyalty/levels/${id}`, data),
  deleteLevel: (id: string) => api.delete(`/loyalty/levels/${id}`),
}

export const systemSettingsApi = {
  getAll: () => api.get('/system-settings'),
  getReferralSettings: () => api.get('/system-settings/referral'),
  updateReferralSettings: (data: any) => api.post('/system-settings/referral', data),
  // Настройки ценообразования
  getPricingSettings: () => api.get('/system-settings/pricing'),
  updatePricingSettings: (data: { exchangeRate: number; defaultMarkupPercent: number }) => 
    api.post('/system-settings/pricing', data),
  // Автоматический курс ЦБ РФ
  getExchangeRateInfo: () => api.get('/system-settings/exchange-rate'),
  updateExchangeRateFromCBR: () => api.post('/system-settings/exchange-rate/update'),
}
