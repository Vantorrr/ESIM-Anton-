# Шаг 3. DTO с class-validator для admin endpoints

> [⬅️ Назад к фазе](../phase-9-api-security-infrastructure.md)

## Цель

Заменить `@Body() dto: any` на типизированные DTO с `class-validator`, чтобы глобальный `ValidationPipe(whitelist: true)` реально фильтровал поля.

## Что нужно сделать

### 3.1 DTO для admin registration

- Создать `backend/src/modules/auth/dto/create-admin.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional() @IsString()
  firstName?: string;

  @IsOptional() @IsString()
  lastName?: string;

  @IsOptional() @IsEnum(AdminRole)
  role?: AdminRole;
}
```

- Обновить `auth.controller.ts`: заменить `@Body() dto: any` на `@Body() dto: CreateAdminDto`.

### 3.2 DTO для products create/update

- Создать `backend/src/modules/products/dto/create-product.dto.ts`:

```typescript
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';

export class CreateProductDto {
  @IsString() country: string;
  @IsString() name: string;
  @IsString() dataAmount: string;
  @IsNumber() @Min(1) validityDays: number;
  @IsNumber() @Min(0) providerPrice: number;
  @IsNumber() @Min(0) ourPrice: number;
  @IsString() providerId: string;

  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() duration?: number;
  @IsOptional() @IsString() speed?: string;
  @IsOptional() @IsString() providerName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isUnlimited?: boolean;
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsString() badgeColor?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() supportTopup?: boolean;
}
```

- Создать `backend/src/modules/products/dto/update-product.dto.ts`:

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

- Обновить `products.controller.ts`: заменить `@Body() createDto: any` / `@Body() updateDto: any`.

### 3.3 DTO для system-settings

- Создать `backend/src/modules/system-settings/dto/update-pricing.dto.ts`:

```typescript
import { IsNumber, Min } from 'class-validator';

export class UpdatePricingDto {
  @IsNumber() @Min(0) exchangeRate: number;
  @IsNumber() @Min(0) defaultMarkupPercent: number;
}
```

- Создать `backend/src/modules/system-settings/dto/update-referral-settings.dto.ts`:

```typescript
import { IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateReferralSettingsDto {
  @IsNumber() @Min(0) @Max(100) bonusPercent: number;
  @IsNumber() @Min(0) minPayout: number;
  @IsBoolean() enabled: boolean;
}
```

- Обновить `system-settings.controller.ts`: заменить inline `@Body()` типы на DTO.

## Результат шага

- Все admin write endpoints валидируют входные данные через `class-validator`.
- `whitelist: true` отсекает неизвестные поля (mass assignment prevention).
- Некорректные данные → `400 Bad Request` с описанием ошибок.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/src/modules/auth/dto/create-admin.dto.ts` [NEW]
- `backend/src/modules/auth/auth.controller.ts` [MODIFY]
- `backend/src/modules/products/dto/create-product.dto.ts` [NEW]
- `backend/src/modules/products/dto/update-product.dto.ts` [NEW]
- `backend/src/modules/products/products.controller.ts` [MODIFY]
- `backend/src/modules/system-settings/dto/update-pricing.dto.ts` [NEW]
- `backend/src/modules/system-settings/dto/update-referral-settings.dto.ts` [NEW]
- `backend/src/modules/system-settings/system-settings.controller.ts` [MODIFY]

## Тестирование / Верификация

- `POST /api/auth/register-admin` с `{ email: "not-an-email" }` → `400` с ошибкой `email must be an email`.
- `POST /api/auth/register-admin` с `{ email: "a@b.com", password: "123" }` → `400` с ошибкой `password must be longer than or equal to 8 characters`.
- `POST /api/products` с `{ country: "RU", name: "Test", extraField: "hack" }` → `extraField` отброшен (whitelist).
- `POST /api/system-settings/pricing` с `{ exchangeRate: -5 }` → `400`.
- `npm run build` — без ошибок.
