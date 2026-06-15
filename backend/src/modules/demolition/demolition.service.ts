import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Stop-words for the CROSS-MATCH engine (case → DB, used by matchCase / matchAllCases).
// Aggressive filtering so only distinctive locality words survive.
const STOP = new Set([
  'NEW', 'DELHI', 'THE', 'AND', 'OF', 'AT', 'IN', 'ON', 'TO', 'FOR',
  'NEAR', 'OPP', 'OPPOSITE', 'ADJOINING', 'PART', 'NO', 'FLOOR',
  'GROUND', 'FIRST', 'SECOND', 'FLAT', 'BLOCK', 'SECTOR', 'PHASE',
  'POCKET', 'PLOT', 'HOUSE', 'KHASRA', 'DDA', 'MIG', 'LIG', 'EWS',
  'ZONE', 'ROAD', 'MARG', 'STREET', 'GALI', 'MARKET', 'COLONY',
  'EXTENSION', 'EXTN', 'NAGAR', 'VIHAR',
]);

// Stop-words for the LIVE CHECK engine (address typed during case creation).
// Deliberately lighter — keeps KHASRA, PLOT, H, DDA, SECTOR etc. because
// when someone types "KHASRA NO. 812" those words ARE the entire signal.
const LIGHT_STOP = new Set([
  'NEW', 'DELHI', 'THE', 'AND', 'OF', 'AT', 'IN', 'ON', 'TO', 'FOR',
  'NEAR', 'OPP', 'OPPOSITE', 'ADJOINING', 'PART', 'NO',
  'FLOOR', 'GROUND', 'FIRST', 'SECOND',
  'MIG', 'LIG', 'EWS',
  'ZONE', 'ROAD', 'MARG', 'STREET', 'GALI',
]);

// Locality synonyms — map variant spellings to a canonical form
const LOCALITY_ALIASES: Record<string, string> = {
  'SARITA':    'SARITAVIHAR', 'SARITHA':   'SARITAVIHAR',
  'LAJPAT':    'LAJPATNAGAR', 'LAJPAT NAGAR': 'LAJPATNAGAR',
  'VASANT':    'VASANTKUNJ',  'DWARKA':    'DWARKA',
  'ROHINI':    'ROHINI',      'SHAHDARA':  'SHAHDARA',
  'JANAKPURI': 'JANAKPURI',   'UTTAM':     'UTTAMNAGAR',
  'TAGORE':    'TAGOREGARDEN','PASCHIM':   'PASCHIMVIHAR',
  'VIKASPURI': 'VIKASPURI',   'PITAMPURA': 'PITAMPURA',
  'MAYUR':     'MAYURVIHAR',  'PATPARGANJ':'PATPARGANJ',
  'KONDLI':    'KONDLI',      'GEETA':     'GEETACOLONY',
};

/**
 * Extract significant address tokens (≥3 chars, not a stop-word, not a trivial number).
 * Keeps: alphanumeric codes (G-91, RZ-11C), 5-digit numbers (khasra), locality names.
 */
function tokenise(address: string): string[] {
  const words = address
    .toUpperCase()
    .replace(/[^\w\s\/\-]/g, ' ')
    .split(/\s+/);

  return [...new Set(
    words.filter(w => {
      if (w.length < 3) return false;
      if (STOP.has(w)) return false;
      if (/^\d+$/.test(w) && w.length < 5) return false;
      return true;
    })
  )].slice(0, 12);
}

/**
 * Extract plot/house/khasra/flat numbers and alphanumeric codes from an address.
 * These are high-precision identifiers that strongly confirm a match.
 *
 * Examples caught:
 *   "H.No. 234"       → ["234"]
 *   "Khasra No 12/3"  → ["12/3", "12"]
 *   "G-91"            → ["G-91"]
 *   "RZ-11C"          → ["RZ-11C"]
 *   "C-7/8"           → ["C-7/8"]
 *   "Plot 45-B"       → ["45-B", "45"]
 */
