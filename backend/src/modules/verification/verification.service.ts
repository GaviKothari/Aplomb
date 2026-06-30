import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VerificationDecision, CaseStatus, ReportStatus } from '@prisma/client';
import { EventsGateway } from '../../gateways/events.gateway';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async getQueue(verifierId: string) {
    return this.prisma.verification.findMany({
      where: { verifierId, decision: null },
      include: {
        case: {
          include: {
            organization: { select: { name: true } },
            engineer: { select: { name: true } },
          },
        },
        report: { select: { id: true, reportNumber: true, totalMarketValue: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async startVerification(caseId: string, reportId: string, verifierId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.SUBMITTED && report.status !== ReportStatus.UNDER_REVIEW) {
      throw new BadRequestException('Report is not in a verifiable state');
    }

    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.UNDER_REVIEW },
    });

    return this.prisma.verification.create({
      data: { caseId, reportId, verifierId },
      include: {
        report: { include: { reportFields: true } },
        case: { include: { media: true, organization: true, engineer: true } },
      },
    });
  }

  async updateField(verificationId: string, fieldKey: string, body: {
    engineerValue?: string;
    bankValue?: string;
    isMatch?: boolean;
    isAccepted?: boolean;
    comment?: string;
  }) {
    return this.prisma.verificationField.upsert({
      where: { verificationId_fieldKey: { verificationId, fieldKey } },
      update: body,
      create: { verificationId, fieldKey, ...body },
    });
  }

  async decide(verificationId: string, decision: VerificationDecision, comment: string, userId: string) {
    const verification = await this.prisma.verification.findUnique({
      where: { id: verificationId },
      include: { case: true, report: true },
    });
    if (!verification) throw new NotFoundException('Verification not found');

    const statusMap: Record<VerificationDecision, { case: CaseStatus; report: ReportStatus }> = {
      APPROVED: { case: CaseStatus.FINALIZED, report: ReportStatus.APPROVED },
      REJECTED: { case: CaseStatus.ON_HOLD, report: ReportStatus.REJECTED },
      REVISION_REQUESTED: { case: CaseStatus.REVISION_REQUESTED, report: ReportStatus.REVISION_REQUESTED },
    };

    const { case: caseStatus, report: reportStatus } = statusMap[decision];

    await this.prisma.$transaction([
      this.prisma.verification.update({
        where: { id: verificationId },
        data: { decision, overallComment: comment, verifiedAt: new Date() },
      }),
      this.prisma.report.update({
        where: { id: verification.reportId },
        data: { status: reportStatus, finalizedAt: decision === 'APPROVED' ? new Date() : null },
      }),
      this.prisma.case.update({
        where: { id: verification.caseId },
        data: { status: caseStatus },
      }),
      this.prisma.caseStatusHistory.create({
        data: {
          caseId: verification.caseId,
          fromStatus: CaseStatus.UNDER_VERIFICATION,
          toStatus: caseStatus,
          changedById: userId,
          reason: `Verification ${decision}: ${comment}`,
        },
      }),
    ]);

    this.events.emitReportUpdate(verification.caseId, decision.toLowerCase(), {
      verificationId, reportId: verification.reportId, decision,
    });

    return { success: true, decision };
  }

  async addComment(verificationId: string, authorId: string, comment: string, fieldKey?: string) {
    return this.prisma.verificationComment.create({
      data: { verificationId, authorId, comment, fieldKey },
      include: { author: { select: { name: true, role: true } } } as any,
    });
  }

  async findOne(id: string) {
    const v = await this.prisma.verification.findUnique({
      where: { id },
      include: {
        fieldVerifications: true,
        comments: true,
        report: { include: { reportFields: true, case: { include: { media: true } } } },
        verifier: { select: { id: true, name: true } },
      },
    });
    if (!v) throw new NotFoundException('Verification not found');
    return v;
  }

  async findByCase(caseId: string) {
    return this.prisma.verification.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        verifier: { select: { id: true, name: true } },
        report: { select: { id: true, reportNumber: true, totalMarketValue: true } },
      },
    });
  }
}
