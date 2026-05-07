import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение БД...\n');

  // 1. Создаем админа
  console.log('👤 Создаем администратора...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@esim-service.com' },
    update: {},
    create: {
      email: 'admin@esim-service.com',
      password: adminPassword,
      firstName: 'Администратор',
      lastName: 'Системы',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Админ создан: ${admin.email} (пароль: admin123)\n`);

  // 2. Создаем уровни лояльности
  console.log('🎖 Создаем уровни лояльности...');
  
  const levels = [
    { name: 'Новичок', minSpent: 0, cashbackPercent: 1, discount: 0 },
    { name: 'Бронза', minSpent: 5000, cashbackPercent: 3, discount: 2 },
    { name: 'Серебро', minSpent: 15000, cashbackPercent: 5, discount: 5 },
    { name: 'Золото', minSpent: 50000, cashbackPercent: 7, discount: 10 },
    { name: 'Платина', minSpent: 100000, cashbackPercent: 10, discount: 15 },
  ];

  for (const level of levels) {
    await prisma.loyaltyLevel.upsert({
      where: { name: level.name },
      update: {},
      create: level,
    });
  }
  console.log(`✅ Создано ${levels.length} уровней лояльности\n`);

  // 3. Создаем продукты (тарифы eSIM)
  console.log('📦 Создаем продукты...');
  
  const products = [
    // США
    { country: 'US', name: '1GB / 7 дней', dataAmount: '1GB', validityDays: 7, providerPrice: 300, ourPrice: 490, providerId: 'usa_1gb_7d' },
    { country: 'US', name: '3GB / 15 дней', dataAmount: '3GB', validityDays: 15, providerPrice: 600, ourPrice: 990, providerId: 'usa_3gb_15d' },
    { country: 'US', name: '5GB / 30 дней', dataAmount: '5GB', validityDays: 30, providerPrice: 900, ourPrice: 1490, providerId: 'usa_5gb_30d' },
    { country: 'US', name: '10GB / 30 дней', dataAmount: '10GB', validityDays: 30, providerPrice: 1500, ourPrice: 2490, providerId: 'usa_10gb_30d' },
    
    // Европа
    { country: 'EU-30', region: 'France, Germany, Italy, Spain, Netherlands, Belgium, Austria, Switzerland', name: '1GB / 7 дней', dataAmount: '1GB', validityDays: 7, providerPrice: 350, ourPrice: 590, providerId: 'eu_1gb_7d' },
    { country: 'EU-30', region: 'France, Germany, Italy, Spain, Netherlands, Belgium, Austria, Switzerland', name: '3GB / 15 дней', dataAmount: '3GB', validityDays: 15, providerPrice: 700, ourPrice: 1190, providerId: 'eu_3gb_15d' },
    { country: 'EU-30', region: 'France, Germany, Italy, Spain, Netherlands, Belgium, Austria, Switzerland', name: '5GB / 30 дней', dataAmount: '5GB', validityDays: 30, providerPrice: 1000, ourPrice: 1690, providerId: 'eu_5gb_30d' },
    { country: 'EU-30', region: 'France, Germany, Italy, Spain, Netherlands, Belgium, Austria, Switzerland', name: '10GB / 30 дней', dataAmount: '10GB', validityDays: 30, providerPrice: 1800, ourPrice: 2890, providerId: 'eu_10gb_30d' },
    
    // Турция
    { country: 'TR', name: '2GB / 7 дней', dataAmount: '2GB', validityDays: 7, providerPrice: 200, ourPrice: 390, providerId: 'tr_2gb_7d' },
    { country: 'TR', name: '5GB / 15 дней', dataAmount: '5GB', validityDays: 15, providerPrice: 400, ourPrice: 690, providerId: 'tr_5gb_15d' },
    { country: 'TR', name: '8GB / 30 дней', dataAmount: '8GB', validityDays: 30, providerPrice: 700, ourPrice: 1190, providerId: 'tr_8gb_30d' },
    
    // ОАЭ
    { country: 'AE', name: '1GB / 7 дней', dataAmount: '1GB', validityDays: 7, providerPrice: 250, ourPrice: 450, providerId: 'ae_1gb_7d' },
    { country: 'AE', name: '3GB / 15 дней', dataAmount: '3GB', validityDays: 15, providerPrice: 500, ourPrice: 850, providerId: 'ae_3gb_15d' },
    { country: 'AE', name: '5GB / 30 дней', dataAmount: '5GB', validityDays: 30, providerPrice: 800, ourPrice: 1390, providerId: 'ae_5gb_30d' },
    
    // Азия
    { country: 'TH', name: '2GB / 7 дней', dataAmount: '2GB', validityDays: 7, providerPrice: 180, ourPrice: 350, providerId: 'th_2gb_7d' },
    { country: 'TH', name: '5GB / 15 дней', dataAmount: '5GB', validityDays: 15, providerPrice: 380, ourPrice: 650, providerId: 'th_5gb_15d' },
    { country: 'JP', name: '1GB / 7 дней', dataAmount: '1GB', validityDays: 7, providerPrice: 300, ourPrice: 550, providerId: 'jp_1gb_7d' },
    { country: 'JP', name: '3GB / 15 дней', dataAmount: '3GB', validityDays: 15, providerPrice: 600, ourPrice: 1050, providerId: 'jp_3gb_15d' },
  ];

  for (const product of products) {
    const existing = await prisma.esimProduct.findFirst({
      where: { providerId: product.providerId },
      select: { id: true },
    });

    if (existing) {
      await prisma.esimProduct.update({
        where: { id: existing.id },
        data: {
          country: product.country,
          region: product.region,
          name: product.name,
          dataAmount: product.dataAmount,
          validityDays: product.validityDays,
          providerPrice: product.providerPrice,
          ourPrice: product.ourPrice,
          providerName: 'seed',
        },
      });
      continue;
    }

    await prisma.esimProduct.create({
      data: {
        ...product,
        providerName: 'seed',
      },
    });
  }
  console.log(`✅ Создано ${products.length} продуктов\n`);

  // 4. Создаем системные настройки
  console.log('⚙️ Создаем системные настройки...');
  
  const settings = [
    { key: 'REFERRAL_BONUS_PERCENT', value: '5', description: 'Процент реферального бонуса' },
    { key: 'REFERRAL_MIN_PAYOUT', value: '500', description: 'Минимальная сумма для использования бонусов (₽)' },
    { key: 'REFERRAL_ENABLED', value: 'true', description: 'Включена ли реферальная программа' },
    { key: 'CASHBACK_ENABLED', value: 'true', description: 'Включен ли кэшбэк' },
  ];

  for (const setting of settings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ Создано ${settings.length} настроек\n`);

  console.log('✨ Заполнение БД завершено!\n');
  console.log('📝 Данные для входа в админ-панель:');
  console.log('   Email: admin@esim-service.com');
  console.log('   Пароль: admin123\n');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
