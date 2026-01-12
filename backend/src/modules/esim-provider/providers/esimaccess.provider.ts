import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Интерфейсы для eSIM Access API
 * Документация: https://docs.esimaccess.com/
 */

export interface EsimAccessPackage {
  packageCode: string;
  title: string;
  destination: string;
  data: string;
  validity: number;
  price: number;
  currency: string;
  type: string;
}

export interface EsimAccessPurchaseResponse {
  success: boolean;
  iccid: string;
  qrCodeUrl: string;
  smdpAddress: string;
  activationCode: string;
  orderReference: string;
}

export interface EsimAccessBalance {
  balance: number;
  currency: string;
}

/**
 * Провайдер для работы с eSIM Access API
 */
@Injectable()
export class EsimAccessProvider {
  private readonly logger = new Logger(EsimAccessProvider.name);
  private readonly client: AxiosInstance;
  private readonly accessCode: string;
  private readonly secretKey: string;

  constructor(accessCode: string, secretKey: string) {
    this.accessCode = accessCode;
    this.secretKey = secretKey;

    this.client = axios.create({
      baseURL: 'https://api.esimaccess.com/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'AccessCode': this.accessCode,
        'SecretKey': this.secretKey,
      },
    });

    this.logger.log('✅ eSIM Access provider инициализирован');
  }

  /**
   * Получить баланс аккаунта
   */
  async getBalance(): Promise<EsimAccessBalance> {
    try {
      this.logger.log('💰 Запрос баланса...');
      
      const response = await this.client.get('/balance');
      
      this.logger.log(`✅ Баланс: ${response.data.balance} ${response.data.currency}`);
      
      return {
        balance: response.data.balance,
        currency: response.data.currency,
      };
    } catch (error) {
      this.logger.error('❌ Ошибка получения баланса:', error.message);
      throw error;
    }
  }

  /**
   * Получить список доступных пакетов
   */
  async getPackages(destination?: string): Promise<EsimAccessPackage[]> {
    try {
      this.logger.log('📦 Запрос списка пакетов...');
      
      const response = await this.client.get('/packages', {
        params: destination ? { destination } : {},
      });

      const packages = response.data.packages || [];
      
      this.logger.log(`✅ Получено ${packages.length} пакетов`);
      
      return packages.map((pkg: any) => ({
        packageCode: pkg.packageCode,
        title: pkg.title,
        destination: pkg.destination,
        data: pkg.data,
        validity: pkg.validity,
        price: pkg.price,
        currency: pkg.currency,
        type: pkg.type,
      }));
    } catch (error) {
      this.logger.error('❌ Ошибка получения пакетов:', error.message);
      throw error;
    }
  }

  /**
   * Купить eSIM
   */
  async purchaseEsim(packageCode: string, quantity = 1): Promise<EsimAccessPurchaseResponse> {
    try {
      this.logger.log(`💳 Покупка eSIM (package: ${packageCode}, quantity: ${quantity})...`);

      const response = await this.client.post('/orders', {
        packageCode,
        quantity,
      });

      if (response.data && response.data.success) {
        this.logger.log(`✅ eSIM куплен успешно (order: ${response.data.orderReference})`);
        
        return {
          success: true,
          iccid: response.data.iccid,
          qrCodeUrl: response.data.qrCodeUrl,
          smdpAddress: response.data.smdpAddress,
          activationCode: response.data.activationCode,
          orderReference: response.data.orderReference,
        };
      }

      throw new Error('Некорректный ответ от API');
    } catch (error) {
      this.logger.error('❌ Ошибка покупки eSIM:', error.message);
      throw error;
    }
  }

  /**
   * Получить информацию о заказе
   */
  async getOrderInfo(orderReference: string): Promise<any> {
    try {
      this.logger.log(`🔍 Запрос информации о заказе ${orderReference}...`);

      const response = await this.client.get(`/orders/${orderReference}`);

      this.logger.log(`✅ Информация о заказе получена`);
      
      return response.data;
    } catch (error) {
      this.logger.error('❌ Ошибка получения информации о заказе:', error.message);
      throw error;
    }
  }

  /**
   * Получить историю заказов
   */
  async getOrderHistory(limit = 100): Promise<any[]> {
    try {
      this.logger.log(`📜 Запрос истории заказов (limit: ${limit})...`);

      const response = await this.client.get('/orders', {
        params: { limit },
      });

      const orders = response.data.orders || [];
      
      this.logger.log(`✅ Получено ${orders.length} заказов`);
      
      return orders;
    } catch (error) {
      this.logger.error('❌ Ошибка получения истории заказов:', error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch (error) {
      return false;
    }
  }
}
