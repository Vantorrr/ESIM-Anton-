import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ReferralsController } from './referrals.controller';
import { JwtAdminGuard, JwtUserGuard } from '@/common/auth/jwt-user.guard';

describe('ReferralsController', () => {
  const referralsService = {
    registerReferral: jest.fn(),
    getReferralStats: jest.fn(),
    getTopReferrers: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('bot-token'),
  };

  const controller = new ReferralsController(referralsService as any, configService as any);

  beforeEach(() => jest.clearAllMocks());

  it('getMyStats использует JwtUserGuard и читает user.id из auth context', async () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ReferralsController.prototype.getMyStats);
    referralsService.getReferralStats.mockResolvedValue({ referralCode: 'REF123' });

    const result = await controller.getMyStats({ id: 'user_1' } as any);

    expect(guards).toEqual([JwtUserGuard]);
    expect(referralsService.getReferralStats).toHaveBeenCalledWith('user_1');
    expect(result).toEqual({ referralCode: 'REF123' });
  });

  it('getStats использует JwtAdminGuard для admin/internal route', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ReferralsController.prototype.getStats);

    expect(guards).toEqual([JwtAdminGuard]);
  });

  it('getTop использует JwtAdminGuard для leaderboard route', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ReferralsController.prototype.getTop);

    expect(guards).toEqual([JwtAdminGuard]);
  });

  it('register требует bot token и telegramId match payload для bot route', async () => {
    referralsService.registerReferral.mockResolvedValue({ id: 'ref_1' });

    await controller.register('bot-token', {
      userId: 'user_1',
      referralCode: 'REF123',
      telegramId: '123456',
    });

    expect(referralsService.registerReferral).toHaveBeenCalledWith(
      'user_1',
      'REF123',
      BigInt('123456'),
    );
  });
});
