import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  Req,
  Redirect,
  Res,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SmsService } from './sms.service';
import { OAuthService } from './oauth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
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
  @ApiOperation({ summary: 'Создать администратора' })
  async registerAdmin(@Body() dto: any) {
    return this.authService.createAdmin(dto);
  }

  // ─── SMS Auth ────────────────────────────────────────────────

  @Post('phone/send-code')
  @ApiOperation({ summary: 'Отправить SMS код' })
  async sendCode(@Body() dto: { phone: string }) {
    if (!dto.phone) throw new BadRequestException('phone required');
    await this.smsService.sendCode(dto.phone);
    return { success: true, message: 'Код отправлен' };
  }

  @Post('phone/verify')
  @ApiOperation({ summary: 'Верифицировать SMS код и получить JWT' })
  async verifyPhone(@Body() dto: { phone: string; code: string }) {
    if (!dto.phone || !dto.code) throw new BadRequestException('phone and code required');
    const phone = this.smsService.normalizePhone(dto.phone);
    const valid = await this.smsService.verifyCode(phone, dto.code);
    if (!valid) throw new BadRequestException('Неверный или просроченный код');
    return this.authService.loginWithPhone(phone);
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить текущего пользователя' })
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token');
    }
    const token = authHeader.slice(7);
    const payload = await this.authService.verifyToken(token);
    if (payload.type !== 'user') throw new UnauthorizedException('Not a user token');
    return this.authService.getMe(payload.sub);
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
