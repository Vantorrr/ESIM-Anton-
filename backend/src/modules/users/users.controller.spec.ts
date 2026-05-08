import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ServiceTokenGuard } from '@/common/auth/service-token.guard';
import { JwtAdminGuard, JwtUserGuard } from '@/common/auth/jwt-user.guard';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const usersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getUserStats: jest.fn(),
    findOrCreate: jest.fn(),
    updateEmail: jest.fn(),
  };
  const pushService = {
    getPublicKey: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  };

  const controller = new UsersController(usersService as any, pushService as any);

  beforeEach(() => jest.clearAllMocks());

  it('findAll использует JwtAdminGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, UsersController.prototype.findAll);
    expect(guards).toEqual([JwtAdminGuard]);
  });

  it('findOrCreate использует ServiceTokenGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, UsersController.prototype.findOrCreate);
    expect(guards).toEqual([ServiceTokenGuard]);
  });

  it('findOne запрещает user доступ к чужому профилю', async () => {
    await expect(
      controller.findOne('user_2', { id: 'user_1', type: 'user' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updateMyEmail читает user.id из auth context', async () => {
    usersService.updateEmail.mockResolvedValue({ id: 'user_1', email: 'new@example.com' });

    const result = await controller.updateMyEmail(
      { id: 'user_1', type: 'user' },
      { email: 'new@example.com' },
    );

    expect(usersService.updateEmail).toHaveBeenCalledWith('user_1', 'new@example.com');
    expect(result).toEqual({ id: 'user_1', email: 'new@example.com' });
  });

  it('subscribePush запрещает чужой userId', async () => {
    await expect(
      controller.subscribePush(
        'user_2',
        { id: 'user_1', type: 'user' },
        { endpoint: 'ep', p256dh: 'p', auth: 'a' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('subscribePush использует JwtUserGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, UsersController.prototype.subscribePush);
    expect(guards).toEqual([JwtUserGuard]);
  });
});
