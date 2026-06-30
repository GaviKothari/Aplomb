import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseStatus } from '@prisma/client';

@Injectable()
export class TravelService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    employeeId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    limit?: string;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status as ExpenseStatus;
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.travelExpense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      }),
      this.prisma.travelExpense.count({ where }),
    ]);

    const stats = await this.prisma.travelExpense.aggregate({
      where,
      _sum: { amount: true, distanceKm: true },
      _count: { id: true },
    });

    return { data, total, page, limit, stats };
  }

  async findMy(userId: string, query: { status?: string; month?: string }) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) return { data: [], total: 0, stats: null };

    const where: any = { employeeId: employee.id };
    if (query.status) where.status = query.status as ExpenseStatus;
    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      where.date = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0),
      };
    }

    const [data, stats] = await Promise.all([
      this.prisma.travelExpense.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { travelLog: { select: { startAddress: true, endAddress: true, vehicleType: true } } },
      }),
      this.prisma.travelExpense.aggregate({
        where,
        _sum: { amount: true, distanceKm: true },
        _count: { id: true },
      }),
    ]);

    return { data, total: data.length, stats };
  }

  async submit(userId: string, dto: {
    date: string;
    distanceKm: number;
    description?: string;
  }) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!employee) throw new BadRequestException('No employee record linked to this user');

    const ratePerKm = 8; // ₹8/km fixed rate
    const amount = dto.distanceKm * ratePerKm;

    return this.prisma.travelExpense.create({
      data: {
        employeeId: employee.id,
        date: new Date(dto.date),
        distanceKm: dto.distanceKm,
        ratePerKm,
        amount,
        description: dto.description ?? null,
        status: ExpenseStatus.PENDING,
      },
    });
  }

  async approve(id: string, approverId: string) {
    const expense = await this.prisma.travelExpense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.status !== ExpenseStatus.PENDING)
      throw new BadRequestException('Only pending expenses can be approved');

    return this.prisma.travelExpense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, approverId: string, reason: string) {
    const expense = await this.prisma.travelExpense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.status !== ExpenseStatus.PENDING)
      throw new BadRequestException('Only pending expenses can be rejected');

    return this.prisma.travelExpense.update({
      where: { id },
      data: {
        status: ExpenseStatus.REJECTED,
        approvedById: approverId,
        approvalNote: reason,
        approvedAt: new Date(),
      },
    });
  }
}
