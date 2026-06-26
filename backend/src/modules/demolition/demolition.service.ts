/**
 * DemolitionService — Property Intelligence Engine
 *
 * Architecture:
 *   raw address
 *     ↓ normalizeAddress()        → NormalizedAddress (structured components)
 *     ↓ searchCandidates()        → top 20 via pg_trgm similarity
 *     ↓ rankMatch()               → confidence % + reasons[]
 *     ↓ threshold filter          → CONFIRMED ≥ 70 / POTENTIAL ≥ 40
 *     ↓ upsert DemolitionAlert    → with stored reasons JSON
 *
 * Feature weights:
 *   Block+Plot code   30%   "BT-57" exact compound
 *   Locality          25%   same canonical locality
 *   Plot/House No.    15%   same identifier
 *   Block letter      10%   same block
 *   Pincode            8%   same 6-digit pincode
 *   Owner surname      7%   same last name
 *   Zone               5%   same MCD zone
 *   ─────────────────────
 *   Total            100%
 *
 *   Locality mismatch  −50%  (different localities = high penalty)
 *   Zone mismatch      −35%  (different zones = medium penalty)
 */

import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { normalizeAddress, isNonDelhiAddress, NormalizedAddress } from './address-normalizer';

// ── Feature weight map ────────────────────────────────────────────────────────

const WEIGHTS = {
  blockPlotCode: 30,
  locality: 25,
  plotNo: 15,
  block: 10,
  pincode: 8,
  ownerSurname: 7,
  zone: 5,
  // Penalties (applied as negatives)
  localityMismatch: -50,
  zoneMismatch: -35,
};

export interface MatchSignal {
  signal: string
  weight: number       // contribution weight (can be negative for penalties)
  matched: boolean
  contribution: number       // actual points added (0 if not matched)
  detail?: string
}

export interface MatchResult {
  confidence: number         // 0–100 percentage
  reasons: MatchSignal[]
  dominant: string         // which signal drove the match
}

// ── Ranking engine ────────────────────────────────────────────────────────────

function codesCompatible(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // "BT-57" ≅ "BT57" ≅ "57-BT"
  const norm = (s: string) => s.replace(/[-\/\s]/g, '').toUpperCase();
  return norm(a) === norm(b);
}

function numsCompatible(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // "812" ≅ "812/4" — base match
  const base = (s: string) => s.split(/[\/\-]/)[0];
  return base(a) === base(b) || base(a) === b || a === base(b);
}

function ownerSurnameMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const words = (s: string) => s.toUpperCase().split(/\s+/).filter(w => w.length >= 3);
  const aw = words(a); const bw = words(b);
  if (aw.length === 0 || bw.length === 0) return false;
  // Last word is most often surname
  return aw[aw.length - 1] === bw[bw.length - 1];
}

