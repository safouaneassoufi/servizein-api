import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private from: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY')!);
    this.from = this.config.get<string>('EMAIL_FROM')!;
  }

  async sendBookingConfirmation(opts: {
    to: string;
    clientName: string;
    providerName: string;
    serviceName: string;
    scheduledDate: string;
    scheduledSlot: string;
    totalAmount: number;
    bookingId: string;
  }): Promise<void> {
    await this.resend.emails.send({
      from: this.from,
      to: opts.to,
      subject: `Réservation confirmée — ${opts.serviceName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1a1a1a">Votre réservation est confirmée ✓</h2>
          <p>Bonjour ${opts.clientName},</p>
          <p>Votre réservation a bien été confirmée avec <strong>${opts.providerName}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;border:1px solid #e5e5e5"><strong>Service</strong></td><td style="padding:8px;border:1px solid #e5e5e5">${opts.serviceName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e5e5"><strong>Date</strong></td><td style="padding:8px;border:1px solid #e5e5e5">${opts.scheduledDate}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e5e5"><strong>Heure</strong></td><td style="padding:8px;border:1px solid #e5e5e5">${opts.scheduledSlot}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e5e5"><strong>Montant total</strong></td><td style="padding:8px;border:1px solid #e5e5e5">${opts.totalAmount} MAD</td></tr>
          </table>
          <p style="color:#666;font-size:12px">Réf. réservation: ${opts.bookingId}</p>
        </div>
      `,
    });
  }
}
