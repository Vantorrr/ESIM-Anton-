import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

/**
 * Интерфейсы для eSIM Access API
 * Документация: https://docs.esimaccess.com/
 */

export interface EsimAccessPackage {
  packageCode: string;
  name: string;
  slug: string;
  location: string;
  locationCode: string;
  price: number;
  currencyCode: string;
  volume: number;
  smsVolume: number;
  duration: number;
  durationUnit: string;
  speed: string;
  supportTopup: boolean;
  dataType?: number; // 1 = standard, 2 = unlimited/day pass
}

export interface EsimAccessPurchaseResponse {
  success: boolean;
  orderNo: string;
  esimList: {
    iccid: string;
    lpaCode: string;
    smdpAddress: string;
    matchingCode: string;
    qrCodeUrl: string;
  }[];
}

export interface EsimAccessBalance {
  balance: number;
  currency: string;
}

/**
 * Провайдер для работы с eSIM Access API
 * Документация: https://docs.esimaccess.com/
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
      baseURL: 'https://api.esimaccess.com/api/v1/open',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'RT-AccessCode': this.accessCode,
      },
    });

    this.logger.log('✅ eSIM Access provider инициализирован');
  }

  /**
   * Генерация подписи для API
   */
  private generateSignature(timestamp: number): string {
    const signStr = `${this.accessCode}${this.secretKey}${timestamp}`;
    return crypto.createHash('md5').update(signStr).digest('hex');
  }

  /**
   * Добавление заголовков авторизации
   */
  private getAuthHeaders() {
    const timestamp = Date.now();
    return {
      'RT-AccessCode': this.accessCode,
      'RT-Timestamp': String(timestamp),
      'RT-Signature': this.generateSignature(timestamp),
    };
  }

  /**
   * Получить баланс аккаунта
   */
  async getBalance(): Promise<EsimAccessBalance> {
    try {
      this.logger.log('💰 Запрос баланса...');
      
      const response = await this.client.post('/account/query', {}, {
        headers: this.getAuthHeaders(),
      });
      
      if (response.data?.success && response.data?.obj) {
        this.logger.log(`✅ Баланс: ${response.data.obj.balance} ${response.data.obj.currencyCode}`);
        return {
          balance: response.data.obj.balance,
          currency: response.data.obj.currencyCode,
        };
      }
      
      throw new Error(response.data?.errorMsg || 'Ошибка получения баланса');
    } catch (error) {
      this.logger.error('❌ Ошибка получения баланса:', error.message);
      throw error;
    }
  }

  /**
   * Получить список доступных пакетов
   * @param locationCode - фильтр по стране
   * @param dataType - 1 = стандартные, 2 = unlimited/day pass
   */
  async getPackages(locationCode?: string, dataType?: number): Promise<EsimAccessPackage[]> {
    try {
      this.logger.log(`📦 Запрос пакетов (dataType=${dataType || 'all'})...`);
      
      const payload: any = {
        pager: { pageNum: 1, pageSize: 500 }
      };
      
      if (locationCode) {
        payload.locationCode = locationCode;
      }
      
      if (dataType) {
        payload.type = dataType; // 1 = standard, 2 = unlimited/day pass
      }

      const response = await this.client.post('/package/list', payload, {
        headers: this.getAuthHeaders(),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.errorMsg || 'Ошибка получения пакетов');
      }

      const packages = response.data?.obj?.packageList || [];
      
      this.logger.log(`✅ Получено ${packages.length} пакетов`);
      
      return packages.map((pkg: any) => ({
        packageCode: pkg.packageCode,
        name: pkg.name,
        slug: pkg.slug,
        location: pkg.location,
        locationCode: pkg.locationCode,
        price: pkg.price,
        currencyCode: pkg.currencyCode,
        volume: pkg.volume,
        smsVolume: pkg.smsVolume || 0,
        duration: pkg.duration,
        durationUnit: pkg.durationUnit,
        speed: pkg.speed,
        supportTopup: pkg.supportTopup,
        dataType: dataType || (pkg.type || 1), // Сохраняем тип
      }));
    } catch (error) {
      this.logger.error('❌ Ошибка получения пакетов:', error.message);
      throw error;
    }
  }

  /**
   * Купить eSIM
   */
  async purchaseEsim(packageCode: string, quantity = 1, transactionId?: string): Promise<EsimAccessPurchaseResponse> {
    try {
      this.logger.log(`💳 Покупка eSIM (package: ${packageCode}, quantity: ${quantity})...`);

      const response = await this.client.post('/esim/order', {
        packageCode,
        count: quantity,
        transactionId: transactionId || `order_${Date.now()}`,
      }, {
        headers: this.getAuthHeaders(),
      });

      if (response.data?.success && response.data?.obj) {
        const order = response.data.obj;
        this.logger.log(`✅ eSIM куплен успешно (order: ${order.orderNo})`);
        
        return {
          success: true,
          orderNo: order.orderNo,
          esimList: order.esimList?.map((esim: any) => ({
            iccid: esim.iccid,
            lpaCode: esim.lpa || esim.ac,
            smdpAddress: esim.smdpAddress,
            matchingCode: esim.confirmationCode || esim.matchingId,
            qrCodeUrl: esim.qrCodeUrl,
          })) || [],
        };
      }

      throw new Error(response.data?.errorMsg || 'Некорректный ответ от API');
    } catch (error) {
      this.logger.error('❌ Ошибка покупки eSIM:', error.message);
      throw error;
    }
  }

  /**
   * Получить информацию о заказе
   */
  async getOrderInfo(orderNo: string): Promise<any> {
    try {
      this.logger.log(`🔍 Запрос информации о заказе ${orderNo}...`);

      const response = await this.client.post('/esim/query', {
        orderNo,
      }, {
        headers: this.getAuthHeaders(),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.errorMsg || 'Ошибка получения заказа');
      }

      this.logger.log(`✅ Информация о заказе получена`);
      
      return response.data.obj;
    } catch (error) {
      this.logger.error('❌ Ошибка получения информации о заказе:', error.message);
      throw error;
    }
  }

  /**
   * Получить историю заказов
   */
  async getOrderHistory(pageNum = 1, pageSize = 100): Promise<any[]> {
    try {
      this.logger.log(`📜 Запрос истории заказов (page: ${pageNum}, size: ${pageSize})...`);

      const response = await this.client.post('/esim/list', {
        pager: { pageNum, pageSize },
      }, {
        headers: this.getAuthHeaders(),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.errorMsg || 'Ошибка получения заказов');
      }

      const orders = response.data?.obj?.esimList || [];
      
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
      this.logger.warn('⚠️ Health check failed:', error.message);
      return false;
    }
  }
}