function extractPlotNumbers(address: string): string[] {
  const upper = address.toUpperCase().replace(/[^\w\s\/\-\.]/g, ' ');
  const found = new Set<string>();

  // Alphanumeric codes: letter(s) + dash/slash + digits ± letter
  for (const m of upper.matchAll(/\b([A-Z]{1,3}[-\/]\d+[A-Z]?(?:[-\/]\d+)?)\b/g))
    found.add(m[1]);

  // Numbers following contextual keywords
  for (const m of upper.matchAll(
    /(?:H\.?\s*NO?\.?\s*|PLOT\s*NO?\.?\s*|KHASRA\s*NO?\.?\s*|FLAT\s*NO?\.?\s*|DOOR\s*NO?\.?\s*|SHOP\s*NO?\.?\s*|SURVEY\s*NO?\.?\s*)(\d+(?:\/\d+)?(?:-[A-Z\d]+)?)/g,
  )) found.add(m[1]);

  // Standalone numbers ≥ 2 digits (catches plot numbers without a prefix)
  for (const m of upper.matchAll(/\b(\d{2,}(?:\/\d+)?)\b/g))
    if (m[1].length <= 6) found.add(m[1]);  // skip PIN-like 7+ digit runs

  return [...found].slice(0, 12);
}

/**
 * Normalise locality words: collapse synonyms, strip trailing suffixes like "NAGAR/VIHAR/COLONY".
 * Returns a set of canonical locality tokens to compare across formats.
 */
function localityTokens(address: string): Set<string> {
  const upper = address.toUpperCase();
  const out = new Set<string>();

  for (const [variant, canonical] of Object.entries(LOCALITY_ALIASES)) {
    if (upper.includes(variant)) out.add(canonical);
  }

  // Also keep any word ≥ 5 chars that is NOT a stop-word (area names)
  for (const w of upper.replace(/[^\w\s]/g, ' ').split(/\s+/)) {
    if (w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w)) out.add(w);
  }

  return out;
}

/**
 * Lighter tokeniser used during LIVE address check (case creation form).
 * Keeps: KHASRA, PLOT, HOUSE, DDA, SECTOR, BLOCK — and any 2+ digit number.
 * These words + short numbers ARE the only signal when someone types
 * "KHASRA NO. 812" or "PLOT 45" without a full locality name.
 */
function lightTokenise(address: string): string[] {
  const words = address
    .toUpperCase()
    .replace(/[^\w\s\/\-]/g, ' ')  // keep / and - for compound identifiers
    .split(/\s+/);

  return [...new Set(
    words.filter(w => {
      if (w.length < 2) return false;
      if (LIGHT_STOP.has(w)) return false;
      // Allow pure numbers ≥ 2 digits (captures khasra/plot/house numbers)
      if (/^\d+$/.test(w)) return w.length >= 2;
      return true;
    })
  )].slice(0, 15);
}

/**
 * True when two plot/khasra numbers refer to the same property.
 * "812" is compatible with "812/4", "812-A", "812A" — the user may not know the sub-number.
 * "812/4" is also compatible with "812" (partial match from DB side).
 */
function plotCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  // Prefix match: "812" matches "812/4", "812-A", "812A" and vice-versa
  const aBase = a.replace(/[\/\-][A-Z\d]+$/, '');
  const bBase = b.replace(/[\/\-][A-Z\d]+$/, '');
  return aBase === bBase || aBase === b || bBase === a;
}

