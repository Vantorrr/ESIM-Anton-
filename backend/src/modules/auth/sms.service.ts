import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('SMS_RU_API_KEY') || '';
    if (this.apiKey) {
      this.logger.log('✅ SMS Service initialized');
    } else {
      this.logger.warn('⚠️ SMS_RU_API_KEY not set - SMS will be logged only');
    }
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendCode(phone: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.smsCode.upsert({
      where: { phone: normalized },
      update: { code, expiresAt },
      create: { phone: normalized, code, expiresAt },
    });

    if (this.apiKey) {
      try {
        const response = await axios.get('https://sms.ru/sms/send', {
          params: {
            api_id: this.apiKey,
            to: normalized,
            msg: `Ваш код входа в Mojo mobile: ${code}. Действителен 5 минут.`,
            json: 1,
          },
        });
        this.logger.log(`📱 SMS sent to ${normalized}: ${JSON.stringify(response.data)}`);
      } catch (error) {
        this.logger.error(`❌ SMS send failed: ${error.message}`);
        throw new BadRequestException('Не удалось отправить SMS. Попробуйте позже.');
      }
    } else {
      // Dev mode - log the code
      this.logger.log(`🔑 DEV SMS code for ${normalized}: ${code}`);
    }
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    const normalized = this.normalizePhone(phone);

    const record = await this.prisma.smsCode.findUnique({
      where: { phone: normalized },
    });

    if (!record) return false;
    if (record.expiresAt < new Date()) {
      await this.prisma.smsCode.delete({ where: { phone: normalized } });
      return false;
    }
    if (record.code !== code) return false;

    await this.prisma.smsCode.delete({ where: { phone: normalized } });
    return true;
  }

  normalizePhone(phone: string): string {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('8') && normalized.length === 11) {
      normalized = '7' + normalized.slice(1);
    }
    if (!normalized.startsWith('7') && normalized.length === 10) {
      normalized = '7' + normalized;
    }
    return '+' + normalized;
  }
}
