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


@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: any, _createdById: string) {
    const code = await this.generateEmployeeCode();

    // Resolve or create the linked user
    let userId = dto.userId as string | undefined;

    if (!userId) {
      if (!dto.email || !dto.name) {
        throw new BadRequestException('email and name are required when userId is not provided');
      }

      let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

      if (user) {
        const already = await this.prisma.employee.findUnique({ where: { userId: user.id } });
        if (already) throw new BadRequestException('This user already has an employee record');

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            role: dto.role ?? user.role,
            name: dto.name ?? user.name,
            phone: dto.phone ?? user.phone ?? null,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: dto.email,
            name: dto.name,
            role: dto.role ?? 'ENGINEER',
            phone: dto.phone ?? null,
            isActive: true,
          },
        });
      }

      userId = user.id;
    }

    const employee = await this.prisma.employee.create({
      data: {
        employeeCode: code,
        department: dto.department,
        designation: dto.designation,
        reportingTo: dto.reportingTo ?? null,
        joinDate: new Date(dto.joinDate),
        employmentType: dto.employmentType ?? 'FULL_TIME',
        basicSalary: dto.basicSalary ? parseFloat(String(dto.basicSalary)) : null,
        hra: dto.hra ? parseFloat(String(dto.hra)) : null,
        otherAllowances: dto.otherAllowances ? parseFloat(String(dto.otherAllowances)) : null,
        pfEnabled: dto.pfEnabled ?? false,
        esiEnabled: dto.esiEnabled ?? false,
        user: { connect: { id: userId } },
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true } },
      },
    });

    // Fire-and-forget: send Clerk invite so employee can log in + in-app welcome
    const userRole = (employee as any).user?.role ?? dto.role ?? 'ENGINEER';
    this.sendClerkInvitation((employee as any).user.email, userRole).catch(() => null);
    this.sendWelcome(employee).catch(() => null);

    return employee;
  }

  async resendWelcome(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true, clerkId: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Re-send Clerk invite only if they haven't linked a Clerk account yet
    if (!(employee as any).user.clerkId) {
      await this.sendClerkInvitation((employee as any).user.email, (employee as any).user.role);
    }
    await this.sendWelcome(employee);
    return { sent: true, to: (employee as any).user.email };
  }

  private async sendClerkInvitation(email: string, role: string): Promise<void> {
    const secretKey = this.config.get<string>('clerk.secretKey');
    if (!secretKey) {
      this.logger.warn('CLERK_SECRET_KEY not set — skipping Clerk invitation');
      return;
    }
    try {
      await axios.post(
        'https://api.clerk.com/v1/invitations',
        {
          email_address: email,
          public_metadata: { role },
          redirect_url: 'https://app.aplomb.in',
          notify: true,
        },
        { headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' } },
      );
      this.logger.log(`Clerk invitation sent to ${email}`);
    } catch (e: any) {
      const msg = e.response?.data?.errors?.[0]?.long_message ?? e.response?.data?.errors?.[0]?.message ?? e.message;
      // "already invited" is not a real error — the invite already exists
      if (e.response?.status === 422 && msg?.toLowerCase().includes('already')) {
        this.logger.log(`Clerk invitation already exists for ${email}`);
      } else {
        this.logger.error(`Clerk invitation failed for ${email}: ${msg}`);
      }
    }
  }

  private async sendWelcome(employee: any) {
    const { user, employeeCode, designation, department } = employee;
    const name = user.name ?? 'Team member';
    const loginUrl = 'https://app.aplomb.in';

    await this.notifications.send({
      userId: user.id,
      title: `Welcome to APLOMB, ${name.split(' ')[0]}!`,
      body: [
        `Hi ${name}, you've been registered on the APLOMB platform.`,
        `Employee ID: ${employeeCode}`,
        designation ? `Role: ${designation}${department ? ' · ' + department : ''}` : '',
        `Check your email for a login invitation, then sign in at: ${loginUrl}`,
      ].filter(Boolean).join('\n'),
      type: 'WELCOME',
      channels: ['IN_APP', 'EMAIL', 'SMS'],
    });
  }

  async findAll(query: { search?: string; department?: string; page?: number; limit?: number }) {
    const { search, department } = query;
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (department && department !== 'all') where.department = department;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true, phone: true, isActive: true, clerkId: true } },
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
        attendanceRecords: {
          take: 60,
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  async update(id: string, dto: any) {
    const { name, email, role, phone, isActive, ...employeeData } = dto;

    // Update linked user fields if provided
    const emp = await this.prisma.employee.findUnique({ where: { id }, select: { userId: true } });
    if (!emp) throw new NotFoundException('Employee not found');

    const userUpdate: any = {};
    if (name !== undefined) userUpdate.name = name;
    if (email !== undefined) userUpdate.email = email;
    if (role !== undefined) userUpdate.role = role;
    if (phone !== undefined) userUpdate.phone = phone;
    if (isActive !== undefined) userUpdate.isActive = isActive;

    const [updatedEmp] = await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { id },
        data: {
          ...employeeData,
          joinDate: employeeData.joinDate ? new Date(employeeData.joinDate) : undefined,
          confirmationDate: employeeData.confirmationDate ? new Date(employeeData.confirmationDate) : undefined,
          basicSalary: employeeData.basicSalary !== undefined ? parseFloat(String(employeeData.basicSalary)) : undefined,
          hra: employeeData.hra !== undefined ? parseFloat(String(employeeData.hra)) : undefined,
          otherAllowances: employeeData.otherAllowances !== undefined ? parseFloat(String(employeeData.otherAllowances)) : undefined,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, isActive: true } },
        },
      }),
      ...(Object.keys(userUpdate).length > 0
        ? [this.prisma.user.update({ where: { id: emp.userId }, data: userUpdate })]
        : []),
    ]);

    return updatedEmp;
  }

  async deactivate(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id }, select: { userId: true } });
    if (!emp) throw new NotFoundException('Employee not found');
    await this.prisma.user.update({ where: { id: emp.userId }, data: { isActive: false } });
    return { success: true };
  }

  async activate(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id }, select: { userId: true } });
    if (!emp) throw new NotFoundException('Employee not found');
    await this.prisma.user.update({ where: { id: emp.userId }, data: { isActive: true } });
    return { success: true };
  }

  async getAttendanceSummary(id: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { employeeId: id, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    });

    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      leave: records.filter((r) => r.status === 'LEAVE').length,
      halfDay: records.filter((r) => r.status === 'HALF_DAY').length,
      totalWorkHours: records.reduce((sum, r) => sum + Number(r.workHours || 0), 0),
    };

    return { records, summary };
  }

  async getCaseCount(userId: string) {
    const [total, completed] = await Promise.all([
      this.prisma.case.count({ where: { engineerId: userId } }),
      this.prisma.case.count({ where: { engineerId: userId, status: { in: ['SENT_TO_BANK', 'FINALIZED', 'CLOSED'] } } }),
    ]);
    return { total, completed };
  }

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
      select: { aadhaarS3Key: true, panS3Key: true, drivingLicenseS3Key: true, agreementS3Key: true, photoS3Key: true },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const result: Record<string, string | null> = {};
    for (const [type, field] of Object.entries(DOC_FIELD_MAP)) {
      const key = (emp as any)[field] as string | null;
      result[type] = key ? this.storage.getPublicUrl(key) : null;
    }
    return result;
  }

  private async generateEmployeeCode(): Promise<string> {
    const count = await this.prisma.employee.count();
    return `APL${String(count + 1).padStart(4, '0')}`;
  }
}
