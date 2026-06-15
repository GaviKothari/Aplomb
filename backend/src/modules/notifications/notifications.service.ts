import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../gateways/events.gateway';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailer: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventsGateway,
  ) {
    // Use Resend SMTP (cost-free tier)
    this.mailer = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: this.config.get('email.resendApiKey') || 'placeholder',
      },
    });
  }

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
      await this.sendEmail(user.email, title, body).catch((e) =>
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

  private async sendEmail(to: string, subject: string, text: string) {
    await this.mailer.sendMail({
      from: this.config.get('email.from'),
      to,
      subject,
      text,
      html: `<p>${text}</p>`,
    });
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
