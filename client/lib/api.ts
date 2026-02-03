import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Типы
export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  bonusBalance: number;
  referralCode: string;
  loyaltyLevel?: LoyaltyLevel;
  totalSpent: number;
}

export interface LoyaltyLevel {
  id: string;
  name: string;
  minSpent: number;
  cashbackPercent: number;
  discount: number;
}

export interface Product {
  id: string;
  country: string;
  region?: string;
  name: string;
  description?: string;
  dataAmount: string;
  validityDays: number;  // Для Daily Unlimited = срок действия (180 дней)
  duration?: number;     // Для Daily Unlimited = 1 (в день)
  speed?: string;        // Ограничение скорости после лимита (384 Kbps, 1 Mbps)
  providerPrice: number;
  ourPrice: number;
  providerId: string;
  providerName: string;
  isActive: boolean;
  isUnlimited: boolean;
  stock: number;
  // Бейджи (скидки, ХИТ, etc.)
  badge?: string;
  badgeColor?: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  quantity: number;
  productPrice: number;
  discount: number;
  bonusUsed: number;
  totalAmount: number;
  qrCode?: string;
  iccid?: string;
  activationCode?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ReferralStats {
  referralCount: number;
  totalEarned: number;
  referrals: Array<{
    id: string;
    firstName?: string;
    createdAt: string;
    totalSpent: number;
  }>;
}

// API методы
export const userApi = {
  // Получить текущего пользователя
  async getMe(telegramId: string): Promise<User> {
    const { data } = await api.post('/users/find-or-create', { telegramId });
    return data;
  },

  // Получить профиль
  async getProfile(userId: string): Promise<User> {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  },
};

export const productsApi = {
  // Получить все продукты
  async getAll(filters?: { country?: string; isActive?: boolean }): Promise<Product[]> {
    const { data } = await api.get('/products', { params: filters });
    return data;
  },

  // Получить продукт по ID
  async getById(id: string): Promise<Product> {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },

  // Получить список стран
  async getCountries(): Promise<string[]> {
    const { data } = await api.get('/products/countries');
    return data;
  },
};

export const ordersApi = {
  // Создать заказ
  async create(orderData: {
    userId: string;
    productId: string;
    quantity: number;
    bonusToUse?: number;
  }): Promise<Order> {
    const { data } = await api.post('/orders', orderData);
    return data;
  },

  // Получить заказы пользователя
  async getMy(userId: string): Promise<Order[]> {
    const { data } = await api.get(`/orders/user/${userId}`);
    return data;
  },

  // Получить заказ по ID
  async getById(orderId: string): Promise<Order> {
    const { data } = await api.get(`/orders/${orderId}`);
    return data;
  },
};

export const referralsApi = {
  // Получить реферальную статистику
  async getStats(userId: string): Promise<ReferralStats> {
    const { data } = await api.get(`/referrals/${userId}/stats`);
    return data;
  },

  // Получить рефералов
  async getReferrals(userId: string): Promise<ReferralStats['referrals']> {
    const { data } = await api.get(`/referrals/${userId}`);
    return data;
  },
};

export const paymentsApi = {
  // Создать платеж через Robokassa
  async createPayment(orderId: string): Promise<{
    transaction: any;
    payment: {
      paymentId: string;
      paymentUrl: string;
      amount: number;
      currency: string;
    };
  }> {
    const { data } = await api.post(`/payments/create`, { orderId });
    return data;
  },
};
