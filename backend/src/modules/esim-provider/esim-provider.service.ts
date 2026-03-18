import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EsimAccessProvider } from './providers/esimaccess.provider';

/**
 * Интерфейсы для eSIM Go API
 */
interface EsimGoPackage {
  id: string;
  title: string;
  country: string;
  region?: string;
  dataAmount: string;
  validityDays: number;
  price: number;
  currency: string;
  operator?: string;
}

export interface EsimGoPurchaseResponse {
  success: boolean;
  order_id: string;
  iccid: string;
  qr_code: string; // Base64 или URL
  activation_code: string;
  smdp_address?: string;
  status: string;
}

export interface EsimGoOrderStatus {
  order_id: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  iccid?: string;
  data_used?: number;
  data_total?: number;
}

/**
 * Сервис для интеграции с провайдерами eSIM
 * 
 * Поддерживает:
 * - Основного провайдера (eSIM Go)
 * - Резервного провайдера (fallback)
 * - Автоматическое переключение при ошибках
 */
@Injectable()
export class EsimProviderService {
  private readonly logger = new Logger(EsimProviderService.name);
  
  // Провайдеры
  private esimAccessProvider: EsimAccessProvider | null = null;
  
  // Клиенты для API (старый подход - для совместимости)
  private primaryClient: AxiosInstance;
  private fallbackClient: AxiosInstance | null = null;

  // Настройки
  private readonly useFallback: boolean;
  private readonly primaryApiUrl: string;
  private readonly primaryApiKey: string | null;
  private readonly fallbackApiUrl: string | null;
  private readonly fallbackApiKey: string | null;
  
  // eSIM Access настройки
  private readonly esimAccessCode: string | null;
  private readonly esimSecretKey: string | null;

