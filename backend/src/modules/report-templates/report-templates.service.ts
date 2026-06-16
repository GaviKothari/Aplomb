import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { PropertyType } from '@prisma/client';
import * as ExcelJS from 'exceljs';

// All placeholders the engineer/case data can fill in a template
export const PLACEHOLDER_MAP: Record<string, string> = {
  caseNumber:          'Case / APLOMB ID',
  applicationNumber:   'Application / Loan No.',
  siteVisitDate:       'Date of Inspection',
  reportDate:          'Date of Report',
  ownerName:           'Customer / Applicant Name',
  currentOwner:        'Current Owner / Seller',
  propertyAddressBank: 'Address as per Bank',
  propertyAddressDoc:  'Address as per Document',
  propertyAddressSite: 'Address as per Site (with pincode)',
  latitude:            'Latitude',
  longitude:           'Longitude',
  latLng:              'Latitude & Longitude (combined)',
  propertyType:        'Type of Property',
  propertyUsage:       'Property Usage',
  projectName:         'Project / Colony / Society Name',
  localityStatus:      'Status of Locality',
  nearbyLandmarks:     'Proximity / Nearby Landmarks',
  roadWidth:           'Road Width',
  plotArea:            'Land / Plot Area (sqft)',
  landOwnership:       'Land Ownership (Freehold / Leasehold)',
  boundaryNorth:       'North Boundary',
  boundarySouth:       'South Boundary',
  boundaryEast:        'East Boundary',
  boundaryWest:        'West Boundary',
  totalFloors:         'Total Floors in Building',
  floorNumber:         'Property Located on Floor No.',
  ageOfConstruction:   'Age of Property',
  constructionStage:   'Construction Stage (%)',
  carpetArea:          'Carpet Area (sqft)',
  builtUpArea:         'Built-up Area (sqft)',
  builtUpAreaApproved: 'Built-up Area as per Approved Plan (sqft)',
  facingDirection:     'Facing Direction',
  siteObservations:    'Critical Remarks / Site Observations',
  boundaryDescription: 'Boundary Description',
  totalMarketValue:    'Total Market / Fair Market Value (₹)',
  distressValue:       'Distress Value (₹)',
  buildingRatePerSqFt: 'Adopted Rate (₹/sqft)',
  landRatePerSqFt:     'Land Rate (₹/sqft)',
  insuranceValue:      'Insurance Value (₹)',
  demolitionStatus:    'In Demolition List (Yes/No)',
  engineerName:        'Engineer Name',
  bankName:            'Bank Name',
  branchName:          'Branch Name',
  amenities:           'Amenities',
};

