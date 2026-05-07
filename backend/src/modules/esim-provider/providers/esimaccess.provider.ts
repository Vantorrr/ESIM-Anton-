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
  description?: string;
  price: number;
  currencyCode: string;
  volume: number;
  smsVolume: number;
  duration: number;      // Для Daily Unlimited = 1 (в день)
  durationUnit: string;
  validity: number;      // Срок действия (180 дней для Daily Unlimited)
  speed: string;         // Ограничение скорости после лимита
  fupPolicy?: string;
  supportTopup: boolean;
  dataType?: number;     // 1 = standard, 2 = unlimited/day pass
  coverageCountries?: string[];
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
      timeout: 90000, // 90 секунд для больших списков пакетов
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
        payload.dataType = dataType; // 1 = standard, 2 = unlimited/day pass (из документации)
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
        description: pkg.description,
        price: pkg.price,
        currencyCode: pkg.currencyCode,
        volume: pkg.volume,
        smsVolume: pkg.smsVolume || 0,
        duration: pkg.duration,
        durationUnit: pkg.durationUnit,
        validity: pkg.validity || pkg.duration, // Срок действия (для Day Pass обычно 180)
        speed: pkg.speed || '',                  // Ограничение скорости
        fupPolicy: pkg.fupPolicy || '',
        supportTopup: pkg.supportTopup,
        dataType: dataType || (pkg.type || 1),   // Сохраняем тип
        coverageCountries: Array.isArray(pkg.locationNetworkList)
          ? pkg.locationNetworkList
            .map((item: any) => item?.locationName)
            .filter((name: any) => typeof name === 'string' && name.trim().length > 0)
          : [],
      }));
    } catch (error) {
      this.logger.error('❌ Ошибка получения пакетов:', error.message);
      throw error;
    }
  }

  /**
   * Купить eSIM
   */
  async purchaseEsim(packageCode: string, quantity = 1, transactionId?: string, periodNum?: number, price?: number, customerEmail?: string): Promise<EsimAccessPurchaseResponse> {
    try {
      this.logger.log(`💳 Покупка eSIM (package: ${packageCode}, quantity: ${quantity}, periodNum: ${periodNum || 'N/A'}, email: ${customerEmail || 'N/A'})...`);

      const packageInfo: Record<string, any> = {
        packageCode,
        count: quantity,
      };
      if (price) {
        packageInfo.price = price;
      }
      if (periodNum && periodNum > 0) {
        packageInfo.periodNum = periodNum;
      }

      const payload: Record<string, any> = {
        transactionId: transactionId || `mojo_${Date.now()}`,
        packageInfoList: [packageInfo],
      };

      // Если передан email — eSIM Access отправит eSIM напрямую на почту клиента
      if (customerEmail) {
        payload.email = customerEmail;
      }

      this.logger.log(`📤 Payload: ${JSON.stringify(payload)}`);

      const response = await this.client.post('/esim/order', payload, {
        headers: this.getAuthHeaders(),
      });

      this.logger.log(`📥 Response: ${JSON.stringify(response.data)}`);

      if (response.data?.success && response.data?.obj) {
        const order = response.data.obj;
        this.logger.log(`✅ eSIM куплен успешно (order: ${order.orderNo})`);

        let esimList = order.esimList || [];

        // Если esimList пуст — запросим профили отдельно (Query Allocated Profiles)
        if (esimList.length === 0 && order.orderNo) {
          this.logger.log(`🔄 esimList пуст, запрашиваем профили по orderNo ${order.orderNo}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            const queryResponse = await this.client.post('/esim/query', {
              orderNo: order.orderNo,
              pager: { pageNum: 1, pageSize: 10 },
            }, { headers: this.getAuthHeaders() });

            this.logger.log(`📥 Query response: ${JSON.stringify(queryResponse.data)}`);

            if (queryResponse.data?.success && queryResponse.data?.obj) {
              const queryObj = queryResponse.data.obj;
              esimList = queryObj.esimList || queryObj.profileList || [];
              if (esimList.length === 0 && queryObj.iccid) {
                esimList = [queryObj];
              }
            }
          } catch (queryError) {
            this.logger.warn(`⚠️ Не удалось запросить профили: ${queryError.message}`);
          }
        }

        return {
          success: true,
          orderNo: order.orderNo,
          esimList: esimList.map((esim: any) => ({
            iccid: esim.iccid || '',
            lpaCode: esim.lpa || esim.ac || esim.lpaCode || '',
            smdpAddress: esim.smdpAddress || esim.smdp || '',
            matchingCode: esim.confirmationCode || esim.matchingId || esim.matchingCode || '',
            qrCodeUrl: esim.qrCodeUrl || '',
          })),
        };
      }

      throw new Error(response.data?.errorMsg || `API вернул: ${JSON.stringify(response.data)}`);
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
        pager: { pageNum: 1, pageSize: 10 },
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
   * Пополнить/продлить eSIM (Top-up)
   * Работает только для пакетов где supportTopup = true
   */
  async topupEsim(iccid: string, packageCode: string, transactionId?: string): Promise<any> {
    try {
      this.logger.log(`🔄 Пополнение eSIM (iccid: ${iccid}, package: ${packageCode})...`);

      const response = await this.client.post('/esim/topup', {
        iccid,
        packageCode,
        transactionId: transactionId || `topup_${Date.now()}`,
      }, {
        headers: this.getAuthHeaders(),
      });

      if (response.data?.success && response.data?.obj) {
        this.logger.log(`✅ eSIM пополнен успешно`);
        return {
          success: true,
          orderNo: response.data.obj.orderNo,
          ...response.data.obj,
        };
      }

      throw new Error(response.data?.errorMsg || 'Ошибка пополнения eSIM');
    } catch (error) {
      this.logger.error('❌ Ошибка пополнения eSIM:', error.message);
      throw error;
    }
  }

  /**
   * Получить информацию об eSIM по ICCID.
   *
   * Предпочитает `POST /esim/list` по ICCID (Query Allocated Profiles), потому
   * что именно он чаще отдаёт usage/остаток/срок по уже купленным профилям.
   * Если этот endpoint недоступен или вернул пусто — делаем fallback на
   * `POST /esim/query` с тем же ICCID.
   *
   * Возвращает `response.data.obj` целиком — там лежит `esimList[]` с usage,
   * статусом, сроком и SMDP. Точная форма зависит от версии API провайдера,
   * поэтому при первой проблеме можно смотреть debug-лог полного ответа.
   */
  async getEsimInfo(iccid: string): Promise<any> {
    this.logger.log(`🔍 Запрос информации об eSIM ${iccid}...`);

    try {
      const listResponse = await this.client.post('/esim/list', {
        iccid,
        pager: { pageNum: 1, pageSize: 20 },
      }, {
        headers: this.getAuthHeaders(),
      });

      if (listResponse.data?.success) {
        const obj = listResponse.data.obj;
        const esimCount = Array.isArray(obj?.esimList) ? obj.esimList.length : 0;

        this.logger.log(`✅ Информация об eSIM получена через /esim/list (esimList: ${esimCount})`);
        this.logger.debug(`getEsimInfo /esim/list raw response for ${iccid}: ${JSON.stringify(listResponse.data)}`);

        if (esimCount > 0) {
          return obj;
        }

        this.logger.warn(
          `⚠️ /esim/list вернул пустой esimList для ICCID ${iccid}, пробуем fallback /esim/query`,
        );
      } else {
        this.logger.warn(
          `⚠️ /esim/list вернул success=false для ICCID ${iccid}: ${JSON.stringify(listResponse.data)}`,
        );
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        this.logger.debug(`ℹ️ /esim/list недоступен для ICCID ${iccid}, используем /esim/query`);
      } else {
        this.logger.warn(`⚠️ /esim/list не сработал для ICCID ${iccid}: ${error.message}`);
      }
    }

    try {
      const queryResponse = await this.client.post('/esim/query', {
        iccid,
        pager: { pageNum: 1, pageSize: 20 },
      }, {
        headers: this.getAuthHeaders(),
      });

      if (!queryResponse.data?.success) {
        this.logger.warn(
          `⚠️ Провайдер вернул success=false для ICCID ${iccid}: ${JSON.stringify(queryResponse.data)}`,
        );
        throw new Error(queryResponse.data?.errorMsg || 'Ошибка получения информации об eSIM');
      }

      const obj = queryResponse.data.obj;
      const esimCount = Array.isArray(obj?.esimList) ? obj.esimList.length : 0;
      this.logger.log(`✅ Информация об eSIM получена через /esim/query (esimList: ${esimCount})`);
      this.logger.debug(`getEsimInfo /esim/query raw response for ${iccid}: ${JSON.stringify(queryResponse.data)}`);

      if (esimCount === 0) {
        this.logger.warn(
          `⚠️ esimList пуст для ICCID ${iccid}. Возможно, провайдер ещё не отдаёт расход или ICCID не найден.`,
        );
      }

      return obj;
    } catch (error: any) {
      this.logger.error('❌ Ошибка получения информации об eSIM:', error.message);
      throw error;
    }
  }

  /**
   * Получить пакеты для пополнения конкретного eSIM
   */
  async getTopupPackages(iccid: string): Promise<EsimAccessPackage[]> {
    try {
      this.logger.log(`📦 Запрос пакетов для пополнения eSIM ${iccid}...`);

      const response = await this.client.post('/esim/topup/package', {
        iccid,
      }, {
        headers: this.getAuthHeaders(),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.errorMsg || 'Ошибка получения пакетов для пополнения');
      }

      const packages = response.data?.obj?.packageList || [];

      this.logger.log(`✅ Получено ${packages.length} пакетов для пополнения`);

      return packages.map((pkg: any) => ({
        packageCode: pkg.packageCode,
        name: pkg.name,
        slug: pkg.slug,
        location: pkg.location,
        locationCode: pkg.locationCode,
        description: pkg.description,
        price: pkg.price,
        currencyCode: pkg.currencyCode,
        volume: pkg.volume,
        smsVolume: pkg.smsVolume || 0,
        duration: pkg.duration,
        durationUnit: pkg.durationUnit,
        speed: pkg.speed,
        fupPolicy: pkg.fupPolicy || '',
        supportTopup: pkg.supportTopup,
        coverageCountries: Array.isArray(pkg.locationNetworkList)
          ? pkg.locationNetworkList
            .map((item: any) => item?.locationName)
            .filter((name: any) => typeof name === 'string' && name.trim().length > 0)
          : [],
      }));
    } catch (error) {
      this.logger.error('❌ Ошибка получения пакетов для пополнения:', error.message);
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