@Injectable()
export class DemolitionService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats & analytics ────────────────────────────────────────────────────────

  async getStats() {
    const [total, zoneRows, yearRows, recentAlerts, matchedCases] =
      await Promise.all([
        this.prisma.demolitionProperty.count(),
        this.prisma.$queryRaw<{ zone: string; count: bigint }[]>`
          SELECT zone, COUNT(*) AS count
          FROM demolition_properties
          WHERE zone IS NOT NULL
          GROUP BY zone
          ORDER BY count DESC
        `,
        this.prisma.$queryRaw<{ year: string; count: bigint }[]>`
          SELECT TO_CHAR("noticeDate", 'YYYY') AS year, COUNT(*) AS count
          FROM demolition_properties
          WHERE EXTRACT(YEAR FROM "noticeDate") BETWEEN 2007 AND 2026
          GROUP BY year
          ORDER BY year ASC
        `,
        this.prisma.demolitionAlert.count({
          where: { matchStatus: { not: 'DISMISSED' } },
        }),
        this.prisma.demolitionAlert.count({
          where: { matchStatus: 'CONFIRMED' },
        }),
      ]);

    return {
      total,
      matchedCases,
      recentAlerts,
      zones: zoneRows.map(r => ({ zone: r.zone, count: Number(r.count) })),
      yearTrend: yearRows.map(r => ({ year: r.year, count: Number(r.count) })),
    };
  }

  // ── List / search demolition properties ─────────────────────────────────────

  async findAll(query: {
    search?: string; zone?: string; page?: number; limit?: number;
  }) {
    const page  = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const skip  = (page - 1) * limit;

    const where: Prisma.DemolitionPropertyWhereInput = {};
    if (query.zone && query.zone !== 'all') where.zone = query.zone;
    if (query.search) {
      where.OR = [
        { address:      { contains: query.search, mode: 'insensitive' } },
        { ownerName:    { contains: query.search, mode: 'insensitive' } },
        { noticeNumber: { contains: query.search, mode: 'insensitive' } },
        { locality:     { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.demolitionProperty.findMany({
        where,
        skip,
        take: limit,
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

  // ── Cross-match a single case ────────────────────────────────────────────────

  async matchCase(caseId: string) {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, propertyAddress: true, ownerName: true },
    });
    if (!c) throw new NotFoundException('Case not found');

    const tokens = tokenise(c.propertyAddress);
    if (tokens.length === 0) return { matched: 0, alerts: [] };

    // Build ILIKE conditions, one per token
    const conditions = tokens
      .map((_, i) => `address ILIKE $${i + 1}`)
      .join(' OR ');
    const params = tokens.map(t => `%${t}%`);

    const candidates = await this.prisma.$queryRawUnsafe<{
      id: string; address: string; zone: string | null;
      "ownerName": string | null; "noticeDate": Date;
      "noticeNumber": string | null; "bookingId": string | null;
    }[]>(
      `SELECT id, address, zone, "ownerName", "noticeDate", "noticeNumber", "bookingId"
       FROM demolition_properties
       WHERE ${conditions}
       LIMIT 60`,
      ...params,
    );

    const caseTokens = new Set(tokens);
    const alerts: {
      demolitionPropertyId: string;
      score: number;
      matchReason: string;
    }[] = [];

    for (const dp of candidates) {
      const dpTokens = new Set(tokenise(dp.address));
      const overlap  = [...caseTokens].filter(t => dpTokens.has(t)).length;
      const score    = Math.round((overlap / Math.max(caseTokens.size, dpTokens.size)) * 100);

      if (score >= 25) {
        alerts.push({
          demolitionPropertyId: dp.id,
          score,
          matchReason: overlap >= 4 ? 'ADDRESS' : 'PARTIAL',
        });
      }
    }

    // Upsert alerts (skip dismissed ones)
    let created = 0;
    for (const a of alerts.sort((x, y) => y.score - x.score).slice(0, 5)) {
      await this.prisma.demolitionAlert.upsert({
        where: {
          caseId_demolitionPropertyId: {
            caseId,
            demolitionPropertyId: a.demolitionPropertyId,
          },
        },
        create: {
          caseId,
          demolitionPropertyId: a.demolitionPropertyId,
          matchStatus:    a.score >= 60 ? 'CONFIRMED' : 'POTENTIAL',
          confidenceScore: a.score,
          matchReason:    a.matchReason,
        },
        update: {
          confidenceScore: a.score,
          matchReason:    a.matchReason,
        },
      });
      created++;
    }

    // Update case flag
    if (created > 0) {
      await this.prisma.case.update({
        where: { id: caseId },
        data: { hasDemolitionAlert: true },
      });
    }

    return { matched: created, alerts: alerts.slice(0, 5) };
  }

  // ── Bulk match all cases (can be slow — run as a background job) ─────────────

  async matchAllCases() {
    const cases = await this.prisma.case.findMany({
      where: { hasDemolitionAlert: false },
      select: { id: true, propertyAddress: true },
      take: 500, // process in chunks
    });

    let total = 0;
    for (const c of cases) {
      const { matched } = await this.matchCase(c.id);
      total += matched;
    }
    return { processed: cases.length, newAlerts: total };
  }

  // ── List all open alerts ─────────────────────────────────────────────────────

  async getAlerts(query: { status?: string; page?: number; limit?: number }) {
    const page  = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip  = (page - 1) * limit;

    const where: Prisma.DemolitionAlertWhereInput = {};
    if (query.status === 'open')      where.matchStatus = { not: 'DISMISSED' };
    if (query.status === 'confirmed') where.matchStatus = 'CONFIRMED';
    if (query.status === 'potential') where.matchStatus = 'POTENTIAL';
    if (query.status === 'dismissed') where.matchStatus = 'DISMISSED';

    const [data, total] = await Promise.all([
      this.prisma.demolitionAlert.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'desc' }],
        include: {
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

  // ── Dismiss / confirm an alert ───────────────────────────────────────────────

  async updateAlertStatus(
    alertId: string,
    status: 'CONFIRMED' | 'DISMISSED',
    reason?: string,
    userId?: string,
  ) {
    return this.prisma.demolitionAlert.update({
      where: { id: alertId },
      data: {
        matchStatus:    status,
        dismissedById:  status === 'DISMISSED' ? userId : null,
        dismissedAt:    status === 'DISMISSED' ? new Date() : null,
        dismissalReason: reason ?? null,
      },
    });
  }

  // ── Distinct zones list ──────────────────────────────────────────────────────

  async getZones() {
    const rows = await this.prisma.$queryRaw<{ zone: string }[]>`
      SELECT DISTINCT zone FROM demolition_properties
      WHERE zone IS NOT NULL ORDER BY zone
    `;
    return rows.map(r => r.zone);
  }

  // ── Smart address cross-check (used during case creation) ────────────────────
  //
  // Uses lightTokenise() instead of tokenise() so "KHASRA NO. 812" isn't reduced
  // to empty string — KHASRA, PLOT, numbers ≥ 2 digits are all kept as signals.
  //
  // Search strategy:
  //   1. General tokens  → each becomes an ILIKE condition  (OR-joined, wide net)
  //   2. Contextual pairs → "KHASRA NO. 812" → also adds  ILIKE '%KHASRA%812%'
  //      for higher-precision candidates alongside the generic ones
  //
  // Scoring (max 100):
  //   Light-token overlap   0-50   weighted fraction of shared tokens
  //   Plot / house number   0-30   plotCompatible() match (812 ≅ 812/4)
  //   Pincode               0-15   6-digit code present in DB address
  //   Owner name            0-15   name token overlap
  //   Locality synonym      +8     canonical area alias found in both
  //
  // Confidence: HIGH ≥ 60 · MEDIUM ≥ 30 · LOW ≥ 10

  async checkAddress(query: {
    address: string;
    pincode?: string;
    ownerName?: string;
  }) {
    const { address, pincode, ownerName } = query;
    if (!address || address.trim().length < 4) return { matches: [] };

    const lightToks   = lightTokenise(address);
    const plotNums    = extractPlotNumbers(address);
    const localitySet = localityTokens(address);

    // 6-digit pincode
    const pincodeVal = (address.match(/\b\d{6}\b/)
      ?? (pincode ? [pincode.match(/\b\d{6}\b/)?.[0]].filter(Boolean) : [])
    )?.[0] ?? null;

    // Owner name tokens
    const ownerWords = ownerName
      ? ownerName.toUpperCase().split(/\s+/).filter(w => w.length >= 3)
      : [];

    if (lightToks.length === 0 && plotNums.length === 0) return { matches: [] };

    // ── Build ILIKE conditions ────────────────────────────────────────────
    // Start with one condition per light token (each term searched individually)
    const singleTerms = [...new Set([...lightToks, ...plotNums])].slice(0, 15);
    const conditions: string[] = singleTerms.map((_, i) => `address ILIKE $${i + 1}`);
    const params: string[]     = singleTerms.map(t => `%${t}%`);

    // Contextual two-word patterns: "KHASRA%812", "PLOT%45", "H%234" etc.
    // These hit the fast-path for entries like "KHASRA NO 812/4 VILLAGE XYZ"
    const upper = address.toUpperCase().replace(/[^\w\s\/\-]/g, ' ');
    const CTX_KEYWORDS = ['KHASRA', 'PLOT', 'SURVEY', 'GATA', 'KHATA', 'HOUSE', 'HNO', 'H NO', 'H.NO'];
    for (const kw of CTX_KEYWORDS) {
      const re = new RegExp(`${kw.replace(/ /g, '\\s+')}\\s*(?:NO?\\.?\\s*)?([\\dA-Z][\\d\\/\\-A-Z]*)`, 'i');
      const m = upper.match(re);
      if (m?.[1]) {
        const ctx = `%${kw.replace(' ', '%')}%${m[1]}%`;
        const idx = params.length + 1;
        conditions.push(`address ILIKE $${idx}`);
        params.push(ctx);
      }
    }

    type DPRow = {
      id: string; address: string; zone: string | null; locality: string | null;
      ownerName: string | null; noticeDate: Date; noticeNumber: string | null; bookingId: string | null;
    };

    const candidates = await this.prisma.$queryRawUnsafe<DPRow[]>(
      `SELECT id, address, zone, locality, "ownerName", "noticeDate", "noticeNumber", "bookingId"
       FROM demolition_properties
       WHERE ${conditions.join(' OR ')}
       LIMIT 100`,
      ...params,
    );

    const scored = candidates.map(dp => {
      const dpLightToks = new Set(lightTokenise(dp.address));
      const inputSet    = new Set(lightToks);

      // 1. Light-token overlap (0-50)
      const overlap   = [...inputSet].filter(t => dpLightToks.has(t)).length;
      const addrScore = inputSet.size === 0
        ? 0
        : Math.round((overlap / Math.max(inputSet.size, dpLightToks.size)) * 50);

      // 2. Plot number match with prefix compatibility (0-30)
      const dpPlotNums  = extractPlotNumbers(dp.address);
      const plotMatches = plotNums.filter(n =>
        dpPlotNums.some(dp => plotCompatible(n, dp)),
      );
      const plotScore = Math.min(30, plotMatches.length * 15);

      // 3. Pincode match (0-15)
      const pincodeScore = pincodeVal && dp.address.includes(pincodeVal) ? 15 : 0;

      // 4. Owner name token overlap (0-15)
      let ownerScore = 0;
      if (ownerWords.length > 0 && dp.ownerName) {
        const dpOwner  = dp.ownerName.toUpperCase();
        const hits     = ownerWords.filter(w => dpOwner.includes(w)).length;
        ownerScore     = Math.round((hits / ownerWords.length) * 15);
      }

      // 5. Locality synonym bonus (+8)
      const dpLocSet     = localityTokens(dp.address);
      const localityHit  = [...localitySet].some(l => dpLocSet.has(l));
      const localityBonus = localityHit ? 8 : 0;

      const totalScore = Math.min(100, addrScore + plotScore + pincodeScore + ownerScore + localityBonus);

      return {
        id:           dp.id,
        address:      dp.address,
        zone:         dp.zone,
        locality:     dp.locality,
        ownerName:    dp.ownerName,
        noticeDate:   dp.noticeDate,
        noticeNumber: dp.noticeNumber,
        bookingId:    dp.bookingId,
        score:        totalScore,
        matchedOn: {
          addressTokens: overlap > 0,
          plotNumbers:   plotMatches.length > 0,
          matchedPlots:  plotMatches,
          pincode:       pincodeScore > 0,
          ownerName:     ownerScore > 0,
          locality:      localityHit,
        },
        confidence: totalScore >= 60 ? 'HIGH' : totalScore >= 30 ? 'MEDIUM' : 'LOW',
      };
    });

    // Deduplicate by id, keep highest score
    const seen = new Map<string, typeof scored[0]>();
    for (const s of scored) {
      const prev = seen.get(s.id);
      if (!prev || s.score > prev.score) seen.set(s.id, s);
    }

    return {
      matches: [...seen.values()]
        .filter(s => s.score >= 10)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    };
  }
}
