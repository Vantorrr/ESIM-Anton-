# Шаг 5. Усилить JWT модель (type, roles, TTL)

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Разделить admin и user token domains, предотвратить token confusion и сократить окно компрометации.

## Что нужно сделать

### 5.1 Добавить `type: 'admin'` в admin JWT payload

- В `auth.service.ts`, метод `loginAdmin()`: добавить `type: 'admin'` в payload объекта перед `jwtService.sign()`.

```
const payload = {
  sub: admin.id,
  email: admin.email,
  role: admin.role,
  type: 'admin',        // ← добавить
};
```

### 5.2 Усилить `JwtAdminGuard` — whitelist ролей + type check

- В `jwt-user.guard.ts`, класс `JwtAdminGuard`:
  - Определить `ADMIN_ROLES = new Set(['SUPER_ADMIN', 'MANAGER', 'SUPPORT'])`.
  - Заменить текущую проверку `if (!payload?.sub || !payload?.role)` на `if (!payload?.sub || payload?.type !== 'admin' || !ADMIN_ROLES.has(payload?.role))`.

```
До:
  if (!payload?.sub || !payload?.role) {
    throw new UnauthorizedException('Not an admin token');
  }

После:
  const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'MANAGER', 'SUPPORT']);
  if (!payload?.sub || payload?.type !== 'admin' || !ADMIN_ROLES.has(payload?.role)) {
    throw new UnauthorizedException('Not an admin token');
  }
```

### 5.3 Сократить TTL admin JWT до 8 часов

- В `auth.service.ts`, метод `loginAdmin()`: использовать `jwtService.sign(payload, { expiresIn: '8h' })` вместо дефолтного `7d`.

```
return {
  access_token: this.jwtService.sign(payload, { expiresIn: '8h' }),
  admin: { ... },
};
```

## Результат шага

- Admin JWT содержит `type: 'admin'` — нельзя подменить user token.
- `JwtAdminGuard` проверяет `type === 'admin'` + role из whitelist.
- Admin session живёт 8 часов, а не 7 дней.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/src/modules/auth/auth.service.ts`
- `backend/src/common/auth/jwt-user.guard.ts`

## Тестирование / Верификация

- Login admin → декодировать JWT → проверить наличие `type: 'admin'` и `role: 'SUPER_ADMIN'`.
- User JWT (с `type: 'user'`) → запрос к admin endpoint → `401`.
- Токен без `type` → admin endpoint → `401` (breaking change: старые токены инвалидируются).
- Токен с `role: 'HACKER'` → admin endpoint → `401`.
- Admin login → через 8 часов → token expired → 401 → UI делает logout.
- `npm run build` — без ошибок.
- `npm run test` — проверить, что существующие тесты для `JwtAdminGuard` обновлены.

> **Внимание:** после деплоя этого шага все ранее выданные admin JWT (без `type: 'admin'`) перестанут работать. Админам нужно перелогиниться.