@Injectable()
export class ReportTemplatesService {
  private readonly logger = new Logger(ReportTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(data: {
    name: string;
    description?: string;
    organizationId?: string;
    propertyType?: string;
    isDefault?: boolean;
    uploadedById?: string;
  }) {
    return this.prisma.reportTemplate.create({ data: data as any });
  }

  async list(query: { organizationId?: string; propertyType?: string }) {
    return this.prisma.reportTemplate.findMany({
      where: {
        isActive: true,
        ...(query.organizationId ? { organizationId: query.organizationId } : {}),
        ...(query.propertyType ? { propertyType: query.propertyType as PropertyType } : {}),
      },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async uploadExcel(id: string, buffer: Buffer, fileName: string) {
    const key = `report-templates/${id}/${fileName}`;
    await this.storage.upload(key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return this.prisma.reportTemplate.update({
      where: { id },
      data: { s3Key: key, fileName },
    });
  }

  async delete(id: string) {
    const t = await this.prisma.reportTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    if (t.s3Key) await this.storage.delete(t.s3Key);
    return this.prisma.reportTemplate.delete({ where: { id } });
  }

  // Finds the best template for a case: exact (bank+type) → bank-only → type-only → default
  async findForCase(caseId: string): Promise<any | null> {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { organizationId: true, propertyType: true },
    });
    if (!c) return null;

    const candidates = await this.prisma.reportTemplate.findMany({
      where: { isActive: true, s3Key: { not: null } },
    });

    const exact = candidates.find(
      t => t.organizationId === c.organizationId && t.propertyType === c.propertyType,
    );
    if (exact) return exact;

    const bankOnly = candidates.find(
      t => t.organizationId === c.organizationId && t.propertyType === null,
    );
    if (bankOnly) return bankOnly;

    const typeOnly = candidates.find(
      t => t.organizationId === null && t.propertyType === c.propertyType,
    );
    if (typeOnly) return typeOnly;

    return candidates.find(t => t.isDefault) ?? null;
  }

  // Fill {{placeholders}} in the Excel, render to styled HTML, generate PDF via Puppeteer
  async fillAndGeneratePdf(templateKey: string, data: Record<string, string>): Promise<Buffer> {
    // Download template from R2
    const signedUrl = await this.storage.getSignedUrl(templateKey, 300);
    const resp = await fetch(signedUrl);
    if (!resp.ok) throw new Error(`Failed to fetch template: ${resp.status}`);
    const arrayBuffer = await resp.arrayBuffer();
    // ExcelJS.load accepts Buffer or Uint8Array — cast to any to satisfy older type defs
    const excelBuffer = Buffer.from(arrayBuffer) as any;

    // Load with ExcelJS and fill placeholders
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelBuffer);
    workbook.eachSheet(ws => {
      ws.eachRow(row => {
        row.eachCell({ includeEmpty: false }, cell => {
          if (typeof cell.value === 'string' && cell.value.includes('{{')) {
            cell.value = cell.value.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
          }
          // Also handle RichText values
          if (cell.value && typeof cell.value === 'object' && 'richText' in (cell.value as any)) {
            const rt = (cell.value as any).richText as Array<{ text: string; font?: any }>;
            rt.forEach(chunk => {
              if (chunk.text && chunk.text.includes('{{')) {
                chunk.text = chunk.text.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
              }
            });
          }
        });
      });
    });

    // Build styled HTML from the filled workbook
    const html = await this.workbookToHtml(workbook, data);

    // Puppeteer PDF — use system Chromium in production (set via PUPPETEER_EXECUTABLE_PATH)
    const puppeteer = await import('puppeteer');
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    const browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
    });
    await browser.close();
    return Buffer.from(pdfBytes);
  }

