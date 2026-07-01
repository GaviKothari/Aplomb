import { Injectable, Logger } from '@nestjs/common';
import {
  FIELD_PATTERNS,
  SINGLE_VALUE_FIELDS,
  BOUNDARY_FIELDS,
} from './patterns/field-patterns';
import { normalizeText, normalizeDate, normalizePincode } from './patterns/normalizer';

export interface ExtractedField {
  fieldKey: string;
  fieldValue: string;
  confidence: number;
  sourcePage: number | null;
  sourceLine: string | null;
  sourceDocumentId: string | null;
  label: string;
}

export interface PageText {
  pageNumber: number;
  text: string;
  documentId: string;
}

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  extractFromPages(pages: PageText[]): ExtractedField[] {
    const allText = pages.map(p => p.text).join('\n\n---PAGE---\n\n');
    const normalized = normalizeText(allText);

    const results = new Map<string, ExtractedField>();

    for (const pattern of FIELD_PATTERNS) {
      for (const pageInfo of pages) {
        const pageText = normalizeText(pageInfo.text);
        const matches = this.runPatterns(pattern, pageText, pageInfo, normalized);
        for (const match of matches) {
          const existing = results.get(match.fieldKey);
          // For single-value fields, keep highest confidence
          if (!existing || match.confidence > existing.confidence) {
            results.set(match.fieldKey, match);
          }
        }
      }
    }

    // Post-process: normalize specific fields
    const fields = Array.from(results.values());
    return this.postProcess(fields);
  }

  private runPatterns(
    pattern: { field: string; label: string; patterns: RegExp[]; confidence: number; extractor?: (m: RegExpMatchArray, full: string) => string | null },
    text: string,
    page: PageText,
    fullText: string,
  ): ExtractedField[] {
    const found: ExtractedField[] = [];

    for (const regex of pattern.patterns) {
      // Reset lastIndex for global regexes
      regex.lastIndex = 0;
      let match: RegExpMatchArray | null;

      // Use exec for global flag to get all matches
      if (regex.flags.includes('g')) {
        while ((match = regex.exec(text)) !== null) {
          const value = pattern.extractor
            ? pattern.extractor(match, fullText)
            : (match[1] ?? match[0])?.trim() ?? null;

          if (!value || value.trim().length === 0) continue;

          const sourceLine = this.extractSourceLine(text, match.index ?? 0);

          found.push({
            fieldKey: pattern.field,
            fieldValue: value,
            confidence: this.adjustConfidence(pattern.confidence, value, pattern.field),
            sourcePage: page.pageNumber,
            sourceLine: sourceLine.slice(0, 200),
            sourceDocumentId: page.documentId,
            label: pattern.label,
          });

          // For single-value fields, stop after first match
          if (SINGLE_VALUE_FIELDS.has(pattern.field)) break;
        }
      } else {
        match = text.match(regex);
        if (match) {
          const value = pattern.extractor
            ? pattern.extractor(match, fullText)
            : (match[1] ?? match[0])?.trim() ?? null;

          if (value && value.trim().length > 0) {
            found.push({
              fieldKey: pattern.field,
              fieldValue: value,
              confidence: this.adjustConfidence(pattern.confidence, value, pattern.field),
              sourcePage: page.pageNumber,
              sourceLine: this.extractSourceLine(text, match.index ?? 0).slice(0, 200),
              sourceDocumentId: page.documentId,
              label: pattern.label,
            });
          }
        }
      }

      if (found.length > 0 && SINGLE_VALUE_FIELDS.has(pattern.field)) break;
    }

    return found;
  }

  private postProcess(fields: ExtractedField[]): ExtractedField[] {
    return fields.map(f => {
      switch (f.fieldKey) {
        case 'pincode':
          return { ...f, fieldValue: normalizePincode(f.fieldValue) };
        case 'registrationDate':
          return { ...f, fieldValue: normalizeDate(f.fieldValue) ?? f.fieldValue };
        case 'ownerName':
        case 'coOwnerName':
          return { ...f, fieldValue: this.cleanName(f.fieldValue) };
        case 'totalArea':
        case 'builtUpArea':
        case 'superArea':
        case 'carpetArea':
          return { ...f, fieldValue: this.normalizeAreaValue(f.fieldValue) };
        default:
          return f;
      }
    }).filter(f => f.fieldValue && f.fieldValue.length > 0);
  }

  private cleanName(name: string): string {
    return name
      .replace(/\b(Shri|Smt|Mr|Mrs|Ms|Dr|Late)\.?\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/,\s*$/, '');
  }

  private normalizeAreaValue(raw: string): string {
    return raw
      .replace(/sq\.?\s*ft\.?/gi, 'sqft')
      .replace(/sq\.?\s*m(?:eter)?\.?/gi, 'sqm')
      .replace(/sq\.?\s*yd\.?/gi, 'sqyd')
      .replace(/square\s+feet/gi, 'sqft')
      .replace(/square\s+meter/gi, 'sqm')
      .replace(/,/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private adjustConfidence(base: number, value: string, field: string): number {
    let conf = base;
    // Short values are less reliable
    if (value.length < 3) conf -= 0.10;
    // Pincode must be exactly 6 digits
    if (field === 'pincode' && !/^\d{6}$/.test(value.replace(/\D/g, ''))) conf -= 0.20;
    // Names shouldn't be all caps or all lower
    if (['ownerName', 'coOwnerName'].includes(field)) {
      if (value === value.toUpperCase()) conf -= 0.05;
    }
    return Math.max(0.1, Math.min(1.0, conf));
  }

  private extractSourceLine(text: string, index: number): string {
    const start = text.lastIndexOf('\n', index) + 1;
    const end   = text.indexOf('\n', index);
    return text.slice(start, end === -1 ? text.length : end).trim();
  }

  /** Merge multiple extraction results, preferring higher confidence when duplicate keys */
  mergeResults(a: ExtractedField[], b: ExtractedField[]): ExtractedField[] {
    const merged = new Map<string, ExtractedField>();
    for (const f of [...a, ...b]) {
      const ex = merged.get(f.fieldKey);
      if (!ex || f.confidence > ex.confidence) merged.set(f.fieldKey, f);
    }
    return Array.from(merged.values());
  }

  buildMasterJson(fields: ExtractedField[]): Record<string, string | null> {
    const obj: Record<string, string | null> = {};
    for (const f of fields) {
      obj[f.fieldKey] = f.fieldValue;
    }
    return obj;
  }
}
