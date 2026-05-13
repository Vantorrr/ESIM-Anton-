import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';

const MAX_ATTEMPTS = 5;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class EmailCodeService {
  private readonly logger = new Logger(EmailCodeService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const host = this.configService.get('SMTP_HOST');
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get('SMTP_PORT') || 465),
        secure: true,
        auth: { user, pass },
      });
      this.logger.log('✅ EmailCode service initialized (SMTP)');
    } else {
      this.logger.warn('⚠️ SMTP not configured — email codes will be logged only');
    }
  }

  private generateCode(): string {
    return randomInt(100000, 999999).toString();
  }

  async sendCode(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.emailCode.upsert({
      where: { email: normalized },
      update: { code, expiresAt, attempts: 0 },
      create: { email: normalized, code, expiresAt },
    });

    if (this.transporter) {
      const from = this.configService.get('SMTP_FROM') || 'noreply@mojomobile.ru';
      try {
        await this.transporter.sendMail({
          from: `"Mojo mobile" <${from}>`,
          to: normalized,
          subject: 'Код входа в Mojo mobile',
          html: this.buildEmailHtml(code),
        });
        this.logger.log(`📧 Email code sent to ${normalized}`);
      } catch (error: any) {
        this.logger.error(`❌ Email send failed: ${error.message}`);
        if (this.configService.get('NODE_ENV') === 'production') {
          throw new BadRequestException('Не удалось отправить код. Попробуйте позже.');
        }
        this.logger.warn(`⚠️ SMTP failed in non-production mode, using dev fallback`);
        this.logger.log(`🔑 DEV email code for ${normalized}: ${code}`);
      }
    } else {
      this.logger.log(`🔑 DEV email code for ${normalized}: ${code}`);
    }
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();

    const record = await this.prisma.emailCode.findUnique({
      where: { email: normalized },
    });

    if (!record) return false;

    // Expired — delete and reject
    if (record.expiresAt < new Date()) {
      await this.prisma.emailCode.delete({ where: { email: normalized } });
      return false;
    }

    // Brute force — too many wrong attempts, burn the code
    if (record.attempts >= MAX_ATTEMPTS) {
      await this.prisma.emailCode.delete({ where: { email: normalized } });
      return false;
    }

    // Wrong code — increment attempts
    if (record.code !== code) {
      await this.prisma.emailCode.update({
        where: { email: normalized },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    // Correct — delete and grant access
    await this.prisma.emailCode.delete({ where: { email: normalized } });
    return true;
  }

  private buildEmailHtml(code: string): string {
    return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:420px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#f77430,#f29b41);padding:28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Mojo mobile</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Код для входа в аккаунт</p>
    </div>
    <div style="padding:32px;text-align:center">
      <div style="background:#f8f9fa;border-radius:16px;padding:24px;margin-bottom:20px">
        <p style="margin:0 0 8px;color:#636567;font-size:13px;text-transform:uppercase;letter-spacing:1px">Ваш код</p>
        <p style="margin:0;font-size:36px;font-weight:800;color:#2f2f2f;letter-spacing:8px;font-family:monospace">${code}</p>
      </div>
      <p style="color:#636567;font-size:13px;margin:0">Код действителен 5 минут.<br>Если вы не запрашивали код — просто проигнорируйте.</p>
    </div>
    <div style="padding:12px 32px;border-top:1px solid #eceef2;text-align:center">
      <p style="margin:0;color:#8f9599;font-size:11px">Mojo mobile · eSIM для путешествий · app.mojomobile.ru</p>
    </div>
  </div>
</body>
</html>`;
  }
}
