import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtUserGuard } from '@/common/auth/jwt-user.guard';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    loginAdmin: jest.fn(),
    createAdmin: jest.fn(),
    verifyToken: jest.fn(),
    getMe: jest.fn(),
    loginWithOAuth: jest.fn(),
  };
  const smsService = {
    sendCode: jest.fn(),
    normalizePhone: jest.fn(),
    verifyCode: jest.fn(),
  };
  const oauthService = {
    getGoogleRedirectUrl: jest.fn(),
    exchangeGoogleCode: jest.fn(),
    getYandexRedirectUrl: jest.fn(),
    exchangeYandexCode: jest.fn(),
    getVkRedirectUrl: jest.fn(),
    exchangeVkCode: jest.fn(),
    verifyTelegramWidget: jest.fn(),
    verifyTelegramWebAppInitData: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };

  const controller = new AuthController(
    authService as any,
    smsService as any,
    oauthService as any,
    configService as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('registerAdmin отклоняет non-SUPER_ADMIN', async () => {
    await expect(
      controller.registerAdmin(
        { id: 'admin_1', type: 'admin', role: 'MANAGER' },
        { email: 'new@example.com', password: 'secret123' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('registerAdmin создаёт админа для SUPER_ADMIN', async () => {
    authService.createAdmin.mockResolvedValue({ id: 'admin_2' });

    const result = await controller.registerAdmin(
      { id: 'admin_1', type: 'admin', role: 'SUPER_ADMIN' },
      { email: 'new@example.com', password: 'secret123', role: 'SUPPORT' },
    );

    expect(authService.createAdmin).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret123',
      role: 'SUPPORT',
    });
    expect(result).toEqual({ id: 'admin_2' });
  });

  it('getMe использует JwtUserGuard и читает user.id из auth context', async () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.getMe);
    authService.getMe.mockResolvedValue({ id: 'user_1' });

    const result = await controller.getMe({ id: 'user_1', type: 'user' });

    expect(guards).toEqual([JwtUserGuard]);
    expect(authService.getMe).toHaveBeenCalledWith('user_1');
    expect(result).toEqual({ id: 'user_1' });
  });
});
