import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, CaseStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvoice(organizationId: string, periodStart: string, periodEnd: string, userId: string) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Find all finalized cases in period for this org
    const cases = await this.prisma.case.findMany({
      where: {
        organizationId,
        status: { in: [CaseStatus.FINALIZED, CaseStatus.SENT_TO_BANK, CaseStatus.CLOSED] },
        updatedAt: { gte: start, lte: end },
        invoiceItems: { none: {} }, // not yet invoiced
      },
      include: {
        organization: { include: { rateCards: { where: { isActive: true } } } },
      },
    });

    if (cases.length === 0) {
      throw new NotFoundException('No uninvoiced cases found for this period');
    }

    let subtotal = 0;
    const lineItems = cases.map((c) => {
      const rate = c.organization.rateCards.find((r) => r.propertyType === c.propertyType);
      const amount = Number(rate?.rateAmount || 2500); // default ₹2500 if no rate
      subtotal += amount;
      return {
        caseId: c.id,
        description: `Valuation: ${c.caseNumber} — ${c.propertyAddress}`,
        unitPrice: amount,
        quantity: 1,
        amount,
      };
    });

    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = await this.generateInvoiceNumber();

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        organizationId,
        periodStart: start,
        periodEnd: end,
        subtotal,
        taxAmount,
        totalAmount,
        dueDate,
        generatedById: userId,
        lineItems: { createMany: { data: lineItems } },
      },
      include: { lineItems: { include: { case: true } }, organization: true },
    });

    return invoice;
  }

  async findAll(query: { organizationId?: string; status?: InvoiceStatus; page?: number; limit?: number }) {
    const { organizationId, status, page = 1, limit = 20 } = query;
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { name: true } },
          _count: { select: { lineItems: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: { include: { case: true } }, organization: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async recordPayment(invoiceId: string, amount: number, paymentDate: string, mode: string, reference: string, userId: string) {
    const invoice = await this.findOne(invoiceId);
    const newPaid = Number(invoice.paidAmount) + amount;
    const status = newPaid >= Number(invoice.totalAmount) ? 'COMPLETE' : 'PARTIAL';

    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId,
          amount,
          paymentDate: new Date(paymentDate),
          paymentMode: mode,
          referenceNumber: reference,
          recordedById: userId,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: { increment: amount },
          paymentStatus: status as any,
          status: status === 'COMPLETE' ? InvoiceStatus.PAID : undefined,
          paidAt: status === 'COMPLETE' ? new Date() : undefined,
        },
      }),
    ]);

    return { success: true, status };
  }

  async getOutstanding() {
    return this.prisma.invoice.groupBy({
      by: ['organizationId'],
      where: { paymentStatus: { not: 'COMPLETE' } },
      _sum: { totalAmount: true, paidAmount: true },
    });
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const prefix = `INV/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/`;
    const count = await this.prisma.invoice.count({ where: { invoiceNumber: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }
}
