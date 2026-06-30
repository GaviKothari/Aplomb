import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import axios from 'axios';

const DOC_FIELD_MAP: Record<string, string> = {
  aadhaar:       'aadhaarS3Key',
  pan:           'panS3Key',
  drivingLicense:'drivingLicenseS3Key',
  agreement:     'agreementS3Key',
  photo:         'photoS3Key',
};

// ── Clerk API helper ────────────────────────────────────────────────────────────

async function clerkRequest<T = any>(
  secretKey: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data?: any,
): Promise<T> {
  const res = await axios.request<T>({
    method,
    url: `https://api.clerk.com/v1${path}`,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    data,
  });
  return res.data;
}

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  // ── Clerk helpers ───────────────────────────────────────────────────────────

  private get clerkSecret(): string {
    return this.config.get<string>('clerk.secretKey') ?? '';
  }

  private get resendApiKey(): string {
    return this.config.get<string>('email.resendApiKey') ?? '';
  }

  private get emailFrom(): string {
    return this.config.get<string>('email.from') || 'onboarding@resend.dev';
  }

  /**
   * Create a Clerk invitation and immediately send a login-credential email
   * via Resend. Clerk's own email delivery is unreliable / goes to spam —
   * we use the `url` in the Clerk API response to build our own email.
   */
  private async sendClerkInvitation(
    email: string,
    role: string,
    name?: string,
  ): Promise<{ success: boolean; invitationId?: string; invitationUrl?: string; error?: string }> {
    if (!this.clerkSecret) {
      this.logger.warn('CLERK_SECRET_KEY not set — skipping invitation');
      return { success: false, error: 'CLERK_SECRET_KEY not configured' };
    }
    try {
      const res = await clerkRequest<{ id: string; url?: string }>(
        this.clerkSecret,
        'POST',
        '/invitations',
        { email_address: email, public_metadata: { role } },
      );
      this.logger.log(`Clerk invitation created for ${email} (id=${res.id})`);

      // Send our own email via Resend — more reliable than Clerk's built-in delivery
      if (res.url) {
        await this.sendInvitationEmail(email, name ?? email, role, res.url).catch(e =>
          this.logger.error(`Resend invite email failed for ${email}: ${e.message}`),
        );
      }

      return { success: true, invitationId: res.id, invitationUrl: res.url };
    } catch (e: any) {
      const errBody = e.response?.data;
      const msg: string =
        errBody?.errors?.[0]?.long_message ??
        errBody?.errors?.[0]?.message ??
        e.message;

      // Clerk 422 duplicate_record — invitation already pending, treat as success
      const isDuplicate =
        errBody?.errors?.[0]?.code === 'duplicate_record' ||
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('duplicate');
      if (e.response?.status === 422 && isDuplicate) {
        this.logger.log(`Clerk invitation already pending for ${email}`);
        return { success: true };
      }

      this.logger.error(
        `Clerk invitation failed for ${email}: ${JSON.stringify(errBody ?? msg)}`,
      );
      return { success: false, error: msg };
    }
  }

  /** Send the "You're invited to APLOMB" email via Resend with the Clerk sign-up link. */
  private async sendInvitationEmail(
    to: string,
    name: string,
    role: string,
    invitationUrl: string,
  ): Promise<void> {
    if (!this.resendApiKey) {
      this.logger.warn('RESEND_API_KEY not set — skipping invitation email');
      return;
    }

    const roleName: Record<string, string> = {
      ENGINEER: 'Site Engineer', COORDINATOR: 'Coordinator', VERIFIER: 'Verifier',
      REPORT_MAKER: 'Report Maker', FINALIZER: 'Finalizer', ACCOUNTS: 'Accounts',
      HR: 'HR', MIS_EXECUTIVE: 'MIS Executive', VIEWER: 'Viewer', ADMIN: 'Admin',
    };
    const displayRole = roleName[role] ?? role;
    const firstName   = name.split(' ')[0];

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
      <tr>
        <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:36px 40px">
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px">APLOMB</h1>
          <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px">Property Intelligence Platform</p>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px">
          <p style="color:#1e293b;font-size:16px;margin:0 0 12px;font-weight:600">Hi ${firstName} 👋</p>
          <p style="color:#475569;font-size:15px;line-height:1.65;margin:0 0 24px">
            You've been added to APLOMB as a <strong style="color:#1e293b">${displayRole}</strong>.
            Click the button below to set up your account and create your password.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr>
              <td style="background:#2563eb;border-radius:10px">
                <a href="${invitationUrl}"
                   style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px">
                  Set Up My Account →
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#94a3b8;font-size:12px;margin:0 0 8px">Or copy this link into your browser:</p>
          <p style="color:#3b82f6;font-size:12px;word-break:break-all;margin:0 0 28px">${invitationUrl}</p>
          <div style="background:#f8fafc;border-radius:10px;padding:16px 20px">
            <p style="color:#64748b;font-size:13px;margin:0 0 4px">Once set up, you can log in at:</p>
            <a href="https://app.aplomb.in" style="color:#2563eb;font-size:13px;font-weight:600;text-decoration:none">https://app.aplomb.in</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
          <p style="color:#cbd5e1;font-size:11px;margin:0">This link is valid for 30 days. If you didn't expect this email, you can ignore it.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    await axios.post(
      'https://api.resend.com/emails',
      {
        from: this.emailFrom,
        to:   [to],
        subject: `You're invited to APLOMB — set up your account`,
        html,
      },
      { headers: { Authorization: `Bearer ${this.resendApiKey}`, 'Content-Type': 'application/json' } },
    );
    this.logger.log(`Invitation email sent via Resend to ${to}`);
  }

  /** Revoke all pending Clerk invitations for an email so a fresh one can be sent. */
  private async revokeExistingInvitations(email: string): Promise<void> {
    if (!this.clerkSecret) return;
    try {
      const res = await clerkRequest<{ data: Array<{ id: string; email_address: string }> }>(
        this.clerkSecret, 'GET', '/invitations?status=pending',
      );
      const matching = (res.data ?? []).filter(
        inv => inv.email_address.toLowerCase() === email.toLowerCase(),
      );
      await Promise.all(
        matching.map(inv =>
          clerkRequest(this.clerkSecret, 'POST', `/invitations/${inv.id}/revoke`).catch(() => {}),
        ),
      );
      if (matching.length) this.logger.log(`Revoked ${matching.length} pending invitation(s) for ${email}`);
    } catch (e: any) {
      this.logger.warn(`Could not revoke invitations for ${email}: ${e.message}`);
    }
  }

  /** Update Clerk public_metadata when role changes. */
  private async syncRoleToClerk(clerkId: string, role: string): Promise<void> {
    if (!this.clerkSecret) return;
    try {
      await clerkRequest(this.clerkSecret, 'PATCH', `/users/${clerkId}/metadata`, {
        public_metadata: { role },
      });
      this.logger.log(`Clerk metadata synced for ${clerkId}: role=${role}`);
    } catch (e: any) {
      this.logger.error(`Failed to sync Clerk metadata for ${clerkId}: ${e.message}`);
    }
  }

  /** Ban a Clerk user — prevents login immediately. */
  private async banClerkUser(clerkId: string): Promise<void> {
    await clerkRequest(this.clerkSecret, 'POST', `/users/${clerkId}/ban`);
    this.logger.log(`Clerk user banned: ${clerkId}`);
  }

  /** Re-enable a banned Clerk user. */
  private async unbanClerkUser(clerkId: string): Promise<void> {
    await clerkRequest(this.clerkSecret, 'POST', `/users/${clerkId}/unban`);
    this.logger.log(`Clerk user unbanned: ${clerkId}`);
  }

  // ── Employee creation ───────────────────────────────────────────────────────

  async create(dto: any, _createdById: string) {
    const code = await this.generateEmployeeCode();

    let userId    = dto.userId as string | undefined;
    let userEmail = dto.email as string;
    let userRole  = dto.role ?? 'ENGINEER';
    let userName  = dto.name as string | undefined;

    if (!userId) {
      if (!dto.email || !dto.name) {
        throw new BadRequestException('email and name are required');
      }

      let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

      if (user) {
        const already = await this.prisma.employee.findUnique({ where: { userId: user.id } });
        if (already) throw new BadRequestException('This user already has an employee record');

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            role:  dto.role  ?? user.role,
            name:  dto.name  ?? user.name,
            phone: dto.phone ?? user.phone ?? null,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email:    dto.email,
            name:     dto.name,
            role:     dto.role ?? 'ENGINEER',
            phone:    dto.phone ?? null,
            isActive: true,
          },
        });
      }

      userId    = user.id;
      userEmail = user.email;
      userRole  = (user as any).role;
      userName  = (user as any).name ?? userName;
    }

    const inviteResult = await this.sendClerkInvitation(userEmail, userRole, userName);

    const employee = await this.prisma.employee.create({
      data: {
        employeeCode:    code,
        department:      dto.department,
        designation:     dto.designation,
        reportingTo:     dto.reportingTo ?? null,
        joinDate:        new Date(dto.joinDate),
        employmentType:  dto.employmentType ?? 'FULL_TIME',
        basicSalary:     dto.basicSalary ? parseFloat(String(dto.basicSalary)) : null,
        hra:             dto.hra         ? parseFloat(String(dto.hra))         : null,
        otherAllowances: dto.otherAllowances ? parseFloat(String(dto.otherAllowances)) : null,
        pfEnabled:       dto.pfEnabled  ?? false,
        esiEnabled:      dto.esiEnabled ?? false,
        invitationStatus: inviteResult.success ? 'SENT' : 'FAILED',
        invitationSentAt: inviteResult.success ? new Date() : null,
        user: { connect: { id: userId } },
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, role: true,
            phone: true, avatarUrl: true, clerkId: true,
          },
        },
      },
    });

    // Fire-and-forget in-app / SMS welcome
    this.sendWelcome(employee).catch(() => null);

    return {
      ...employee,
      clerkInviteSent:  inviteResult.success,
      clerkInviteError: inviteResult.error,
    };
  }

  // ── Invitation management ───────────────────────────────────────────────────

  async resendInvitation(employeeId: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { id: true, email: true, role: true, clerkId: true, name: true } },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const user = emp.user as any;

    // If already has a Clerk account, they don't need an invitation
    if (user.clerkId) {
      return {
        sent:   false,
        reason: 'Employee already has a Clerk account. They can reset their password at app.aplomb.in.',
      };
    }

    // Revoke any pending invitation first so Clerk doesn't reject as duplicate
    await this.revokeExistingInvitations(user.email);

    const inviteResult = await this.sendClerkInvitation(user.email, user.role, user.name);

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        invitationStatus: inviteResult.success ? 'SENT' : 'FAILED',
        invitationSentAt: inviteResult.success ? new Date() : undefined,
      },
    });

    return { sent: inviteResult.success, to: user.email, error: inviteResult.error };
  }

  async resendWelcome(employeeId: string) {
    return this.resendInvitation(employeeId);
  }

  // ── Suspend / unsuspend ─────────────────────────────────────────────────────

  async suspend(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      select: { userId: true, user: { select: { clerkId: true } } },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const clerkId = (emp.user as any)?.clerkId as string | null;

    if (clerkId) {
      try { await this.banClerkUser(clerkId); } catch (e: any) {
        this.logger.error(`Clerk ban failed for ${clerkId}: ${e.message}`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: emp.userId }, data: { isActive: false } }),
      this.prisma.employee.update({ where: { id }, data: { employeeStatus: 'SUSPENDED' } }),
    ]);

    return { success: true, clerkBanned: !!clerkId };
  }

  async activate(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      select: { userId: true, user: { select: { clerkId: true } } },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const clerkId = (emp.user as any)?.clerkId as string | null;

    if (clerkId) {
      try { await this.unbanClerkUser(clerkId); } catch (e: any) {
        this.logger.error(`Clerk unban failed for ${clerkId}: ${e.message}`);
      }
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: emp.userId }, data: { isActive: true } }),
      this.prisma.employee.update({ where: { id }, data: { employeeStatus: 'ACTIVE' } }),
    ]);

    return { success: true };
  }

  // kept for backward compat
  async deactivate(id: string) { return this.suspend(id); }

  // ── List / find ─────────────────────────────────────────────────────────────

  async findAll(query: {
    search?: string; department?: string;
    page?: number; limit?: number;
  }) {
    const { search, department } = query;
    const page  = Math.max(1, Number(query.page  ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 20)));
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (department && department !== 'all') where.department = department;
    if (search) {
      where.OR = [
        { user: { name:       { contains: search, mode: 'insensitive' } } },
        { user: { email:      { contains: search, mode: 'insensitive' } } },
        { employeeCode:       { contains: search, mode: 'insensitive' } },
        { designation:        { contains: search, mode: 'insensitive' } },
        { department:         { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true, name: true, email: true, role: true,
              avatarUrl: true, phone: true, isActive: true,
              clerkId: true, lastLoginAt: true,
            },
          },
          _count: { select: { attendanceRecords: true } },
        },
        orderBy: [{ user: { isActive: 'desc' } }, { user: { name: 'asc' } }],
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        leaveBalance: true,
        attendanceRecords: { take: 60, orderBy: { date: 'desc' } },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: any) {
    const { name, email, role, phone, isActive, ...employeeData } = dto;

    const emp = await this.prisma.employee.findUnique({
      where: { id },
      select: { userId: true, user: { select: { role: true, clerkId: true } } },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const userUpdate: any = {};
    if (name     !== undefined) userUpdate.name     = name;
    if (email    !== undefined) userUpdate.email    = email;
    if (role     !== undefined) userUpdate.role     = role;
    if (phone    !== undefined) userUpdate.phone    = phone;
    if (isActive !== undefined) userUpdate.isActive = isActive;

    const [updatedEmp] = await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { id },
        data: {
          ...employeeData,
          joinDate:         employeeData.joinDate         ? new Date(employeeData.joinDate)         : undefined,
          confirmationDate: employeeData.confirmationDate ? new Date(employeeData.confirmationDate) : undefined,
          basicSalary:      employeeData.basicSalary      !== undefined ? parseFloat(String(employeeData.basicSalary))      : undefined,
          hra:              employeeData.hra              !== undefined ? parseFloat(String(employeeData.hra))              : undefined,
          otherAllowances:  employeeData.otherAllowances  !== undefined ? parseFloat(String(employeeData.otherAllowances))  : undefined,
        },
        include: {
          user: {
            select: {
              id: true, name: true, email: true, role: true,
              phone: true, avatarUrl: true, isActive: true, clerkId: true,
            },
          },
        },
      }),
      ...(Object.keys(userUpdate).length > 0
        ? [this.prisma.user.update({ where: { id: emp.userId }, data: userUpdate })]
        : []),
    ]);

    // Sync role change to Clerk metadata
    const prevRole = (emp.user as any)?.role;
    const clerkId  = (emp.user as any)?.clerkId as string | null;
    if (role && role !== prevRole && clerkId) {
      this.syncRoleToClerk(clerkId, role).catch(() => null);
    }

    return updatedEmp;
  }

  // ── Attendance / counts ─────────────────────────────────────────────────────

  async getAttendanceSummary(id: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month,     0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { employeeId: id, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    return {
      records,
      summary: {
        total:          records.length,
        present:        records.filter(r => r.status === 'PRESENT').length,
        absent:         records.filter(r => r.status === 'ABSENT').length,
        leave:          records.filter(r => r.status === 'LEAVE').length,
        halfDay:        records.filter(r => r.status === 'HALF_DAY').length,
        totalWorkHours: records.reduce((s, r) => s + Number(r.workHours || 0), 0),
      },
    };
  }

  async getCaseCount(userId: string) {
    const [total, completed] = await Promise.all([
      this.prisma.case.count({ where: { engineerId: userId } }),
      this.prisma.case.count({
        where: { engineerId: userId, status: { in: ['SENT_TO_BANK', 'FINALIZED', 'CLOSED'] } },
      }),
    ]);
    return { total, completed };
  }

  // ── Documents ───────────────────────────────────────────────────────────────

  async uploadDocument(id: string, file: Express.Multer.File, docType: string) {
    const field = DOC_FIELD_MAP[docType];
    if (!field) throw new BadRequestException(`Unknown document type: ${docType}`);

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const key = `employees/${id}/${docType}-${Date.now()}.${ext}`;
    await this.storage.upload(key, file.buffer, file.mimetype);
    await this.prisma.employee.update({ where: { id }, data: { [field]: key } });
    return { key, url: this.storage.getPublicUrl(key) };
  }

  async deleteDocument(id: string, docType: string) {
    const field = DOC_FIELD_MAP[docType];
    if (!field) throw new BadRequestException(`Unknown document type: ${docType}`);

    const emp = await this.prisma.employee.findUnique({ where: { id }, select: { [field]: true } });
    if (!emp) throw new NotFoundException('Employee not found');

    const key = (emp as any)[field] as string | null;
    if (key) await this.storage.delete(key);
    await this.prisma.employee.update({ where: { id }, data: { [field]: null } });
    return { success: true };
  }

  async getDocumentUrls(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      select: {
        aadhaarS3Key: true, panS3Key: true, drivingLicenseS3Key: true,
        agreementS3Key: true, photoS3Key: true,
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const result: Record<string, string | null> = {};
    for (const [type, field] of Object.entries(DOC_FIELD_MAP)) {
      const key = (emp as any)[field] as string | null;
      result[type] = key ? this.storage.getPublicUrl(key) : null;
    }
    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async sendWelcome(employee: any) {
    const { user, employeeCode, designation, department } = employee;
    const name     = user.name ?? 'Team member';
    const loginUrl = 'https://app.aplomb.in';

    await this.notifications.send({
      userId: user.id,
      title:  `Welcome to APLOMB, ${name.split(' ')[0]}!`,
      body: [
        `Hi ${name}, you've been added to the APLOMB platform.`,
        `Employee ID: ${employeeCode}`,
        designation ? `Role: ${designation}${department ? ' · ' + department : ''}` : '',
        `Check your email for a login invitation from Clerk, then sign in at: ${loginUrl}`,
      ].filter(Boolean).join('\n'),
      type:     'WELCOME',
      channels: ['IN_APP', 'SMS'],
    });
  }

  private async generateEmployeeCode(): Promise<string> {
    const count = await this.prisma.employee.count();
    return `APL${String(count + 1).padStart(4, '0')}`;
  }
}
