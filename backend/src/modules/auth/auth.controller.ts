import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Redirect,
  Res,
  BadRequestException,
  Logger,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthUser, CurrentUser, JwtAdminGuard, JwtUserGuard } from '@/common/auth/jwt-user.guard';
import { AuthService } from './auth.service';
import { EmailCodeService } from './email-code.service';
import { OAuthService } from './oauth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly emailCodeService: EmailCodeService,
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Admin ───────────────────────────────────────────────────

  @Post('login')
  @ApiOperation({ summary: 'Логин администратора' })
  async login(@Body() dto: { email: string; password: string }) {
    return this.authService.loginAdmin(dto.email, dto.password);
  }

  @Post('register-admin')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать администратора' })
  async registerAdmin(
    @CurrentUser() caller: AuthUser,
    @Body()
    dto: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      role?: 'SUPER_ADMIN' | 'MANAGER' | 'SUPPORT';
    },
  ) {
    if (caller.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can create admins');
    }
    return this.authService.createAdmin(dto);
  }

  // ─── Email Auth ───────────────────────────────────────────────

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('email/send-code')
  @ApiOperation({ summary: 'Отправить код на email' })
  async sendEmailCode(@Body() dto: { email: string }) {
    if (!dto.email) throw new BadRequestException('email required');
    await this.emailCodeService.sendCode(dto.email);
    return { success: true, message: 'Код отправлен на email' };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('email/verify')
  @ApiOperation({ summary: 'Верифицировать email код и получить JWT' })
  async verifyEmail(@Body() dto: { email: string; code: string }) {
    if (!dto.email || !dto.code) throw new BadRequestException('email and code required');
    const email = dto.email.trim().toLowerCase();
    const valid = await this.emailCodeService.verifyCode(email, dto.code);
    if (!valid) throw new BadRequestException('Неверный или просроченный код');
    return this.authService.loginWithEmail(email);
  }

  // ─── Google OAuth ─────────────────────────────────────────────

  @Get('oauth/google/redirect')
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  @Redirect()
  googleRedirect(@Req() req: Request, @Query('state') state?: string) {
    const redirectUri = this.getCallbackUrl('google', req);
    let url = this.oauthService.getGoogleRedirectUrl(redirectUri);
    if (state) url += `&state=${encodeURIComponent(state)}`;
    return { url, statusCode: 302 };
  }

  @Get('oauth/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Req() req: Request,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) return this.redirectError(res, state, 'Google auth cancelled');
    try {
      const redirectUri = this.getCallbackUrl('google', req);
      const profile = await this.oauthService.exchangeGoogleCode(code, redirectUri);
      const { access_token } = await this.authService.loginWithOAuth(profile);
      return this.redirectSuccess(res, state, access_token);
    } catch (e: any) {
      this.logger.error(`Google callback error: ${e.message}`);
      return this.redirectError(res, state, e.message);
    }
  }

  // ─── Yandex OAuth ─────────────────────────────────────────────

  @Get('oauth/yandex/redirect')
  @ApiOperation({ summary: 'Redirect to Yandex OAuth' })
  @Redirect()
  yandexRedirect(@Req() req: Request, @Query('state') state?: string) {
    const redirectUri = this.getCallbackUrl('yandex', req);
    let url = this.oauthService.getYandexRedirectUrl(redirectUri);
    if (state) url += `&state=${encodeURIComponent(state)}`;
    return { url, statusCode: 302 };
  }

  @Get('oauth/yandex/callback')
  @ApiOperation({ summary: 'Yandex OAuth callback' })
  async yandexCallback(
    @Req() req: Request,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) return this.redirectError(res, state, 'Yandex auth cancelled');
    try {
      const redirectUri = this.getCallbackUrl('yandex', req);
      const profile = await this.oauthService.exchangeYandexCode(code, redirectUri);
      const { access_token } = await this.authService.loginWithOAuth(profile);
      return this.redirectSuccess(res, state, access_token);
    } catch (e: any) {
      this.logger.error(`Yandex callback error: ${e.message}`);
      return this.redirectError(res, state, e.message);
    }
  }

  // ─── VK OAuth ─────────────────────────────────────────────────

  @Get('oauth/vk/redirect')
  @ApiOperation({ summary: 'Redirect to VK OAuth' })
  @Redirect()
  vkRedirect(@Req() req: Request, @Query('state') state?: string) {
    const redirectUri = this.getCallbackUrl('vk', req);
    let url = this.oauthService.getVkRedirectUrl(redirectUri);
    if (state) url += `&state=${encodeURIComponent(state)}`;
    return { url, statusCode: 302 };
  }

  @Get('oauth/vk/callback')
  @ApiOperation({ summary: 'VK OAuth callback' })
  async vkCallback(
    @Req() req: Request,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) return this.redirectError(res, state, 'VK auth cancelled');
    try {
      const redirectUri = this.getCallbackUrl('vk', req);
      const profile = await this.oauthService.exchangeVkCode(code, redirectUri);
      const { access_token } = await this.authService.loginWithOAuth(profile);
      return this.redirectSuccess(res, state, access_token);
    } catch (e: any) {
      this.logger.error(`VK callback error: ${e.message}`);
      return this.redirectError(res, state, e.message);
    }
  }

  // ─── Telegram Login Widget ─────────────────────────────────────

  @Post('telegram')
  @ApiOperation({ summary: 'Вход через Telegram Login Widget (POST)' })
  async telegramAuth(@Body() dto: Record<string, string>) {
    if (!dto.hash) throw new BadRequestException('hash required');
    const profile = this.oauthService.verifyTelegramWidget(dto);
    return this.authService.loginWithOAuth(profile);
  }

  @Post('telegram/webapp')
  @ApiOperation({ summary: 'Автоматический вход через Telegram Mini App (initData)' })
  async telegramWebAppAuth(@Body() dto: { initData: string }) {
    if (!dto.initData) throw new BadRequestException('initData required');
    const profile = this.oauthService.verifyTelegramWebAppInitData(dto.initData);
    return this.authService.loginWithOAuth(profile);
  }

  // ─── /auth/me ─────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить текущего пользователя' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private getCallbackUrl(provider: string, req?: Request): string {
    const envBackendUrl = this.configService.get('BACKEND_URL');
    const configuredBase = this.withApiBase(envBackendUrl);

    // In production we prefer stable BACKEND_URL to avoid provider callback mismatch
    // when requests arrive through alternate hosts/proxies.
    const requestBase = req ? this.withApiBase(this.getRequestBaseUrl(req)) : null;
    const shouldUseConfiguredBase =
      Boolean(configuredBase) && !this.isLocalhostUrl(configuredBase as string);

    const base =
      (shouldUseConfiguredBase ? configuredBase : null) ||
      requestBase ||
      configuredBase ||
      'http://localhost:3000/api';

    return `${base}/auth/oauth/${provider}/callback`;
  }

  private isLocalhostUrl(url: string): boolean {
    return /localhost|127\.0\.0\.1/.test(url);
  }

  private withApiBase(url?: string | null): string | null {
    if (!url) return null;
    const normalized = url.replace(/\/+$/, '');
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }

  private getRequestBaseUrl(req: Request): string | null {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (!host) return null;
    const hostValue = Array.isArray(host) ? host[0] : host;
    const protoValue = Array.isArray(proto) ? proto[0] : proto || 'https';
    return `${protoValue}://${hostValue}`;
  }

  private getFrontendUrl(): string {
    return this.configService.get('FRONTEND_URL') || 'http://localhost:3002';
  }

  private redirectSuccess(res: Response, state: string | undefined, token: string) {
    const frontendUrl = this.getFrontendUrl();
    const returnTo = state ? decodeURIComponent(state) : '/';
    const url = `${frontendUrl}/login/callback?token=${token}&returnTo=${encodeURIComponent(returnTo)}`;
    return res.redirect(302, url);
  }

  private redirectError(res: Response, state: string | undefined, error: string) {
    const frontendUrl = this.getFrontendUrl();
    const url = `${frontendUrl}/login?error=${encodeURIComponent(error)}`;
    return res.redirect(302, url);
  }
}