function rankMatch(
  caseN: NormalizedAddress,
  dbN: NormalizedAddress,
  caseOwner: string | null,
  dbOwner: string | null,
): MatchResult {
  const signals: MatchSignal[] = [];
  let score = 0;

  // 1. Block + Plot compound code  (30%)
  const codeHit = codesCompatible(caseN.blockPlotCode, dbN.blockPlotCode)
    || codesCompatible(caseN.pocketSectorCode, dbN.pocketSectorCode);
  const codeContrib = codeHit ? WEIGHTS.blockPlotCode : 0;
  score += codeContrib;
  signals.push({
    signal: 'Block + Plot Code', weight: WEIGHTS.blockPlotCode,
    matched: codeHit, contribution: codeContrib,
    detail: codeHit ? `${caseN.blockPlotCode ?? caseN.pocketSectorCode}` : undefined,
  });

  // 2. Locality  (25%)
  const locHit = !!caseN.locality && caseN.locality === dbN.locality;
  const locContrib = locHit ? WEIGHTS.locality : 0;
  score += locContrib;
  signals.push({
    signal: 'Locality', weight: WEIGHTS.locality,
    matched: locHit, contribution: locContrib,
    detail: locHit ? caseN.locality! : undefined,
  });

  // 3. Plot / House number  (15%)
  const plotHit = numsCompatible(caseN.plotNo, dbN.plotNo)
    || numsCompatible(caseN.houseNo, dbN.houseNo)
    || numsCompatible(caseN.khasra, dbN.khasra);
  const plotContrib = plotHit ? WEIGHTS.plotNo : 0;
  score += plotContrib;
  signals.push({
    signal: 'Plot / House Number', weight: WEIGHTS.plotNo,
    matched: plotHit, contribution: plotContrib,
    detail: plotHit ? (caseN.plotNo ?? caseN.houseNo ?? caseN.khasra ?? undefined) : undefined,
  });

  // 4. Block letter  (10%)
  const blockHit = !!caseN.block && caseN.block === dbN.block;
  const blockContrib = blockHit ? WEIGHTS.block : 0;
  score += blockContrib;
  signals.push({
    signal: 'Block', weight: WEIGHTS.block,
    matched: blockHit, contribution: blockContrib,
    detail: blockHit ? caseN.block! : undefined,
  });

  // 5. Pincode  (8%)
  const pinHit = !!caseN.pincode && caseN.pincode === dbN.pincode;
  const pinContrib = pinHit ? WEIGHTS.pincode : 0;
  score += pinContrib;
  signals.push({
    signal: 'Pincode', weight: WEIGHTS.pincode,
    matched: pinHit, contribution: pinContrib,
    detail: pinHit ? caseN.pincode! : undefined,
  });

  // 6. Owner surname  (7%)
  const ownerHit = ownerSurnameMatch(caseOwner, dbOwner);
  const ownerContrib = ownerHit ? WEIGHTS.ownerSurname : 0;
  score += ownerContrib;
  signals.push({
    signal: 'Owner Name', weight: WEIGHTS.ownerSurname,
    matched: ownerHit, contribution: ownerContrib,
  });

  // 7. Zone  (5%)
  const zoneHit = !!caseN.zone && caseN.zone === dbN.zone;
  const zoneContrib = zoneHit ? WEIGHTS.zone : 0;
  score += zoneContrib;
  signals.push({
    signal: 'Zone', weight: WEIGHTS.zone,
    matched: zoneHit, contribution: zoneContrib,
    detail: zoneHit ? caseN.zone! : undefined,
  });

  // ── Penalties ──

  // Locality mismatch: both have a clear locality but they differ
  const locMismatch = !!caseN.locality && !!dbN.locality && caseN.locality !== dbN.locality;
  const locPenalty = locMismatch ? WEIGHTS.localityMismatch : 0;
  score += locPenalty;
  if (locMismatch) {
    signals.push({
      signal: 'Locality Mismatch', weight: WEIGHTS.localityMismatch,
      matched: true, contribution: locPenalty,
      detail: `${caseN.locality} ≠ ${dbN.locality}`,
    });
  }

  // Zone mismatch: both have a zone but they differ
  const zoneMismatch = !!caseN.zone && !!dbN.zone && caseN.zone !== dbN.zone;
  const zonePenalty = zoneMismatch ? WEIGHTS.zoneMismatch : 0;
  score += zonePenalty;
  if (zoneMismatch) {
    signals.push({
      signal: 'Zone Mismatch', weight: WEIGHTS.zoneMismatch,
      matched: true, contribution: zonePenalty,
      detail: `${caseN.zone} ≠ ${dbN.zone}`,
    });
  }

  // Hard cap: code signal without locality anchor → max 30
  const hasCode = codeHit || plotHit;
  const hasLocality = locHit;
  if (hasCode && !hasLocality) {
    score = Math.min(score, 30);
  }

  const confidence = Math.min(100, Math.max(0, Math.round(score)));

  // Dominant signal
  let dominant = 'PARTIAL';
  if (codeHit) dominant = 'COMPOUND_CODE';
  else if (locHit && plotHit) dominant = 'LOCALITY_PLOT';
  else if (locHit) dominant = 'LOCALITY';
  else if (plotHit) dominant = 'PLOT_NUMBER';
  else if (pinHit) dominant = 'PINCODE';

  return { confidence, reasons: signals, dominant };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DemolitionService implements OnModuleInit {
  private readonly logger = new Logger(DemolitionService.name);

  // Alias cache — loaded once at startup, invalidated when admin updates table
  private aliasMap: Map<string, string> = new Map();
  private aliasLoadedAt = 0;
  private readonly ALIAS_TTL_MS = 10 * 60 * 1000; // 10 min

  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    try {
      await this.loadAliases();
    } catch (err) {
      // Table may not exist yet (migration pending) — service still starts
      this.logger.warn(`Alias cache skipped at startup: ${(err as Error).message}`);
    }
  }

  private async loadAliases(): Promise<Map<string, string>> {
    const now = Date.now();
    if (now - this.aliasLoadedAt < this.ALIAS_TTL_MS && this.aliasMap.size > 0) {
      return this.aliasMap;
    }
    const rows = await this.prisma.addressAlias.findMany({
      select: { alias: true, canonical: true },
    });
    this.aliasMap = new Map(rows.map(r => [r.alias.toUpperCase(), r.canonical.toUpperCase()]));
    this.aliasLoadedAt = now;
    this.logger.log(`Loaded ${this.aliasMap.size} address aliases`);
    return this.aliasMap;
  }

  // Invalidate alias cache (called after admin updates aliases)
  invalidateAliasCache() {
    this.aliasLoadedAt = 0;
  }

  // ── Candidate retrieval via pg_trgm ──────────────────────────────────────────
  //
  // Uses GIN trigram index: fast over 150k rows (<50ms).
  // Returns top 25 candidates — enough coverage, avoids scanning everything.

  private async searchCandidates(n: NormalizedAddress): Promise<any[]> {
    if (!n.isDelhi) return [];

    type Row = {
      id: string; address: string; zone: string | null; locality: string | null;
      ownerName: string | null; noticeDate: Date; noticeNumber: string | null;
      bookingId: string | null;
    };

    const found = new Map<string, Row>();

    // Pass 1: compound code exact search (highest precision)
    if (n.blockPlotCode || n.pocketSectorCode) {
      const codes = [n.blockPlotCode, n.pocketSectorCode].filter(Boolean) as string[];
      for (const code of codes) {
        const rows = await this.prisma.$queryRawUnsafe<Row[]>(
          `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
           FROM demolition_properties
           WHERE address ILIKE $1 LIMIT 30`,
          `%${code}%`,
        );
        for (const r of rows) found.set(r.id, r);
      }
    }

    // Pass 2: trgm similarity on canonical form (uses GIN index)
    if (n.canonical && n.canonical.length >= 6) {
      const rows = await this.prisma.$queryRawUnsafe<Row[]>(
        `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
         FROM demolition_properties
         WHERE address % $1
         ORDER BY similarity(address, $1) DESC
         LIMIT 25`,
        n.canonical,
      );
      for (const r of rows) if (!found.has(r.id)) found.set(r.id, r);
    }

    // Pass 3: locality AND plot number AND-search (pins false positives)
    if (n.locality && (n.plotNo || n.houseNo)) {
      const num = n.plotNo ?? n.houseNo ?? '';
      const rows = await this.prisma.$queryRawUnsafe<Row[]>(
        `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
         FROM demolition_properties
         WHERE address ILIKE $1 AND address ILIKE $2
         LIMIT 20`,
        `%${n.locality}%`, `%${num}%`,
      );
      for (const r of rows) if (!found.has(r.id)) found.set(r.id, r);
    }

    // Pass 4: pincode search (high-precision geographic filter)
    if (n.pincode && found.size < 25) {
      const rows = await this.prisma.$queryRawUnsafe<Row[]>(
        `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
         FROM demolition_properties
         WHERE address ILIKE $1 LIMIT 15`,
        `%${n.pincode}%`,
      );
      for (const r of rows) if (!found.has(r.id)) found.set(r.id, r);
    }

    return [...found.values()].slice(0, 50);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────

  async getStats() {
    const [total, zoneRows, yearRows, recentAlerts, matchedCases] =
      await Promise.all([
        this.prisma.demolitionProperty.count(),
        this.prisma.$queryRaw<{ zone: string; count: bigint }[]>`
          SELECT zone, COUNT(*) AS count
          FROM demolition_properties
          WHERE zone IS NOT NULL
          GROUP BY zone ORDER BY count DESC
        `,
        this.prisma.$queryRaw<{ year: string; count: bigint }[]>`
          SELECT TO_CHAR("noticeDate", 'YYYY') AS year, COUNT(*) AS count
          FROM demolition_properties
          WHERE EXTRACT(YEAR FROM "noticeDate") BETWEEN 2007 AND 2026
          GROUP BY year ORDER BY year ASC
        `,
        this.prisma.demolitionAlert.count({ where: { matchStatus: { not: 'DISMISSED' } } }),
        this.prisma.demolitionAlert.count({ where: { matchStatus: 'CONFIRMED' } }),
      ]);

    return {
      total,
      matchedCases,
      recentAlerts,
      zones: zoneRows.map(r => ({ zone: r.zone, count: Number(r.count) })),
      yearTrend: yearRows.map(r => ({ year: r.year, count: Number(r.count) })),
    };
  }

  // ── List / search demolition properties ──────────────────────────────────────

  async findAll(query: { search?: string; zone?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const skip = (page - 1) * limit;

    const where: Prisma.DemolitionPropertyWhereInput = {};
    if (query.zone && query.zone !== 'all') where.zone = query.zone;
    if (query.search) {
      where.OR = [
        { address: { contains: query.search, mode: 'insensitive' } },
        { ownerName: { contains: query.search, mode: 'insensitive' } },
        { noticeNumber: { contains: query.search, mode: 'insensitive' } },
        { locality: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.demolitionProperty.findMany({
        where, skip, take: limit,
        orderBy: { noticeDate: 'desc' },
        select: {
          id: true, bookingId: true, noticeNumber: true, noticeDate: true,
          address: true, zone: true, locality: true, ownerName: true, status: true,
          _count: { select: { alerts: true } },
        },
      }),
      this.prisma.demolitionProperty.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Cross-match a single case ─────────────────────────────────────────────────

  async matchCase(caseId: string) {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, propertyAddress: true, propertyPincode: true, ownerName: true },
    });
    if (!c) throw new NotFoundException('Case not found');

    const addr = `${c.propertyAddress}${c.propertyPincode ? ' ' + c.propertyPincode : ''}`;

    // Geographic guard — MCD covers Delhi only
    if (isNonDelhiAddress(addr)) {
      return { matched: 0, alerts: [], skipped: 'non-delhi' };
    }

    const aliases = await this.loadAliases();
    const caseNorm = normalizeAddress(addr, aliases);

    const candidates = await this.searchCandidates(caseNorm);
    if (candidates.length === 0) return { matched: 0, alerts: [] };

    const scored: { id: string; confidence: number; reasons: MatchSignal[]; dominant: string }[] = [];

    for (const dp of candidates) {
      const dbNorm = normalizeAddress(dp.address, aliases);
      const { confidence, reasons, dominant } = rankMatch(
        caseNorm, dbNorm, c.ownerName ?? null, dp.ownerName ?? null,
      );
      if (confidence >= 40) {
        scored.push({ id: dp.id, confidence, reasons, dominant });
      }
    }

    scored.sort((a, b) => b.confidence - a.confidence);
    const top = scored.slice(0, 5);

    let created = 0;
    for (const match of top) {
      await this.prisma.demolitionAlert.upsert({
        where: { caseId_demolitionPropertyId: { caseId, demolitionPropertyId: match.id } },
        create: {
          caseId,
          demolitionPropertyId: match.id,
          matchStatus: match.confidence >= 70 ? 'CONFIRMED' : 'POTENTIAL',
          confidenceScore: match.confidence,
          matchReason: match.dominant,
          reasons: match.reasons as any,
        },
        update: {
          confidenceScore: match.confidence,
          matchReason: match.dominant,
          reasons: match.reasons as any,
        },
      });
      created++;
    }

    if (created > 0) {
      await this.prisma.case.update({
        where: { id: caseId },
        data: { hasDemolitionAlert: true },
      });
    }

    return {
      matched: created,
      alerts: top.map(m => ({ demolitionPropertyId: m.id, confidence: m.confidence, reasons: m.reasons })),
    };
  }

  // ── Bulk match ────────────────────────────────────────────────────────────────

  async matchAllCases() {
    const cases = await this.prisma.case.findMany({
      where: { hasDemolitionAlert: false },
      select: { id: true, propertyAddress: true },
      take: 500,
    });

    let total = 0;
    for (const c of cases) {
      const { matched } = await this.matchCase(c.id);
      total += matched;
    }
    return { processed: cases.length, newAlerts: total };
  }

  // ── List alerts ───────────────────────────────────────────────────────────────

  async getAlerts(query: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.DemolitionAlertWhereInput = {};
    if (query.status === 'open') where.matchStatus = { not: 'DISMISSED' };
    if (query.status === 'confirmed') where.matchStatus = 'CONFIRMED';
    if (query.status === 'potential') where.matchStatus = 'POTENTIAL';
    if (query.status === 'dismissed') where.matchStatus = 'DISMISSED';

    const [data, total] = await Promise.all([
      this.prisma.demolitionAlert.findMany({
        where, skip, take: limit,
        orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          caseId: true,
          demolitionPropertyId: true,
          matchStatus: true,
          confidenceScore: true,
          matchReason: true,
          createdAt: true,
          dismissedAt: true,
          dismissalReason: true,
          dismissedById: true,
          case: {
            select: {
              id: true, caseNumber: true, propertyAddress: true, ownerName: true,
              organization: { select: { name: true } },
            },
          },
          demolitionProperty: {
            select: {
              id: true, address: true, zone: true, ownerName: true,
              noticeDate: true, noticeNumber: true, bookingId: true,
            },
          },
        },
      }),
      this.prisma.demolitionAlert.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Dismiss / confirm alert ───────────────────────────────────────────────────

  async updateAlertStatus(
    alertId: string, status: 'CONFIRMED' | 'DISMISSED', reason?: string, userId?: string,
  ) {
    return this.prisma.demolitionAlert.update({
      where: { id: alertId },
      data: {
        matchStatus: status,
        dismissedById: status === 'DISMISSED' ? userId : null,
        dismissedAt: status === 'DISMISSED' ? new Date() : null,
        dismissalReason: reason ?? null,
      },
    });
  }

  // ── Human feedback ────────────────────────────────────────────────────────────

  async recordFeedback(alertId: string, feedback: 'CORRECT' | 'WRONG', userId: string) {
    return this.prisma.demolitionAlert.update({
      where: { id: alertId },
      data: {
        humanFeedback: feedback,
        feedbackBy: userId,
        feedbackAt: new Date(),
      },
    });
  }

  // ── Cleanup: remove non-Delhi false-positive alerts ───────────────────────────

  async cleanupNonDelhiAlerts() {
    const flagged = await this.prisma.case.findMany({
      where: { hasDemolitionAlert: true },
      select: { id: true, propertyAddress: true, propertyPincode: true },
    });

    let purged = 0; let kept = 0;

    for (const c of flagged) {
      const addr = `${c.propertyAddress}${c.propertyPincode ? ' ' + c.propertyPincode : ''}`;
      if (isNonDelhiAddress(addr)) {
        await this.prisma.demolitionAlert.deleteMany({ where: { caseId: c.id } });
        await this.prisma.case.update({
          where: { id: c.id },
          data: { hasDemolitionAlert: false },
        });
        purged++;
      } else {
        kept++;
      }
    }

    return { scanned: flagged.length, purged, kept };
  }

  // ── Distinct zones ────────────────────────────────────────────────────────────

  async getZones() {
    const rows = await this.prisma.$queryRaw<{ zone: string }[]>`
      SELECT DISTINCT zone FROM demolition_properties
      WHERE zone IS NOT NULL ORDER BY zone
    `;
    return rows.map(r => r.zone);
  }

  // ── Live address check (during case creation) ─────────────────────────────────

  async checkAddress(query: { address: string; pincode?: string; ownerName?: string }) {
    const { address, pincode, ownerName } = query;
    if (!address || address.trim().length < 4) return { matches: [] };

    const full = `${address}${pincode ? ' ' + pincode : ''}`;
    if (isNonDelhiAddress(full)) return { matches: [] };

    const aliases = await this.loadAliases();
    const caseNorm = normalizeAddress(full, aliases);

    const candidates = await this.searchCandidates(caseNorm);

    const scored = candidates.map(dp => {
      const dbNorm = normalizeAddress(dp.address, aliases);
      const { confidence, reasons, dominant } = rankMatch(
        caseNorm, dbNorm, ownerName ?? null, dp.ownerName ?? null,
      );
      return {
        id: dp.id,
        address: dp.address,
        zone: dp.zone,
        locality: dp.locality,
        ownerName: dp.ownerName,
        noticeDate: dp.noticeDate,
        noticeNumber: dp.noticeNumber,
        bookingId: dp.bookingId,
        confidence,
        reasons,
        matchReason: dominant,
      };
    });

    return {
      matches: scored
        .filter(s => s.confidence >= 40)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6),
    };
  }

  // ── Alias management ──────────────────────────────────────────────────────────

  async getAliases() {
    return this.prisma.addressAlias.findMany({ orderBy: { alias: 'asc' } });
  }

  async upsertAlias(alias: string, canonical: string, zone?: string) {
    const result = await this.prisma.addressAlias.upsert({
      where: { alias: alias.toUpperCase() },
      create: { alias: alias.toUpperCase(), canonical: canonical.toUpperCase(), zone },
      update: { canonical: canonical.toUpperCase(), zone },
    });
    this.invalidateAliasCache();
    return result;
  }

  async deleteAlias(alias: string) {
    const result = await this.prisma.addressAlias.delete({
      where: { alias: alias.toUpperCase() },
    });
    this.invalidateAliasCache();
    return result;
  }
}
