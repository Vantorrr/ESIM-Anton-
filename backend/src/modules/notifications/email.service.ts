import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EsimEmailData {
  orderId: string;
  country: string;
  dataAmount: string;
  iccid?: string;
  qrCode?: string;
  activationCode?: string;
  price: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
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
      this.logger.log('✅ Email service initialized');
    } else {
      this.logger.warn('⚠️ SMTP not configured — email notifications disabled');
    }
  }

  async sendEsimReady(to: string, data: EsimEmailData) {
    if (!this.transporter || !to) return;

    const from = this.configService.get('SMTP_FROM') || 'noreply@mojomobile.ru';

    const qrSection = data.qrCode
      ? `<div style="text-align:center;margin:24px 0">
           <img src="${data.qrCode}" alt="QR код" style="width:200px;height:200px;border-radius:12px;border:2px solid #f77430"/>
         </div>`
      : '';

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#f77430,#f29b41);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700">✅ eSIM готова!</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px">Ваша eSIM активирована и готова к использованию</p>
    </div>
    <div style="padding:32px">
      <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;color:#636567;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Страна</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#2f2f2f">${data.country}</p>
      </div>
      <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;color:#636567;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Трафик</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#2f2f2f">${data.dataAmount}</p>
      </div>
      ${data.iccid ? `
      <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;color:#636567;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">ICCID</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#2f2f2f;font-family:monospace">${data.iccid}</p>
      </div>` : ''}
      ${data.activationCode ? `
      <div style="background:#fff3e0;border:1px solid #f77430;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 8px;color:#636567;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Код активации (LPA)</p>
        <p style="margin:0;font-size:13px;font-weight:600;color:#f2622a;word-break:break-all;font-family:monospace">${data.activationCode}</p>
      </div>` : ''}
      ${qrSection}
      <p style="color:#636567;font-size:13px;text-align:center;margin:0 0 24px">
        Отсканируйте QR-код в настройках телефона → Мобильные данные → Добавить тариф
      </p>
      <a href="https://mojomobile.ru/my-esim" style="display:block;background:linear-gradient(135deg,#f77430,#f29b41);color:#fff;text-align:center;padding:16px;border-radius:14px;text-decoration:none;font-weight:700;font-size:16px">
        Открыть в Mojo mobile
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #eceef2;text-align:center">
      <p style="margin:0;color:#8f9599;font-size:12px">Mojo mobile · eSIM для путешествий · mojomobile.ru</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: `"Mojo mobile" <${from}>`,
        to,
        subject: `✅ Ваша eSIM готова — ${data.country}`,
        html,
      });
      this.logger.log(`✅ Email sent to ${to}`);
    } catch (e: any) {
      this.logger.error(`❌ Email send failed: ${e.message}`);
    }
  }
}
