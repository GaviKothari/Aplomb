import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ── Address utilities ─────────────────────────────────────────────────────────

function normalize(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CITY_NAMES = new Set([
  'delhi', 'new delhi', 'mumbai', 'bangalore', 'bengaluru', 'hyderabad',
  'chennai', 'kolkata', 'pune', 'gurgaon', 'gurugram', 'noida', 'greater noida',
  'faridabad', 'ghaziabad', 'navi mumbai', 'thane', 'india',
]);

const STATE_RE =
  /^(?:[a-z]+ pradesh|haryana|maharashtra|karnataka|tamil nadu|telangana|rajasthan|gujarat|uttar pradesh|west bengal)$/i;

const ADDRESS_PREFIX_RE =
  /^(?:flat|unit|apartment|floor|tower|wing|block|plot|house|h\.no|f-|no\.?\s+)\s/i;

function parseAddress(raw: string) {
  const flatMatch  = raw.match(/(?:flat|unit|apartment|apt|f-|no\.?\s*)#?\s*([a-z0-9/-]+)/i);
  const towerMatch = raw.match(/(?:tower|wing|block)\s*-?\s*([a-z0-9]+)/i);
  const floorMatch = raw.match(/(\d+)(?:st|nd|rd|th)?\s*(?:floor|fl\.?)/i);
  const sectorMatch= raw.match(/(?:sector|sec\.?)\s*-?\s*(\d+[a-z]?)/i);

  const parts = raw.split(',').map(p => p.trim());
  const candidates = parts.filter(p => {
    if (p.length <= 3) return false;
    if (/^\d+$/.test(p)) return false;             // pure digits
    if (/^\d{6}$/.test(p)) return false;            // pincode
    if (CITY_NAMES.has(p.toLowerCase())) return false;
    if (STATE_RE.test(p)) return false;
    if (ADDRESS_PREFIX_RE.test(p)) return false;
    return /[a-zA-Z]/.test(p);
  });

  // Society = first multi-word proper-noun candidate
  const society = candidates.find(c => /[A-Z]/.test(c) && c.split(' ').length >= 2)
    ?? candidates[0]
    ?? null;

  const locality = candidates.length >= 2 && candidates[candidates.length - 2] !== society
    ? candidates[candidates.length - 2]
    : null;

  return {
    flatNumber:  flatMatch?.[1]  ?? null,
    floorNumber: floorMatch?.[1] ?? null,
    towerName:   towerMatch?.[1] ?? null,
    societyName: society,
    locality,
    sector: sectorMatch?.[1] ?? null,
  };
}

// ── Response types ────────────────────────────────────────────────────────────

export interface PropertyMatch {
  id: string;
  caseId: string;
  rawAddress: string;
  societyName: string | null;
  propertyType: string | null;
  totalMarketValue: number | null;
  ratePerSqFt: number | null;
  buildingRatePerSqFt: number | null;
  landRatePerSqFt: number | null;
  bankName: string | null;
  engineerName: string | null;
  reportDate: Date | null;
  siteObservations: string | null;
  totalArea: number | null;
  builtUpArea: number | null;
  amenities: string[];
  distanceM?: number;
  confidence: number;
}

export interface BuildingStats {
  count: number;
  avgRate: number | null;
  minRate: number | null;
  maxRate: number | null;
  lastDate: Date | null;
  records: PropertyMatch[];
}

export interface RateTrend {
  year: number;
  avgRate: number;
  count: number;
}

export interface PropertyIntelligenceResult {
  exactMatch: PropertyMatch | null;
  sameBuilding: BuildingStats | null;
  nearby100m: PropertyMatch[];
  nearby250m: PropertyMatch[];
  nearby500m: PropertyMatch[];
  rateTrend: RateTrend[];
  summary: {
    hasExactMatch: boolean;
    sameBuildingCount: number;
    nearbyCount: number;
    avgRateLocality: number | null;
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PropertyIntelligenceService {
  private readonly logger = new Logger(PropertyIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Index ─────────────────────────────────────────────────────────────────

  async indexCase(caseId: string): Promise<void> {
    try {
      const c = await this.prisma.case.findUnique({
        where: { id: caseId },
        include: {
          reports:      { orderBy: { updatedAt: 'desc' }, take: 1 },
          engineer:     true,
          organization: true,
        },
      });
      if (!c) return;

      const report  = c.reports[0] ?? null;
      const parsed  = parseAddress(c.propertyAddress);

      // Derive a single rate/sqft figure
      let ratePerSqFt: number | null = null;
      if (report?.buildingRatePerSqFt != null) {
        ratePerSqFt = Number(report.buildingRatePerSqFt);
      } else if (report?.totalMarketValue != null) {
        const area = Number(report.builtUpArea ?? report.totalArea ?? 0);
        if (area > 0) ratePerSqFt = Math.round(Number(report.totalMarketValue) / area);
      }

      const reportDate    = report?.updatedAt ?? new Date();
      const valuationYear = reportDate.getFullYear();

      await (this.prisma as any).propertyRecord.upsert({
        where:  { caseId },
        create: {
          id:                 require('crypto').randomUUID(),
          caseId,
          organizationId:     c.organizationId,
          rawAddress:         c.propertyAddress,
          normalizedAddress:  normalize(c.propertyAddress),
          ...parsed,
          city:               c.propertyCity,
          pincode:            c.propertyPincode,
          latitude:           c.latitude  != null ? Number(c.latitude)  : null,
          longitude:          c.longitude != null ? Number(c.longitude) : null,
          propertyType:       report?.propertyType      ?? c.propertyType ?? null,
          propertyDescription:report?.propertyDescription ?? null,
          totalArea:          report?.totalArea         != null ? Number(report.totalArea)         : null,
          builtUpArea:        report?.builtUpArea       != null ? Number(report.builtUpArea)       : null,
          carpetArea:         report?.carpetArea        != null ? Number(report.carpetArea)        : null,
          plotArea:           report?.plotArea          != null ? Number(report.plotArea)          : null,
          totalFloors:        report?.totalFloors       ?? null,
          ageOfConstruction:  report?.ageOfConstruction ?? null,
          facingDirection:    report?.facingDirection   ?? null,
          constructionStage:  report?.constructionStage ?? null,
          amenities:          report?.amenities         ?? [],
          roadWidth:          report?.roadWidth         != null ? Number(report.roadWidth)         : null,
          totalMarketValue:   report?.totalMarketValue  != null ? Number(report.totalMarketValue)  : null,
          ratePerSqFt,
          landRatePerSqFt:    report?.landRatePerSqFt   != null ? Number(report.landRatePerSqFt)   : null,
          buildingRatePerSqFt:report?.buildingRatePerSqFt != null ? Number(report.buildingRatePerSqFt) : null,
          distressValue:      report?.distressValue     != null ? Number(report.distressValue)     : null,
          bankName:           c.organization?.name      ?? null,
          engineerName:       c.engineer?.name          ?? null,
          siteObservations:   report?.siteObservations  ?? null,
          reportDate,
          valuationYear,
        },
        update: {
          normalizedAddress:   normalize(c.propertyAddress),
          ...parsed,
          latitude:            c.latitude  != null ? Number(c.latitude)  : null,
          longitude:           c.longitude != null ? Number(c.longitude) : null,
          propertyType:        report?.propertyType      ?? c.propertyType ?? null,
          propertyDescription: report?.propertyDescription ?? null,
          totalArea:           report?.totalArea         != null ? Number(report.totalArea)         : undefined,
          builtUpArea:         report?.builtUpArea       != null ? Number(report.builtUpArea)       : undefined,
          totalFloors:         report?.totalFloors       ?? undefined,
          ageOfConstruction:   report?.ageOfConstruction ?? undefined,
          facingDirection:     report?.facingDirection   ?? undefined,
          constructionStage:   report?.constructionStage ?? undefined,
          amenities:           report?.amenities         ?? undefined,
          roadWidth:           report?.roadWidth         != null ? Number(report.roadWidth)         : undefined,
          totalMarketValue:    report?.totalMarketValue  != null ? Number(report.totalMarketValue)  : undefined,
          ratePerSqFt:         ratePerSqFt ?? undefined,
          landRatePerSqFt:     report?.landRatePerSqFt   != null ? Number(report.landRatePerSqFt)   : undefined,
          buildingRatePerSqFt: report?.buildingRatePerSqFt != null ? Number(report.buildingRatePerSqFt) : undefined,
          distressValue:       report?.distressValue     != null ? Number(report.distressValue)     : undefined,
          engineerName:        c.engineer?.name          ?? undefined,
          siteObservations:    report?.siteObservations  ?? undefined,
          reportDate,
          valuationYear,
        },
      });

      this.logger.log(`[PI] Indexed ${caseId} — society: "${parsed.societyName}" rate: ${ratePerSqFt}`);
    } catch (e: any) {
      this.logger.warn(`[PI] Index failed for ${caseId}: ${e.message}`);
    }
  }

  // ── Match ─────────────────────────────────────────────────────────────────

  async findMatches(caseId: string): Promise<PropertyIntelligenceResult> {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
    });
    if (!c) throw new NotFoundException('Case not found');

    const orgId   = c.organizationId;
    const pincode = c.propertyPincode;
    const norm    = normalize(c.propertyAddress);
    const parsed  = parseAddress(c.propertyAddress);
    const lat     = c.latitude  ? Number(c.latitude)  : null;
    const lng     = c.longitude ? Number(c.longitude) : null;

    const db = this.prisma as any;

    // 1 ─ Exact match
    const exactRaw = await db.propertyRecord.findFirst({
      where: {
        organizationId:   orgId,
        caseId:           { not: caseId },
        normalizedAddress: norm,
      },
    });
    const exactMatch = exactRaw ? this.toMatch(exactRaw, 100) : null;

    // 2 ─ Same building
    const societyToken = parsed.societyName?.split(' ')[0];
    const sameBuildingRaw: any[] = societyToken
      ? await db.propertyRecord.findMany({
          where: {
            organizationId: orgId,
            caseId:         { not: caseId },
            societyName:    { contains: societyToken, mode: 'insensitive' },
          },
          orderBy: { reportDate: 'desc' },
          take: 30,
        })
      : await db.propertyRecord.findMany({
          where: { organizationId: orgId, caseId: { not: caseId }, pincode },
          orderBy: { reportDate: 'desc' },
          take: 20,
        });

    const sameBuilding: BuildingStats | null = sameBuildingRaw.length > 0
      ? (() => {
          const rates = sameBuildingRaw
            .map(r => r.ratePerSqFt != null ? Number(r.ratePerSqFt) : null)
            .filter((v): v is number => v !== null);
          return {
            count:    sameBuildingRaw.length,
            avgRate:  rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
            minRate:  rates.length ? Math.round(Math.min(...rates)) : null,
            maxRate:  rates.length ? Math.round(Math.max(...rates)) : null,
            lastDate: sameBuildingRaw[0]?.reportDate ?? null,
            records:  sameBuildingRaw.slice(0, 10).map(r => this.toMatch(r, 80)),
          };
        })()
      : null;

    // 3 ─ Geo-radius (Haversine, no PostGIS needed)
    let geoRows: any[] = [];
    if (lat !== null && lng !== null) {
      geoRows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT pr.*,
          ROUND(6371000 * acos(
            LEAST(1.0,
              cos(radians($1)) * cos(radians(CAST(pr.latitude  AS DOUBLE PRECISION)))
              * cos(radians(CAST(pr.longitude AS DOUBLE PRECISION)) - radians($2))
              + sin(radians($1)) * sin(radians(CAST(pr.latitude AS DOUBLE PRECISION)))
            )
          ))::integer AS "distanceM"
         FROM property_records pr
         WHERE pr."organizationId" = $3
           AND pr."caseId" != $4
           AND pr.latitude  IS NOT NULL
           AND pr.longitude IS NOT NULL
         ORDER BY "distanceM" ASC
         LIMIT 50`,
        lat, lng, orgId, caseId,
      );
    }

    const within = (maxM: number, minM = 0) =>
      geoRows
        .filter(r => {
          const d = Number(r.distanceM);
          return d > minM && d <= maxM;
        })
        .map(r => ({ ...this.toMatch(r, maxM <= 100 ? 90 : maxM <= 250 ? 75 : 60), distanceM: Number(r.distanceM) }));

    // 4 ─ Rate trend
    const trendRows = await this.prisma.$queryRaw<any[]>`
      SELECT
        pr."valuationYear"                                          AS year,
        ROUND(AVG(CAST(pr."ratePerSqFt" AS DOUBLE PRECISION)))     AS "avgRate",
        COUNT(*)                                                    AS count
      FROM property_records pr
      WHERE pr."organizationId" = ${orgId}
        AND pr."caseId"         != ${caseId}
        AND pr."ratePerSqFt"    IS NOT NULL
        AND pr."valuationYear"  IS NOT NULL
        AND (
          ${societyToken
            ? Prisma.sql`pr."societyName" ILIKE ${'%' + societyToken + '%'}`
            : Prisma.sql`pr.pincode = ${pincode}`}
        )
      GROUP BY pr."valuationYear"
      ORDER BY pr."valuationYear" ASC
    `;

    const rateTrend: RateTrend[] = trendRows.map(r => ({
      year:    Number(r.year),
      avgRate: Math.round(Number(r.avgRate)),
      count:   Number(r.count),
    }));

    const recentRates  = rateTrend.slice(-2).map(r => r.avgRate);
    const avgRateLocality = recentRates.length
      ? Math.round(recentRates.reduce((a, b) => a + b, 0) / recentRates.length)
      : null;

    return {
      exactMatch,
      sameBuilding,
      nearby100m: within(100),
      nearby250m: within(250, 100),
      nearby500m: within(500, 250),
      rateTrend,
      summary: {
        hasExactMatch:     !!exactMatch,
        sameBuildingCount: sameBuilding?.count ?? 0,
        nearbyCount:       geoRows.filter(r => Number(r.distanceM) <= 500).length,
        avgRateLocality,
      },
    };
  }

  // ── Backfill all existing cases ───────────────────────────────────────────

  async backfillAll(): Promise<{ started: boolean; total: number }> {
    const db = this.prisma as any;

    // Which cases are already indexed?
    const indexed = await db.propertyRecord.findMany({ select: { caseId: true } });
    const indexedSet = new Set(indexed.map((r: any) => r.caseId));

    const allCases = await this.prisma.case.findMany({ select: { id: true } });
    const toIndex  = allCases.filter(c => !indexedSet.has(c.id)).map(c => c.id);

    this.logger.log(`[PI] Backfill queued: ${toIndex.length} cases (${indexedSet.size} already indexed)`);

    // Run in background — don't await so the HTTP response returns immediately
    this.runBackfill(toIndex).catch(e => this.logger.warn(`[PI] Backfill error: ${e.message}`));

    return { started: true, total: toIndex.length };
  }

  private async runBackfill(caseIds: string[]): Promise<void> {
    let done = 0;
    for (const id of caseIds) {
      await this.indexCase(id);
      done++;
      if (done % 100 === 0) {
        this.logger.log(`[PI] Backfill progress: ${done}/${caseIds.length}`);
      }
      if (done % 50 === 0) await new Promise(r => setTimeout(r, 100));
    }
    this.logger.log(`[PI] Backfill complete: ${done} cases indexed`);
  }

  // ── Address search (no caseId — used on the new-case form) ──────────────

  async searchByAddress(address: string, pincode?: string): Promise<{
    societyName: string | null;
    count: number;
    avgRate: number | null;
    minRate: number | null;
    maxRate: number | null;
    records: PropertyMatch[];
  }> {
    const parsed = parseAddress(address);
    const db = this.prisma as any;
    let rows: any[] = [];

    const societyToken = parsed.societyName?.split(' ')[0];
    if (societyToken && societyToken.length > 3) {
      rows = await db.propertyRecord.findMany({
        where: { societyName: { contains: societyToken, mode: 'insensitive' } },
        orderBy: { reportDate: 'desc' },
        take: 20,
      });
    }

    // Fallback / supplement with pincode when too few society hits
    if (rows.length < 3 && pincode) {
      const extra: any[] = await db.propertyRecord.findMany({
        where: { pincode },
        orderBy: { reportDate: 'desc' },
        take: 20,
      });
      const seen = new Set(rows.map((r: any) => r.id));
      for (const r of extra) {
        if (!seen.has(r.id)) { rows.push(r); seen.add(r.id); }
      }
    }

    const rates = rows
      .map((r: any) => r.ratePerSqFt != null ? Number(r.ratePerSqFt) : null)
      .filter((v): v is number => v !== null);

    return {
      societyName: parsed.societyName ?? null,
      count:   rows.length,
      avgRate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
      minRate: rates.length ? Math.round(Math.min(...rates)) : null,
      maxRate: rates.length ? Math.round(Math.max(...rates)) : null,
      records: rows.slice(0, 5).map(r => this.toMatch(r, 70)),
    };
  }

  private toMatch(r: any, confidence: number): PropertyMatch {
    return {
      id:                  r.id,
      caseId:              r.caseId,
      rawAddress:          r.rawAddress,
      societyName:         r.societyName   ?? null,
      propertyType:        r.propertyType  ?? null,
      totalMarketValue:    r.totalMarketValue    != null ? Number(r.totalMarketValue)    : null,
      ratePerSqFt:         r.ratePerSqFt         != null ? Number(r.ratePerSqFt)         : null,
      buildingRatePerSqFt: r.buildingRatePerSqFt != null ? Number(r.buildingRatePerSqFt) : null,
      landRatePerSqFt:     r.landRatePerSqFt     != null ? Number(r.landRatePerSqFt)     : null,
      bankName:            r.bankName      ?? null,
      engineerName:        r.engineerName  ?? null,
      reportDate:          r.reportDate    ?? null,
      siteObservations:    r.siteObservations ?? null,
      totalArea:           r.totalArea     != null ? Number(r.totalArea)    : null,
      builtUpArea:         r.builtUpArea   != null ? Number(r.builtUpArea)  : null,
      amenities:           r.amenities     ?? [],
      confidence,
    };
  }
}
