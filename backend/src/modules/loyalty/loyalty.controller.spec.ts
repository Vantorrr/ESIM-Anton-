import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { LoyaltyController } from './loyalty.controller';
import { JwtAdminGuard, JwtUserGuard } from '@/common/auth/jwt-user.guard';

describe('LoyaltyController', () => {
  const loyaltyService = {
    getUserProgram: jest.fn(),
    getLevels: jest.fn(),
    getLevelById: jest.fn(),
    createLevel: jest.fn(),
    updateLevel: jest.fn(),
    deleteLevel: jest.fn(),
    getUsersByLevel: jest.fn(),
  };

  const controller = new LoyaltyController(loyaltyService as any);

  beforeEach(() => jest.clearAllMocks());

  it('getMyProgram использует JwtUserGuard и читает user.id из auth context', async () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, LoyaltyController.prototype.getMyProgram);
    loyaltyService.getUserProgram.mockResolvedValue({ currentLevel: { id: 'lvl_1' } });

    const result = await controller.getMyProgram({ id: 'user_1' } as any);

    expect(guards).toEqual([JwtUserGuard]);
    expect(loyaltyService.getUserProgram).toHaveBeenCalledWith('user_1');
    expect(result).toEqual({ currentLevel: { id: 'lvl_1' } });
  });

  it('getLevels использует JwtAdminGuard и проксирует вызов в service', async () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, LoyaltyController.prototype.getLevels);
    loyaltyService.getLevels.mockResolvedValue([{ id: 'lvl_1' }]);

    const result = await controller.getLevels();

    expect(guards).toEqual([JwtAdminGuard]);
    expect(loyaltyService.getLevels).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'lvl_1' }]);
  });
});
