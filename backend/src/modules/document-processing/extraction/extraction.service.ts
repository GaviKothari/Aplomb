import { Injectable, Logger } from '@nestjs/common';
import { PropertyEntityEngine, PageInput } from '../entity/property-entity-engine';
import { FIELD_PATTERNS, SINGLE_VALUE_FIELDS } from './patterns/field-patterns';
import { normalizeText } from './patterns/normalizer';

export interface ExtractedField {
  fieldKey:         string;
  label:            string;
  fieldValue:       string;
  confidence:       number;
  sourcePage:       number | null;
  sourceLine:       string | null;
  sourceDocumentId: string | null;
}

export interface PageText {
  pageNumber:  number;
  text:        string;
  documentId:  string;
  wordCount?:  number;
}

export interface ExtractionResult {
  fields:         ExtractedField[];
  classification: { documentType: string; confidence: number };
}

const engine = new PropertyEntityEngine();

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  extractWithClassification(pages: PageText[], _hintDocType?: string): ExtractionResult {
    // ── Pass 1: Universal entity engine (keyword → nearby text window) ──────
    const inputs: PageInput[] = pages.map(p => ({
      pageNumber: p.pageNumber,
      text:       p.text,
      documentId: p.documentId,
      wordCount:  p.wordCount,
    }));
    const engineFields = engine.extract(inputs) as ExtractedField[];

    // ── Pass 2: Deterministic regex patterns (old system, proven on Indian docs) ─
    const patternFields = this.runFieldPatterns(pages);

    // ── Merge: higher confidence wins per field key ───────────────────────────
    const fields = this.mergeResults(engineFields, patternFields);

    this.logger.log(
      `[EXTRACT] engine=${engineFields.length} patterns=${patternFields.length} merged=${fields.length}`,
    );

    return { fields, classification: { documentType: 'UNIVERSAL', confidence: 1.0 } };
  }

  extractFromPages(pages: PageText[]): ExtractedField[] {
    return this.extractWithClassification(pages).fields;
  }

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
    for (const f of fields) obj[f.fieldKey] = f.fieldValue;
    return obj;
  }

  // ── Regex pattern pass ─────────────────────────────────────────────────────

  private runFieldPatterns(pages: PageText[]): ExtractedField[] {
    const results = new Map<string, ExtractedField>();

    for (const page of pages) {
      const text = normalizeText(page.text);
      if (!text || text.split(/\s+/).length < 10) continue;

      for (const pat of FIELD_PATTERNS) {
        const existing = results.get(pat.field);
        if (existing && SINGLE_VALUE_FIELDS.has(pat.field) && existing.confidence >= pat.confidence) {
          continue;
        }

        let found = false;
        for (const rxSrc of pat.patterns) {
          // Re-create regex with global flag so exec() can iterate
          const rx = new RegExp(rxSrc.source, 'gi');
          let m: RegExpExecArray | null;

          while ((m = rx.exec(text)) !== null) {
            const value = pat.extractor
              ? pat.extractor(m, text)
              : (m[1] ?? m[0])?.trim() ?? null;

            if (!value || value.length < 1) continue;

            const cur = results.get(pat.field);
            if (!cur || pat.confidence > cur.confidence) {
              results.set(pat.field, {
                fieldKey:         pat.field,
                label:            pat.label,
                fieldValue:       value.slice(0, 400),
                confidence:       pat.confidence,
                sourcePage:       page.pageNumber,
                sourceLine:       this.srcLine(text, m.index),
                sourceDocumentId: page.documentId,
              });
            }

            if (SINGLE_VALUE_FIELDS.has(pat.field)) { found = true; break; }
          }

          if (found) break;
        }
      }
    }

    return Array.from(results.values());
  }

  private srcLine(text: string, idx: number): string {
    const start = text.lastIndexOf('\n', idx) + 1;
    const end   = text.indexOf('\n', idx);
    return text.slice(start, end === -1 ? Math.min(text.length, start + 200) : end).trim().slice(0, 200);
  }
}