  constructor(private configService: ConfigService) {
    // eSIM Access (основной провайдер)
    this.esimAccessCode = this.configService.get<string>('ESIMACCESS_ACCESS_CODE');
    this.esimSecretKey = this.configService.get<string>('ESIMACCESS_SECRET_KEY');
    
    // Инициализируем eSIM Access провайдер
    if (this.esimAccessCode && this.esimSecretKey) {
      this.esimAccessProvider = new EsimAccessProvider(
        this.esimAccessCode,
        this.esimSecretKey,
      );
      this.logger.log('✅ eSIM Access провайдер активирован');
    }
    
    // Основной провайдер (eSIM Go) - для совместимости
    this.primaryApiUrl = this.configService.get<string>('ESIM_PRIMARY_API_URL') || 
                         'https://api.esimgo.com/v2';
    this.primaryApiKey = this.configService.get<string>('ESIM_PRIMARY_API_KEY');

    // Резервный провайдер
    this.fallbackApiUrl = this.configService.get<string>('ESIM_FALLBACK_API_URL');
    this.fallbackApiKey = this.configService.get<string>('ESIM_FALLBACK_API_KEY');
    this.useFallback = !!this.fallbackApiUrl;

    // Создаем основной клиент
    this.primaryClient = axios.create({
      baseURL: this.primaryApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.primaryApiKey && { 'X-API-Key': this.primaryApiKey }),
      },
    });

    // Создаем резервный клиент (если настроен)
    if (this.useFallback) {
      this.fallbackClient = axios.create({
        baseURL: this.fallbackApiUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          ...(this.fallbackApiKey && { 'Authorization': `Bearer ${this.fallbackApiKey}` }),
        },
      });
      this.logger.log('✅ Резервный провайдер настроен');
    }

    this.logger.log(`✅ eSIM Provider сервис инициализирован (Primary: ${this.primaryApiUrl})`);
  }

  /**
   * Получить список доступных пакетов/тарифов
   * @param country - фильтр по стране
   * @param dataType - 1 = standard, 2 = unlimited/day pass
   */
  async getPackages(country?: string, dataType?: number): Promise<any[]> {
    if (this.esimAccessProvider) {
      try {
        return await this.esimAccessProvider.getPackages(country, dataType);
      } catch (error) {
        this.logger.error('❌ Ошибка eSIM Access:', error.message);
        throw new BadRequestException('Ошибка получения пакетов: ' + error.message);
      }
    }
    
    throw new BadRequestException('Провайдер eSIM не настроен');
  }

  /**
   * Получить список пакетов от резервного провайдера
   */
  private async getPackagesFromFallback(country?: string): Promise<EsimGoPackage[]> {
    try {
      this.logger.log('🔄 Переключение на резервного провайдера...');
      
      const response = await this.fallbackClient.get('/packages', {
        params: { country },
      });

      if (response.data && response.data.packages) {
        this.logger.log(`✅ Получено ${response.data.packages.length} пакетов от резервного`);
        return response.data.packages;
      }

      return [];
    } catch (error) {
      this.logger.error('❌ Ошибка и у резервного провайдера:', error.message);
      throw new BadRequestException('Не удалось получить список пакетов от обоих провайдеров');
    }
  }

  /**
   * Купить eSIM у провайдера
   */
  async purchaseEsim(packageId: string, email?: string, periodNum?: number): Promise<EsimGoPurchaseResponse> {
    if (this.esimAccessProvider) {
      try {
        const result = await this.esimAccessProvider.purchaseEsim(packageId, 1, undefined, periodNum);
        
        const esim = result.esimList?.[0];
        
        return {
          success: true,
          order_id: result.orderNo,
          iccid: esim?.iccid || '',
          qr_code: esim?.qrCodeUrl || '',
          activation_code: esim?.lpaCode || esim?.matchingCode || '',
          smdp_address: esim?.smdpAddress || '',
          status: 'active',
        };
      } catch (error) {
        this.logger.error('❌ Ошибка eSIM Access:', error.message);
        throw new BadRequestException('Ошибка провайдера eSIM: ' + error.message);
      }
    }
    
    throw new BadRequestException('Провайдер eSIM не настроен (ESIMACCESS_ACCESS_CODE / ESIMACCESS_SECRET_KEY)');
  }

  /**
   * Купить eSIM у резервного провайдера
   */
  private async purchaseEsimFromFallback(
    packageId: string,
    email?: string,
  ): Promise<EsimGoPurchaseResponse> {
    try {
      this.logger.log('🔄 Переключение на резервного провайдера для покупки...');

      const response = await this.fallbackClient.post('/orders', {
        package_id: packageId,
        email: email || 'noreply@esim-service.com',
        quantity: 1,
      });

      if (response.data && response.data.success) {
        this.logger.log(`✅ eSIM куплен у резервного провайдера (order: ${response.data.order_id})`);
        return {
          success: true,
          order_id: response.data.order_id,
          iccid: response.data.iccid,
          qr_code: response.data.qr_code,
          activation_code: response.data.activation_code,
          status: response.data.status || 'active',
        };
      }

      throw new Error('Некорректный ответ от резервного API');
    } catch (error) {
      this.logger.error('❌ Ошибка покупки и у резервного провайдера:', error.message);
      throw new BadRequestException('Не удалось приобрести eSIM у обоих провайдеров');
    }
  }

  /**
   * Проверить статус заказа
   */
  async checkOrderStatus(orderId: string, providerName = 'primary'): Promise<EsimGoOrderStatus> {
    try {
      this.logger.log(`🔍 Проверка статуса заказа ${orderId}...`);

      const client = providerName === 'fallback' && this.fallbackClient 
        ? this.fallbackClient 
        : this.primaryClient;

      const response = await client.get(`/orders/${orderId}`);

      if (response.data) {
        this.logger.log(`✅ Статус заказа: ${response.data.status}`);
        return {
          order_id: response.data.order_id || orderId,
          status: response.data.status,
          iccid: response.data.iccid,
          data_used: response.data.data_used,
          data_total: response.data.data_total,
        };
      }

      throw new Error('Некорректный ответ от API');
    } catch (error) {
      this.logger.error('❌ Ошибка проверки статуса:', error.message);

      // Если ошибка с основным - пробуем резервного
      if (providerName === 'primary' && this.useFallback) {
        return this.checkOrderStatus(orderId, 'fallback');
      }

      throw new BadRequestException('Не удалось проверить статус заказа');
    }
  }

  /**
   * Синхронизировать продукты с провайдером
   * (Загрузить актуальные тарифы и обновить базу)
   */
  async syncProducts(): Promise<{ synced: number; errors: number }> {
    try {
      this.logger.log('🔄 Синхронизация продуктов с провайдером...');

      const packages = await this.getPackages();

      // TODO: Интеграция с ProductsService для обновления БД
      // Пример:
      // for (const pkg of packages) {
      //   await this.productsService.upsert({
      //     providerId: pkg.id,
      //     country: pkg.country,
      //     name: pkg.title,
      //     dataAmount: pkg.dataAmount,
      //     validityDays: pkg.validityDays,
      //     providerPrice: pkg.price,
      //     ourPrice: pkg.price * 1.5, // Наценка 50%
      //   });
      // }

      this.logger.log(`✅ Синхронизировано ${packages.length} продуктов`);

      return {
        synced: packages.length,
        errors: 0,
      };
    } catch (error) {
      this.logger.error('❌ Ошибка синхронизации:', error.message);
      return {
        synced: 0,
        errors: 1,
      };
    }
  }

  /**
   * Проверить доступность API провайдера
   */
  async healthCheck(): Promise<{ esimAccess: boolean | null; primary: boolean; fallback: boolean | null }> {
    const result = {
      esimAccess: null as boolean | null,
      primary: false,
      fallback: null as boolean | null,
    };

    // Проверяем eSIM Access
    if (this.esimAccessProvider) {
      try {
        result.esimAccess = await this.esimAccessProvider.healthCheck();
        this.logger.log(result.esimAccess ? '✅ eSIM Access доступен' : '⚠️ eSIM Access недоступен');
      } catch (error) {
        result.esimAccess = false;
        this.logger.warn('⚠️ eSIM Access недоступен');
      }
    }

    // Проверяем основного
    try {
      await this.primaryClient.get('/health', { timeout: 5000 });
      result.primary = true;
      this.logger.log('✅ Основной провайдер доступен');
    } catch (error) {
      this.logger.warn('⚠️ Основной провайдер недоступен');
    }

    // Проверяем резервного
    if (this.useFallback && this.fallbackClient) {
      try {
        await this.fallbackClient.get('/health', { timeout: 5000 });
        result.fallback = true;
        this.logger.log('✅ Резервный провайдер доступен');
      } catch (error) {
        this.logger.warn('⚠️ Резервный провайдер недоступен');
        result.fallback = false;
      }
    }

    return result;
  }
}
