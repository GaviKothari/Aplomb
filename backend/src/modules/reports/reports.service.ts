import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportStatus, CaseStatus } from '@prisma/client';
import { EventsGateway } from '../../gateways/events.gateway';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as fs from 'fs';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async createFromAiSession(
    caseId: string,
    aiFields: Record<string, any>,
    submittedById: string,
  ) {
    const reportNumber = await this.generateReportNumber(caseId);

    const report = await this.prisma.report.create({
      data: {
        reportNumber,
        caseId,
        submittedById,
        status: ReportStatus.DRAFT,
        aiGeneratedContent: aiFields,
        aiConfidenceScore: aiFields.confidence,
        propertyDescription: aiFields.propertyDescription,
        propertyType: aiFields.propertyType,
        constructionStage: aiFields.constructionStage,
        totalFloors: aiFields.totalFloors,
        totalArea: aiFields.totalArea,
        builtUpArea: aiFields.builtUpArea,
        carpetArea: aiFields.carpetArea,
        plotArea: aiFields.plotArea,
        ageOfConstruction: aiFields.ageOfConstruction,
        roadWidth: aiFields.roadWidth,
        facingDirection: aiFields.facingDirection,
        landRatePerSqFt: aiFields.landRatePerSqFt,
        buildingRatePerSqFt: aiFields.buildingRatePerSqFt,
        totalMarketValue: aiFields.totalMarketValue,
        siteObservations: aiFields.siteObservations,
        boundaryDescription: aiFields.boundaryDescription,
        amenities: aiFields.amenities || [],
        localityFeatures: aiFields.localityFeatures || [],
        nearbyLandmarks: aiFields.nearbyLandmarks,
        marketabilityRating: aiFields.marketabilityRating,
        liquidityRating: aiFields.liquidityRating,
        valuationAsOn: new Date(),
      },
    });

    // Create individual field records for granular tracking
    const fieldEntries = Object.entries(aiFields)
      .filter(([k]) => !['confidence', 'needs_review_fields'].includes(k))
      .map(([key, value]) => ({
        reportId: report.id,
        fieldKey: key,
        fieldLabel: key.replace(/([A-Z])/g, ' $1').trim(),
        fieldValue: String(value ?? ''),
        aiGenerated: true,
      }));

    await this.prisma.reportField.createMany({ data: fieldEntries });

    return report;
  }

  async submit(reportId: string, userId: string) {
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.SUBMITTED, submittedAt: new Date() },
      include: { case: true },
    });

    // Advance case status
    await this.prisma.case.update({
      where: { id: report.caseId },
      data: { status: CaseStatus.UNDER_VERIFICATION },
    });

    this.events.emitReportUpdate(report.caseId, 'submitted', { reportId, caseId: report.caseId });
    return report;
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reportFields: true,
        case: { include: { organization: true, media: true } },
        submittedBy: { select: { id: true, name: true } },
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { verifier: { select: { id: true, name: true } } },
        },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async update(id: string, fields: Record<string, any>) {
    const updates: any = {};
    const allowedFields = [
      'propertyDescription', 'propertyType', 'constructionStage', 'facingDirection',
      'totalFloors', 'occupiedFloors', 'totalArea', 'builtUpArea', 'builtUpAreaApproved',
      'carpetArea', 'plotArea', 'ageOfConstruction', 'roadWidth',
      'siteObservations', 'boundaryDescription', 'nearbyLandmarks',
      'landRatePerSqFt', 'buildingRatePerSqFt', 'totalMarketValue',
      'distressValue', 'insuranceValue', 'officeRemarks',
      'amenities', 'localityFeatures', 'marketabilityRating', 'liquidityRating',
    ];

    for (const key of allowedFields) {
      if (key in fields) updates[key] = fields[key];
    }

    return this.prisma.report.update({ where: { id }, data: updates });
  }

  async getVersions(caseId: string) {
    return this.prisma.report.findMany({
      where: { caseId },
      orderBy: { revision: 'asc' },
      select: {
        id: true, reportNumber: true, revision: true, status: true,
        createdAt: true, submittedAt: true,
        submittedBy: { select: { name: true } },
      },
    });
  }

  async generatePdf(reportId: string): Promise<string> {
    const report = await this.findOne(reportId);

    const chromiumPkg = '@sparticuz/chromium';
    const puppeteerPkg = 'puppeteer-core';
    const chromium: any = await import(chromiumPkg).then((m: any) => m.default ?? m);
    const puppeteer: any = await import(puppeteerPkg).then((m: any) => m.default ?? m);
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Build HTML from Handlebars template
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'report.hbs');
    let template = `<html><body><h1>{{reportNumber}}</h1><p>{{propertyDescription}}</p></body></html>`;
    if (fs.existsSync(templatePath)) {
      template = fs.readFileSync(templatePath, 'utf8');
    }

    const compiled = handlebars.compile(template);
    const html = compiled({ ...report, generatedAt: new Date().toLocaleDateString('en-IN') });

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // TODO: upload pdfBuffer to R2, return CDN URL
    const filename = `reports/${reportId}-${Date.now()}.pdf`;
    this.logger.log(`PDF generated for report ${reportId}: ${filename}`);

    return filename;
  }

  private async generateReportNumber(caseId: string): Promise<string> {
    const c = await this.prisma.case.findUnique({ where: { id: caseId } });
    const existing = await this.prisma.report.count({ where: { caseId } });
    if (existing === 0) return c.caseNumber;
    return `${c.caseNumber}-R${existing}`;
  }
}
