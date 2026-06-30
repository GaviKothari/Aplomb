import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveStatus, LeaveType } from '@prisma/client';

const ANNUAL_ALLOCATIONS: Record<LeaveType, number> = {
  ANNUAL: 18,
  SICK: 10,
  CASUAL: 6,
  COMPENSATORY: 0,
  UNPAID: 365,
  MATERNITY: 90,
  PATERNITY: 15,
};

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    status?: string;
    employeeId?: string;
    leaveType?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status as LeaveStatus;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.leaveType) where.leaveType = query.leaveType as LeaveType;

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findMy(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) return { requests: [], balance: [] };

    const [requests, balance] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveBalance.findMany({
        where: { employeeId: employee.id, year: new Date().getFullYear() },
        orderBy: { leaveType: 'asc' },
      }),
    ]);

    return { requests, balance };
  }

  async getBalance(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) return [];

    const year = new Date().getFullYear();
    let balance = await this.prisma.leaveBalance.findMany({
      where: { employeeId: employee.id, year },
    });

    // Auto-create balance records if missing
    if (balance.length === 0) {
      const types: LeaveType[] = ['ANNUAL', 'SICK', 'CASUAL', 'COMPENSATORY'];
      await Promise.all(
        types.map((leaveType) =>
          this.prisma.leaveBalance.upsert({
            where: { employeeId_year_leaveType: { employeeId: employee.id, year, leaveType } },
            create: {
              employeeId: employee.id,
              year,
              leaveType,
              totalDays: ANNUAL_ALLOCATIONS[leaveType],
              usedDays: 0,
              pendingDays: 0,
              remainingDays: ANNUAL_ALLOCATIONS[leaveType],
            },
            update: {},
          }),
        ),
      );
      balance = await this.prisma.leaveBalance.findMany({ where: { employeeId: employee.id, year } });
    }

    return balance;
  }

  async apply(userId: string, dto: {
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) throw new BadRequestException('No employee record found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date must be after start date');

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check balance for non-unpaid leave
    if (dto.leaveType !== 'UNPAID') {
      const year = start.getFullYear();
      const balance = await this.prisma.leaveBalance.findUnique({
        where: { employeeId_year_leaveType: { employeeId: employee.id, year, leaveType: dto.leaveType } },
      });
      if (balance && balance.remainingDays < days) {
        throw new BadRequestException(`Insufficient leave balance. Available: ${balance.remainingDays} day(s)`);
      }
    }

    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: dto.leaveType,
        startDate: start,
        endDate: end,
        totalDays: days,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
      },
    });

    // Reserve pending days in balance
    await this.prisma.leaveBalance.updateMany({
      where: {
        employeeId: employee.id,
        year: start.getFullYear(),
        leaveType: dto.leaveType,
      },
      data: {
        pendingDays: { increment: days },
        remainingDays: { decrement: days },
      },
    });

    return request;
  }

  async approve(id: string, approverId: string, note?: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.status !== LeaveStatus.PENDING)
      throw new BadRequestException('Only pending requests can be approved');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: approverId,
        approvalNote: note ?? null,
        approvedAt: new Date(),
      },
    });

    // Convert pending → used
    await this.prisma.leaveBalance.updateMany({
      where: {
        employeeId: req.employeeId,
        year: req.startDate.getFullYear(),
        leaveType: req.leaveType,
      },
      data: {
        pendingDays: { decrement: req.totalDays },
        usedDays: { increment: req.totalDays },
      },
    });

    return updated;
  }

  async reject(id: string, approverId: string, note: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.status !== LeaveStatus.PENDING)
      throw new BadRequestException('Only pending requests can be rejected');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: approverId,
        approvalNote: note,
        approvedAt: new Date(),
      },
    });

    // Restore pending → remaining
    await this.prisma.leaveBalance.updateMany({
      where: {
        employeeId: req.employeeId,
        year: req.startDate.getFullYear(),
        leaveType: req.leaveType,
      },
      data: {
        pendingDays: { decrement: req.totalDays },
        remainingDays: { increment: req.totalDays },
      },
    });

    return updated;
  }

  async cancel(id: string, userId: string) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Leave request not found');

    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee || req.employeeId !== employee.id)
      throw new BadRequestException('You can only cancel your own requests');
    if (req.status === LeaveStatus.APPROVED)
      throw new BadRequestException('Cannot cancel an already-approved request — contact HR');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
    });

    // Restore balance
    if (req.status === LeaveStatus.PENDING) {
      await this.prisma.leaveBalance.updateMany({
        where: {
          employeeId: req.employeeId,
          year: req.startDate.getFullYear(),
          leaveType: req.leaveType,
        },
        data: {
          pendingDays: { decrement: req.totalDays },
          remainingDays: { increment: req.totalDays },
        },
      });
    }

    return updated;
  }
}
