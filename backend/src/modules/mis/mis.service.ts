import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MisService {
  constructor(private readonly prisma: PrismaService) {}

  async getSnapshot() {
    const [
      totalCases, newCases, assignedCases, inProgressCases,
      completedCases, finalizedCases, onHoldCases,
      totalRevenue, avgTat,
    ] = await Promise.all([
      this.prisma.case.count(),
      this.prisma.case.count({ where: { status: 'NEW' } }),
      this.prisma.case.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.case.count({ where: { status: { in: ['SITE_VISIT_SCHEDULED', 'SITE_VISIT_IN_PROGRESS', 'SITE_VISIT_COMPLETED', 'UNDER_VERIFICATION'] } } }),
      this.prisma.case.count({ where: { status: 'SENT_TO_BANK' } }),
      this.prisma.case.count({ where: { status: 'FINALIZED' } }),
      this.prisma.case.count({ where: { status: 'ON_HOLD' } }),
      this.prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: 'PAID' } }),
      this.prisma.$queryRaw<any[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/3600) as avg_hours
        FROM cases
        WHERE status::text IN ('FINALIZED', 'SENT_TO_BANK', 'CLOSED')
      `,
    ]);

    return {
      totalCases,
      newCases,
      assignedCases,
      inProgressCases,
      completedCases,
      finalizedCases,
      onHoldCases,
      pendingVerification: inProgressCases,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      avgTatHours: Number(avgTat[0]?.avg_hours || 0).toFixed(1),
      snapshotAt: new Date(),
    };
  }

  async getBankWise(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date('2000-01-01');
    const toDate = to ? new Date(to) : new Date('2099-12-31');

    return this.prisma.$queryRaw<any[]>`
      SELECT
        o.name as bank,
        COUNT(*)::int as cases,
        SUM(CASE WHEN c.status::text IN ('SENT_TO_BANK', 'FINALIZED', 'CLOSED') THEN 1 ELSE 0 END)::int as completed
      FROM cases c
      JOIN organizations o ON c."organizationId" = o.id
      WHERE c."createdAt" BETWEEN ${fromDate} AND ${toDate}
      GROUP BY o.id, o.name
      ORDER BY cases DESC
      LIMIT 10
    `;
  }

  async getEngineerPerformance(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date('2000-01-01');
    const toDate = to ? new Date(to) : new Date('2099-12-31');

    return this.prisma.$queryRaw<any[]>`
      SELECT
        u.name as engineer,
        COUNT(*)::int as cases,
        SUM(CASE WHEN c.status::text IN ('SENT_TO_BANK', 'FINALIZED', 'CLOSED') THEN 1 ELSE 0 END)::int as completed
      FROM cases c
      JOIN users u ON c."engineerId" = u.id
      WHERE c."engineerId" IS NOT NULL
        AND c."createdAt" BETWEEN ${fromDate} AND ${toDate}
      GROUP BY u.id, u.name
      ORDER BY cases DESC
      LIMIT 8
    `;
  }

  async getRevenueTrend(months = 6) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        SUM("totalAmount") as revenue,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE "createdAt" >= NOW() - (${months} || ' months')::INTERVAL
      GROUP BY month
      ORDER BY month
    `;
    return result;
  }

  async getMonthlyCases(months = 12) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    return this.prisma.$queryRaw<any[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon ''YY') as month,
        DATE_TRUNC('month', "createdAt") as month_date,
        COUNT(*)::int as cases
      FROM cases
      WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `;
  }

  async getTatAnalysis() {
    return this.prisma.$queryRaw<any[]>`
      SELECT
        o.name as bank,
        AVG(EXTRACT(EPOCH FROM (c."updatedAt" - c."createdAt"))/3600) as avg_tat_hours,
        COUNT(*)::int as case_count,
        SUM(CASE WHEN c."slaBreach" THEN 1 ELSE 0 END)::int as breached_count
      FROM cases c
      JOIN organizations o ON c."organizationId" = o.id
      WHERE c.status::text IN ('FINALIZED', 'SENT_TO_BANK', 'CLOSED')
      GROUP BY o.id, o.name
      ORDER BY avg_tat_hours DESC
    `;
  }
}
