import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';
import { AssignCaseDto } from './dto/assign-case.dto';
import { CaseStatus, UserRole } from '@prisma/client';
import { EventsGateway } from '../../gateways/events.gateway';

// Valid status transitions
const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  NEW: [CaseStatus.ASSIGNED, CaseStatus.ON_HOLD, CaseStatus.CLOSED],
  ASSIGNED: [CaseStatus.SITE_VISIT_SCHEDULED, CaseStatus.ON_HOLD, CaseStatus.NEW],
  SITE_VISIT_SCHEDULED: [CaseStatus.SITE_VISIT_IN_PROGRESS, CaseStatus.ON_HOLD, CaseStatus.ASSIGNED],
  SITE_VISIT_IN_PROGRESS: [CaseStatus.SITE_VISIT_COMPLETED, CaseStatus.ON_HOLD],
  SITE_VISIT_COMPLETED: [CaseStatus.UNDER_VERIFICATION, CaseStatus.ON_HOLD],
  UNDER_VERIFICATION: [CaseStatus.REVISION_REQUESTED, CaseStatus.FINALIZED, CaseStatus.ON_HOLD],
  REVISION_REQUESTED: [CaseStatus.SITE_VISIT_COMPLETED, CaseStatus.ON_HOLD],
  FINALIZED: [CaseStatus.SENT_TO_BANK],
  SENT_TO_BANK: [CaseStatus.CLOSED],
  ON_HOLD: [CaseStatus.ASSIGNED, CaseStatus.SITE_VISIT_SCHEDULED, CaseStatus.NEW],
  CLOSED: [],
};

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async create(dto: CreateCaseDto, createdById: string) {
    const caseNumber = await this.generateCaseNumber();

    // Check duplicate property in same pincode
    const existing = await this.prisma.case.findFirst({
      where: {
        propertyPincode: dto.propertyPincode,
        propertyAddress: { contains: dto.propertyAddress.split(',')[0], mode: 'insensitive' },
        status: { notIn: [CaseStatus.CLOSED] },
      },
    });
    if (existing) {
      this.logger.warn(`Possible duplicate case found: ${existing.caseNumber}`);
    }

    const newCase = await this.prisma.case.create({
      data: {
        ...dto,
        caseNumber,
        createdById,
        status: dto.engineerId ? CaseStatus.ASSIGNED : CaseStatus.NEW,
        isDuplicate: !!existing,
        duplicateOfId: existing?.id,
        latitude: dto.latitude ? dto.latitude : undefined,
        longitude: dto.longitude ? dto.longitude : undefined,
        siteVisitDate: dto.siteVisitDate ? new Date(dto.siteVisitDate) : undefined,
        slaDeadline: dto.slaDeadline ? new Date(dto.slaDeadline) : undefined,
      },
      include: this.caseInclude(),
    });

    // Log initial status
    await this.prisma.caseStatusHistory.create({
      data: {
        caseId: newCase.id,
        toStatus: newCase.status,
        changedById: createdById,
        notes: 'Case created',
      },
    });

    this.events.emitCaseUpdate(newCase.id, 'created', newCase);
    return newCase;
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string; status?: CaseStatus;
    organizationId?: string; engineerId?: string; priority?: string;
    from?: string; to?: string;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    const {
      search, status, organizationId, engineerId, priority, from, to,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = query;
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(9999, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (organizationId) where.organizationId = organizationId;
    if (engineerId) where.engineerId = engineerId;
    if (priority) where.priority = priority;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { propertyAddress: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { loanAccountNumber: { contains: search, mode: 'insensitive' } },
        { branchName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSort = ['createdAt', 'updatedAt', 'ownerName', 'status', 'branchName', 'caseNumber'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ [orderField]: order }],
        include: this.caseListInclude(),
      }),
      this.prisma.case.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const c = await this.prisma.case.findUnique({
      where: { id },
      include: this.caseInclude(),
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  async updateStatus(id: string, dto: UpdateCaseStatusDto, userId: string) {
    const c = await this.findOne(id);
    const allowed = STATUS_TRANSITIONS[c.status];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${c.status} to ${dto.status}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.case.update({
        where: { id },
        data: {
          status: dto.status,
          isOnHold: dto.status === CaseStatus.ON_HOLD,
          holdReason: dto.status === CaseStatus.ON_HOLD ? dto.reason : null,
          slaBreach: c.slaDeadline ? new Date() > c.slaDeadline : false,
        },
        include: this.caseListInclude(),
      }),
      this.prisma.caseStatusHistory.create({
        data: {
          caseId: id,
          fromStatus: c.status,
          toStatus: dto.status,
          changedById: userId,
          reason: dto.reason,
          notes: dto.notes,
        },
      }),
    ]);

    this.events.emitCaseUpdate(id, 'status_changed', {
      caseId: id,
      fromStatus: c.status,
      toStatus: dto.status,
    });

    return updated;
  }

  async assign(id: string, dto: AssignCaseDto, userId: string) {
    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        ...dto,
        status: dto.engineerId ? CaseStatus.ASSIGNED : undefined,
      },
      include: this.caseInclude(),
    });

    if (dto.engineerId) {
      await this.prisma.caseStatusHistory.create({
        data: {
          caseId: id,
          fromStatus: CaseStatus.NEW,
          toStatus: CaseStatus.ASSIGNED,
          changedById: userId,
          notes: `Assigned to engineer ${dto.engineerId}`,
        },
      });
      this.events.emitCaseUpdate(id, 'assigned', { caseId: id, engineerId: dto.engineerId });
    }

    return updated;
  }

  async getHistory(id: string) {
    return this.prisma.caseStatusHistory.findMany({
      where: { caseId: id },
      orderBy: { changedAt: 'desc' },
    });
  }

  async startSiteVisit(id: string, lat: number, lng: number, userId: string) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.case.update({
        where: { id },
        data: { status: CaseStatus.SITE_VISIT_IN_PROGRESS, siteVisitStartAt: new Date() },
      }),
      this.prisma.siteVisitLog.upsert({
        where: { caseId: id },
        update: { startLatitude: lat, startLongitude: lng, arrivalTime: new Date() },
        create: {
          caseId: id, startLatitude: lat, startLongitude: lng, arrivalTime: new Date(),
        },
      }),
      this.prisma.caseStatusHistory.create({
        data: {
          caseId: id,
          fromStatus: CaseStatus.SITE_VISIT_SCHEDULED,
          toStatus: CaseStatus.SITE_VISIT_IN_PROGRESS,
          changedById: userId,
        },
      }),
    ]);
    return updated;
  }

  async endSiteVisit(id: string, lat: number, lng: number, userId: string) {
    const log = await this.prisma.siteVisitLog.findUnique({ where: { caseId: id } });
    const now = new Date();
    const duration = log?.arrivalTime
      ? Math.floor((now.getTime() - log.arrivalTime.getTime()) / 60000)
      : 0;

    const [updated] = await this.prisma.$transaction([
      this.prisma.case.update({
        where: { id },
        data: {
          status: CaseStatus.SITE_VISIT_COMPLETED,
          siteVisitEndAt: now,
          siteVisitDuration: duration,
        },
      }),
      this.prisma.siteVisitLog.update({
        where: { caseId: id },
        data: { endLatitude: lat, endLongitude: lng, departureTime: now, durationMinutes: duration },
      }),
      this.prisma.caseStatusHistory.create({
        data: {
          caseId: id,
          fromStatus: CaseStatus.SITE_VISIT_IN_PROGRESS,
          toStatus: CaseStatus.SITE_VISIT_COMPLETED,
          changedById: userId,
        },
      }),
    ]);
    return updated;
  }

  async findNearby(lat: number, lng: number, radiusKm = 10, userId: string) {
    // PostgreSQL earth-distance calculation
    const cases = await this.prisma.$queryRaw`
      SELECT id, "caseNumber", "propertyAddress", status, priority,
        (6371 * acos(
          cos(radians(${lat})) * cos(radians(latitude::float)) *
          cos(radians(longitude::float) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude::float))
        )) AS distance_km
      FROM cases
      WHERE "engineerId" = ${userId}
        AND status NOT IN ('CLOSED', 'SENT_TO_BANK', 'FINALIZED')
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians(${lat})) * cos(radians(latitude::float)) *
          cos(radians(longitude::float) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(latitude::float))
        )) < ${radiusKm}
      ORDER BY distance_km
      LIMIT 10
    `;
    return cases;
  }

  private async generateCaseNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `APL/${year}/${month}/`;

    const lastCase = await this.prisma.case.findFirst({
      where: { caseNumber: { startsWith: prefix } },
      orderBy: { caseNumber: 'desc' },
    });

    let seq = 1;
    if (lastCase) {
      const lastSeq = parseInt(lastCase.caseNumber.split('/').pop() || '0', 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private caseListInclude() {
    return {
      organization: { select: { id: true, name: true } },
      engineer: { select: { id: true, name: true, avatarUrl: true } },
      coordinator: { select: { id: true, name: true } },
      verifier: { select: { id: true, name: true } },
      _count: { select: { media: true, documents: true } },
    };
  }

  private caseInclude() {
    return {
      ...this.caseListInclude(),
      siteVisitLog: true,
      demolitionAlerts: {
        include: { demolitionProperty: true },
      },
    };
  }
}
