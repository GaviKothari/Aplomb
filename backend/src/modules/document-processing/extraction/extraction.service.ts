import { Injectable, Logger } from '@nestjs/common';
import { PropertyEntityEngine, PageInput } from '../entity/property-entity-engine';

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
  // Kept for backward compat with DB writes; entity engine doesn't classify
  classification: { documentType: string; confidence: number };
}

const engine = new PropertyEntityEngine();

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  // Primary entry point
  extractWithClassification(pages: PageText[], _hintDocType?: string): ExtractionResult {
    const inputs: PageInput[] = pages.map(p => ({
      pageNumber:  p.pageNumber,
      text:        p.text,
      documentId:  p.documentId,
      wordCount:   p.wordCount,
    }));

    const entities = engine.extract(inputs);
    const fields   = entities.map(e => ({ ...e })) as ExtractedField[];

    this.logger.log(`[EXTRACT] Entity engine extracted ${fields.length} fields from ${pages.length} pages`);

    return {
      fields,
      // No classification — we don't need it anymore
      classification: { documentType: 'UNIVERSAL', confidence: 1.0 },
    };
  }

  // Legacy shim — existing callers that only need fields
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
}
