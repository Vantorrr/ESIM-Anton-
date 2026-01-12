import axios from 'axios';
import { config } from './config';

const client = axios.create({
  baseURL: `${config.apiUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  users: {
    findOrCreate: async (telegramId: bigint, data: any) => {
      const response = await client.post('/users/find-or-create', {
        telegramId: telegramId.toString(),
        ...data,
      });
      return response.data;
    },
    getStats: async (userId: string) => {
      const response = await client.get(`/users/${userId}/stats`);
      return response.data;
    },
  },

  products: {
    getAll: async () => {
      const response = await client.get('/products');
      return response.data;
    },
    getCountries: async () => {
      const response = await client.get('/products/countries');
      return response.data;
    },
    getByCountry: async (country: string) => {
      const response = await client.get(`/products?country=${country}`);
      return response.data;
    },
  },

  orders: {
    create: async (userId: string, productId: string, useBonuses = 0) => {
      const response = await client.post('/orders', {
        userId,
        productId,
        quantity: 1,
        useBonuses,
      });
      return response.data;
    },
    getByUser: async (userId: string) => {
      const response = await client.get(`/orders/user/${userId}`);
      return response.data;
    },
  },

  payments: {
    create: async (orderId: string) => {
      const response = await client.post('/payments/create', { orderId });
      return response.data;
    },
  },

  referrals: {
    getStats: async (userId: string) => {
      const response = await client.get(`/referrals/stats/${userId}`);
      return response.data;
    },
  },
};
