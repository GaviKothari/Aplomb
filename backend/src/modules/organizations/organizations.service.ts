import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({ data: dto });
  }

  async findAll(query: { search?: string; type?: string; page?: number; limit?: number }) {
    const { search, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { cases: true } },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        rateCards: { where: { isActive: true } },
        _count: { select: { cases: true, invoices: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: Partial<CreateOrganizationDto>) {
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async upsertRateCard(orgId: string, propertyType: string, rateAmount: number) {
    return this.prisma.rateCard.upsert({
      where: {
        organizationId_propertyType_effectiveFrom: {
          organizationId: orgId,
          propertyType: propertyType as any,
          effectiveFrom: new Date(new Date().toDateString()),
        },
      },
      update: { rateAmount },
      create: { organizationId: orgId, propertyType: propertyType as any, rateAmount },
    });
  }
}