  // Convert ExcelJS workbook to a clean, print-ready HTML document
  private async workbookToHtml(workbook: ExcelJS.Workbook, data: Record<string, string>): Promise<string> {
    const css = `
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #000; }
      .page { width:100%; padding: 6mm 8mm; page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      table { width:100%; border-collapse:collapse; margin-bottom:4pt; }
      td, th { border:0.5pt solid #aaa; padding:2.5pt 4pt; vertical-align:middle; word-break:break-word; }
      .hdr-top { background:#1a237e; color:#fff; font-weight:bold; font-size:9pt; }
      .hdr-top td { border-color:#1a237e; }
      .section-hdr td { background:#dce8f5; font-weight:bold; font-size:8.5pt; border-color:#90b4d4; }
      .label-row td.label { font-weight:500; background:#f8f9fa; width:38%; }
      .label-row td.colon { width:2%; text-align:center; }
      .label-row td.value { width:60%; }
      .page-num { text-align:right; font-size:7.5pt; color:#555; padding:1pt 0; }
      .photo-section { margin-top:6pt; }
      .photo-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:6pt; margin-top:4pt; }
      .photo-grid img { width:100%; height:120pt; object-fit:cover; border:0.5pt solid #ccc; }
      .photo-caption { font-size:7pt; color:#555; text-align:center; margin-top:2pt; }
      .sign-block { margin-top:12pt; display:flex; justify-content:space-between; }
      .sign-col { text-align:center; width:30%; border-top:0.5pt solid #000; padding-top:4pt; font-size:8pt; }
      @media print { .page { page-break-after: always; } }
    `;

    const bankName = data.bankName ?? 'Bank';
    const caseNum = data.caseNumber ?? '';
    const pages: string[] = [];

    workbook.eachSheet((ws, sheetId) => {
      const rows: Array<{ cells: Array<{ text: string; colspan: number; bold: boolean; bg?: string; color?: string }> }> = [];

      // Collect merge info
      const mergedSet = new Set<string>();
      const mergeSpan = new Map<string, { cs: number; rs: number }>();
      const mergeInfo = (ws as any)._merges as Record<string, string> | undefined;
      if (mergeInfo) {
        Object.keys(mergeInfo).forEach(ref => {
          // ref like "B3:H3"
          const [tl, br] = ref.split(':');
          if (!tl || !br) return;
          const c1 = this.colToNum(tl.replace(/\d+/g, ''));
          const r1 = parseInt(tl.replace(/[A-Z]/g, ''), 10);
          const c2 = this.colToNum(br.replace(/\d+/g, ''));
          const r2 = parseInt(br.replace(/[A-Z]/g, ''), 10);
          for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
              const key = `${r}:${c}`;
              if (r === r1 && c === c1) mergeSpan.set(key, { cs: c2 - c1 + 1, rs: r2 - r1 + 1 });
              else mergedSet.add(key);
            }
          }
        });
      }

      ws.eachRow((row, rn) => {
        const cells: Array<{ text: string; colspan: number; rowspan: number; bold: boolean; bg?: string; color?: string; skip?: boolean }> = [];
        // Only render columns B–H (2–8) — ICICI template uses this range
        for (let cn = 2; cn <= 8; cn++) {
          const key = `${rn}:${cn}`;
          if (mergedSet.has(key)) { cells.push({ text: '', colspan: 1, rowspan: 1, bold: false, skip: true }); continue; }
          const cell = row.getCell(cn);
          let text = '';
          if (typeof cell.value === 'string') text = cell.value;
          else if (cell.value && typeof cell.value === 'object' && 'richText' in (cell.value as any)) {
            text = (cell.value as any).richText.map((r: any) => r.text).join('');
          } else if (cell.value != null) text = String(cell.value);

          const span = mergeSpan.get(key);
          const bold = !!(cell.font?.bold);
          let bg: string | undefined;
          let color: string | undefined;
          if (cell.fill?.type === 'pattern' && (cell.fill as any).fgColor?.argb) {
            const argb = (cell.fill as any).fgColor.argb as string;
            if (argb && argb !== 'FF000000' && argb !== 'FFFFFFFF') {
              bg = '#' + argb.slice(2);
            }
          }
          if (cell.font?.color?.argb) {
            const c = cell.font.color.argb;
            if (c && c !== 'FF000000') color = '#' + c.slice(2);
          }
          cells.push({ text: text.replace(/\n/g, '<br>'), colspan: span?.cs ?? 1, rowspan: span?.rs ?? 1, bold, bg, color });
        }
        rows.push({ cells: cells as any });
      });

      // Build HTML table for this sheet
      let tableHtml = '<table>';
      rows.forEach(r => {
        tableHtml += '<tr>';
        r.cells.forEach((cell: any) => {
          if (cell.skip) return;
          const style = [
            cell.bold ? 'font-weight:bold;' : '',
            cell.bg ? `background:${cell.bg};` : '',
            cell.color ? `color:${cell.color};` : '',
          ].filter(Boolean).join('');
          tableHtml += `<td colspan="${cell.colspan}" rowspan="${cell.rowspan || 1}" style="${style}">${cell.text}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';

      pages.push(`<div class="page">${tableHtml}</div>`);
    });

    // Photos page (if media URLs provided)
    if (data.__photoUrls) {
      try {
        const urls: string[] = JSON.parse(data.__photoUrls);
        if (urls.length > 0) {
          const photoHtml = urls.map((url, i) =>
            `<div><img src="${url}" onerror="this.style.display='none'" /><div class="photo-caption">Photo ${i + 1}</div></div>`,
          ).join('');
          pages.push(`
            <div class="page">
              <h3 style="margin-bottom:6pt;font-size:10pt;">Property Photographs</h3>
              <div class="photo-grid">${photoHtml}</div>
            </div>
          `);
        }
      } catch {}
    }

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${css}</style></head>
<body>${pages.join('')}</body></html>`;
  }

  private colToNum(col: string): number {
    let n = 0;
    for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n;
  }

  // Build the {{placeholder}} → value map for a given case + its latest report
  async buildDataForCase(caseId: string): Promise<Record<string, string>> {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        organization: true,
        engineer:     true,
        reports:           { orderBy: { createdAt: 'desc' }, take: 1 },
        media:             { where: { mediaType: 'PHOTO' }, take: 12 },
        demolitionAlerts:  { where: { matchStatus: 'CONFIRMED' }, take: 1 },
      },
    });
    if (!c) throw new NotFoundException('Case not found');

    const caseWithRelations = c as any;
    const r = caseWithRelations.reports?.[0];
    const photoUrls = (caseWithRelations.media ?? []).map((m: any) => m.cdnUrl).filter(Boolean);
    const hasDemolition = (caseWithRelations.demolitionAlerts ?? []).length > 0;

    const siteDate = c.siteVisitDate
      ? new Date(c.siteVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';

    const fmt = (v?: number | null) => v != null ? Number(v).toLocaleString('en-IN') : 'NA';

    return {
      caseNumber:          c.caseNumber,
      aplombId:            c.caseNumber,
      applicationNumber:   c.loanAccountNumber ?? c.applicationNumber ?? 'NA',
      siteVisitDate:       siteDate,
      reportDate:          new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      ownerName:           c.ownerName,
      currentOwner:        c.ownerName,
      propertyAddressBank: c.propertyAddress,
      propertyAddressDoc:  c.propertyAddress,
      propertyAddressSite: `${c.propertyAddress}, ${c.propertyCity}, ${c.propertyState} - ${c.propertyPincode}`,
      latitude:            c.latitude ? String(c.latitude) : 'NA',
      longitude:           c.longitude ? String(c.longitude) : 'NA',
      latLng:              c.latitude && c.longitude ? `${c.latitude}, ${c.longitude}` : 'NA',
      propertyType:        (c.propertyType ?? '').replace(/_/g, ' '),
      propertyUsage:       r?.constructionStage ?? 'NA',
      projectName:         c.propertyCity,
      bankName:            caseWithRelations.organization?.name ?? 'NA',
      branchName:          c.branchName ?? 'NA',
      nearbyLandmarks:     r?.nearbyLandmarks ?? 'NA',
      roadWidth:           r?.roadWidth ? `${r.roadWidth} ft` : 'NA',
      plotArea:            r?.plotArea ? `${fmt(r.plotArea)} Sqft` : 'NA',
      totalFloors:         r?.totalFloors ? String(r.totalFloors) : 'NA',
      floorNumber:         r?.occupiedFloors ? String(r.occupiedFloors) : 'NA',
      ageOfConstruction:   r?.ageOfConstruction ? `${r.ageOfConstruction} Years` : 'NA',
      constructionStage:   r?.constructionStage ?? 'NA',
      carpetArea:          r?.carpetArea ? `${fmt(r.carpetArea)} Sqft` : 'NA',
      builtUpArea:         r?.builtUpArea ? `${fmt(r.builtUpArea)} Sqft` : 'NA',
      builtUpAreaApproved: r?.builtUpArea ? `${fmt(r.builtUpArea)} Sqft` : 'NA',
      facingDirection:     r?.facingDirection ?? 'NA',
      siteObservations:    r?.siteObservations ?? 'NA',
      boundaryDescription: r?.boundaryDescription ?? 'NA',
      totalMarketValue:    r?.totalMarketValue ? `₹ ${fmt(r.totalMarketValue)}` : 'NA',
      distressValue:       r?.distressValue ? `₹ ${fmt(r.distressValue)}` : 'NA',
      buildingRatePerSqFt: r?.buildingRatePerSqFt ? `₹ ${fmt(r.buildingRatePerSqFt)}` : 'NA',
      landRatePerSqFt:     r?.landRatePerSqFt ? `₹ ${fmt(r.landRatePerSqFt)}` : 'NA',
      insuranceValue:      r?.builtUpArea && r?.buildingRatePerSqFt
                             ? `₹ ${fmt(Number(r.builtUpArea) * 1200)}` : 'NA',
      demolitionStatus:    hasDemolition ? 'Yes' : 'No',
      engineerName:        caseWithRelations.engineer?.name ?? 'NA',
      amenities:           r?.amenities?.join(', ') ?? 'NA',
      localityStatus:      'NA',
      landOwnership:       'Free Hold',
      __photoUrls:         JSON.stringify(photoUrls),
    };
  }

  placeholders() {
    return PLACEHOLDER_MAP;
  }
}
