import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../gateways/events.gateway';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventsGateway,
  ) {}

  async send(params: {
    userId: string;
    title: string;
    body: string;
    type: string;
    entityType?: string;
    entityId?: string;
    channels?: string[];
  }) {
    const { userId, title, body, type, entityType, entityId, channels = ['IN_APP'] } = params;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Create in-app notification
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type, entityType, entityId, channel: 'IN_APP' },
    });

    // Push to WebSocket
    this.events.emitNotification(userId, notification);

    // Email
    if (channels.includes('EMAIL') && user.email) {
      await this.sendEmail(user.email, title, body, type).catch((e) =>
        this.logger.error(`Email failed: ${e.message}`),
      );
    }

    // SMS (MSG91 — India)
    if (channels.includes('SMS') && user.phone) {
      await this.sendSms(user.phone, body).catch((e) =>
        this.logger.error(`SMS failed: ${e.message}`),
      );
    }

    return notification;
  }

  async notifyCaseAssigned(caseId: string, engineerId: string, coordinatorName: string) {
    const c = await this.prisma.case.findUnique({ where: { id: caseId } });
    return this.send({
      userId: engineerId,
      title: 'New Case Assigned',
      body: `${c.caseNumber} — ${c.propertyAddress} has been assigned to you by ${coordinatorName}.`,
      type: 'CASE_ASSIGNED',
      entityType: 'CASE',
      entityId: caseId,
      channels: ['IN_APP', 'EMAIL', 'SMS'],
    });
  }

  async notifyVerificationDecision(caseId: string, engineerId: string, decision: string, comment: string) {
    return this.send({
      userId: engineerId,
      title: `Report ${decision}`,
      body: comment || `Your report for case ${caseId} has been ${decision.toLowerCase()}.`,
      type: `REPORT_${decision}`,
      entityType: 'CASE',
      entityId: caseId,
      channels: ['IN_APP', 'EMAIL'],
    });
  }

  async notifyTatBreach(caseId: string, coordinatorId: string) {
    const c = await this.prisma.case.findUnique({ where: { id: caseId } });
    return this.send({
      userId: coordinatorId,
      title: '⚠️ TAT Breach Alert',
      body: `Case ${c.caseNumber} has breached SLA deadline. Immediate action required.`,
      type: 'TAT_BREACH',
      entityType: 'CASE',
      entityId: caseId,
      channels: ['IN_APP', 'EMAIL', 'SMS'],
    });
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { data, total, unread, page };
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private async sendEmail(to: string, subject: string, text: string, type?: string) {
    const html = type === 'WELCOME'
      ? this.welcomeHtml(subject, text)
      : `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
           <p style="color:#1e293b;font-size:15px;line-height:1.6">${text.replace(/\n/g, '<br>')}</p>
           <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
           <p style="color:#94a3b8;font-size:12px">APLOMB Property Intelligence Platform</p>
         </div>`;

    const apiKey = this.config.get('email.resendApiKey');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — skipping email');
      return;
    }

    const from = this.config.get<string>('email.from') || 'onboarding@resend.dev';
    try {
      const res = await axios.post(
        'https://api.resend.com/emails',
        { from, to: [to], subject, text, html },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
      );
      this.logger.log(`Email sent: id=${res.data?.id} to=${to}`);
    } catch (e: any) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      throw new Error(`Resend ${e.response?.status ?? 'ERR'}: ${detail}`);
    }
  }

  private welcomeHtml(_subject: string, text: string): string {
    const lines = text.split('\n').filter(Boolean);
    const [greeting, ...details] = lines;
    return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;text-align:center">
        <p style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">APLOMB</p>
        <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px">Property Intelligence Platform</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px">
        <p style="margin:0 0 16px;color:#0f172a;font-size:18px;font-weight:600">${greeting}</p>
        ${details.map(d => `<p style="margin:8px 0;color:#475569;font-size:14px;line-height:1.6">${d}</p>`).join('')}
        <div style="margin:28px 0;text-align:center">
          <a href="https://app.aplomb.in" style="display:inline-block;padding:12px 28px;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">
            Log in to APLOMB →
          </a>
        </div>
        <p style="margin:0;color:#94a3b8;font-size:12px">If you weren't expecting this, please contact your administrator.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f1f5f9;padding:16px 40px;text-align:center">
        <p style="margin:0;color:#94a3b8;font-size:11px">© ${new Date().getFullYear()} APLOMB · noreply@aplomb.in</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  }

  private async sendSms(phone: string, message: string) {
    const authKey = this.config.get('sms.msg91AuthKey');
    if (!authKey) return;

    await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      {
        template_id: 'APLOMB_NOTIFICATION',
        recipients: [{ mobiles: phone.replace(/\D/g, ''), message }],
      },
      { headers: { authkey: authKey, 'Content-Type': 'application/json' } },
    );
  }
}
