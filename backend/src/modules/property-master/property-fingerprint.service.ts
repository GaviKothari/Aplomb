import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash, randomUUID } from 'crypto';

export interface FingerprintField {
  fieldKey:   string;
  fieldValue: string;
}

// The fields we use to fingerprint a property.
// Need at least 2 to be present for a fingerprint to be generated.
const FINGERPRINT_KEYS = [
  'plotNumber',      // khasra / plot / survey
  'khataNumber',
  'houseNumber',
  'pincode',
  'locality',
  'registrationNumber',
  'propertyId',      // MCD/municipal property ID
];

// How many fingerprint keys must match to call it a "hit"
const MIN_MATCH_KEYS = 2;

@Injectable()
export class PropertyFingerprintService {
  private readonly logger = new Logger(PropertyFingerprintService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Called after successful extraction — save fingerprint for future lookups
  async saveFingerprint(
    caseId:     string,
    fields:     FingerprintField[],
    masterJson: Record<string, string>,
  ): Promise<void> {
    const keyFields = this.extractKeyFields(fields);
    if (Object.keys(keyFields).length < MIN_MATCH_KEYS) return; // not enough data

    const fingerprint = this.buildFingerprint(keyFields);
    const db = this.prisma as any;

    try {
      await db.propertyFingerprint.upsert({
        where:  { fingerprint },
        create: { id: randomUUID(), fingerprint, caseId, masterJson, keyFields },
        update: { masterJson, keyFields, updatedAt: new Date() },
      });
      this.logger.log(`[FINGERPRINT] Saved ${fingerprint} for case ${caseId}`);
    } catch (e: any) {
      this.logger.warn(`[FINGERPRINT] Save failed: ${e.message}`);
    }
  }

  // Called immediately after basic extraction — look for historical match
  // Returns prefilled fields with confidence if found, empty array if not
  async findHistoricalMatch(fields: FingerprintField[]): Promise<{
    matched:      boolean;
    confidence:   number;
    prefillFields: FingerprintField[];
    sourceCaseId:  string | null;
  }> {
    const keyFields = this.extractKeyFields(fields);
    if (Object.keys(keyFields).length < MIN_MATCH_KEYS) {
      return { matched: false, confidence: 0, prefillFields: [], sourceCaseId: null };
    }

    const fingerprint = this.buildFingerprint(keyFields);
    const db = this.prisma as any;

    try {
      const hit = await db.propertyFingerprint.findUnique({ where: { fingerprint } });
      if (!hit) {
        // Try partial match: find fingerprints sharing at least 2 key values
        return await this.partialMatch(keyFields, db);
      }

      const prefillFields = Object.entries(hit.masterJson as Record<string, string>).map(
        ([fieldKey, fieldValue]) => ({ fieldKey, fieldValue }),
      );

      this.logger.log(`[FINGERPRINT] Exact match ${fingerprint} → case ${hit.caseId} (${prefillFields.length} fields)`);
      return { matched: true, confidence: 0.95, prefillFields, sourceCaseId: hit.caseId };
    } catch (e: any) {
      this.logger.warn(`[FINGERPRINT] Lookup failed: ${e.message}`);
      return { matched: false, confidence: 0, prefillFields: [], sourceCaseId: null };
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private extractKeyFields(fields: FingerprintField[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const f of fields) {
      if (FINGERPRINT_KEYS.includes(f.fieldKey) && f.fieldValue?.trim()) {
        result[f.fieldKey] = this.normalizeKeyValue(f.fieldValue);
      }
    }
    return result;
  }

  private normalizeKeyValue(v: string): string {
    return v.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9\/\-]/g, '');
  }

  private buildFingerprint(keyFields: Record<string, string>): string {
    const sorted = Object.entries(keyFields)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return createHash('sha256').update(sorted).digest('hex').slice(0, 20);
  }

  private async partialMatch(
    keyFields: Record<string, string>,
    db:        any,
  ): Promise<{ matched: boolean; confidence: number; prefillFields: FingerprintField[]; sourceCaseId: string | null }> {
    // Fetch recent fingerprints and score them by overlap
    const recent = await db.propertyFingerprint.findMany({ take: 500, orderBy: { updatedAt: 'desc' } });

    let bestScore = 0;
    let bestHit: any = null;

    for (const fp of recent) {
      const stored = fp.keyFields as Record<string, string>;
      let matches = 0;
      for (const [k, v] of Object.entries(keyFields)) {
        if (stored[k] && stored[k] === v) matches++;
      }
      const score = matches / Math.max(Object.keys(keyFields).length, Object.keys(stored).length);
      if (score > bestScore) { bestScore = score; bestHit = fp; }
    }

    if (!bestHit || bestScore < 0.6) {
      return { matched: false, confidence: 0, prefillFields: [], sourceCaseId: null };
    }

    const prefillFields = Object.entries(bestHit.masterJson as Record<string, string>).map(
      ([fieldKey, fieldValue]) => ({ fieldKey, fieldValue }),
    );

    this.logger.log(`[FINGERPRINT] Partial match ${Math.round(bestScore * 100)}% → case ${bestHit.caseId}`);
    return {
      matched:      true,
      confidence:   Math.round(bestScore * 100) / 100,
      prefillFields,
      sourceCaseId: bestHit.caseId,
    };
  }
}
