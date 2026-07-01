import { Injectable, Logger } from '@nestjs/common';
import {
  FIELD_PATTERNS,
  SINGLE_VALUE_FIELDS,
} from './patterns/field-patterns';
import { normalizeText, normalizeDate, normalizePincode } from './patterns/normalizer';
import { DocumentClassifier, ClassificationResult, KnownDocType } from '../classification/document-classifier';
import { getTemplate, TEMPLATE_REGISTRY } from './templates';
import { TemplateField } from './templates/types';

// Maps user-facing upload types → KnownDocType for template fallback
const UPLOAD_TYPE_TO_KNOWN: Record<string, KnownDocType> = {
  SALE_DEED:               'SALE_DEED',
  REGISTRY:                'REGISTRY',
  REGISTRY_COPY:           'REGISTRY',
  AGREEMENT_TO_SELL:       'AGREEMENT_TO_SELL',
  PREVIOUS_VALUATION:      'PREVIOUS_VALUATION',
  VALUATION_REPORT:        'PREVIOUS_VALUATION',
  TAX_RECEIPT:             'TAX_RECEIPT',
  PROPERTY_TAX_RECEIPT:    'TAX_RECEIPT',
  MUTATION:                'MUTATION',
  MUTATION_KHATAUNI:       'MUTATION',
  BUILDING_PLAN:           'BUILDING_PLAN',
  FLOOR_PLAN:              'BUILDING_PLAN',
  LAYOUT_PLAN:             'BUILDING_PLAN',
  APPROVED_PLAN:           'BUILDING_PLAN',
  SANCTION_LETTER:         'SANCTION_LETTER',
  ALLOTMENT_LETTER:        'ALLOTMENT_LETTER',
  POSSESSION_LETTER:       'POSSESSION_LETTER',
  POSSESSION_CERTIFICATE:  'POSSESSION_LETTER',
  CHAIN_OF_TITLE:          'CHAIN_OF_TITLE',
  ENCUMBRANCE_CERTIFICATE: 'CHAIN_OF_TITLE',
  OCCUPANCY_CERTIFICATE:   'OCCUPANCY_CERTIFICATE',
  COMPLETION_CERTIFICATE:  'OCCUPANCY_CERTIFICATE',
};

export interface ExtractedField {
  fieldKey:        string;
  fieldValue:      string;
  confidence:      number;
  sourcePage:      number | null;
  sourceLine:      string | null;
  sourceDocumentId: string | null;
  label:           string;
}

export interface PageText {
  pageNumber: number;
  text:       string;
  documentId: string;
}

export interface ExtractionResult {
  fields:         ExtractedField[];
  classification: ClassificationResult;
}

const classifier = new DocumentClassifier();

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  // Main entry point — returns fields and classification in one call
  extractFromPages(pages: PageText[]): ExtractedField[] {
    return this.extractWithClassification(pages).fields;
  }

  extractWithClassification(pages: PageText[], hintDocType?: string): ExtractionResult {
    const fullText   = pages.map(p => p.text).join('\n\n---PAGE---\n\n');
    const normalized = normalizeText(fullText);

    // Step 1: Classify the document
    const classification = classifier.classify(normalized);
    this.logger.log(
      `[EXTRACT] Classified as ${classification.documentType} (confidence: ${classification.confidence}) ` +
      `— matched: [${classification.matchedKeywords.slice(0, 5).join(', ')}]`,
    );

    // If classifier is uncertain (OTHER or low confidence), fall back to the user's manually chosen type
    let effectiveType: KnownDocType = classification.documentType;
    if ((effectiveType === 'OTHER' || classification.confidence < 0.60) && hintDocType) {
      const mapped = UPLOAD_TYPE_TO_KNOWN[hintDocType] ?? (hintDocType as KnownDocType);
      if (TEMPLATE_REGISTRY[mapped]) {
        effectiveType = mapped;
        this.logger.log(`[EXTRACT] Classifier uncertain — using upload hint: ${hintDocType} → ${effectiveType}`);
      }
    }

    const results = new Map<string, ExtractedField>();

    // Step 2: Apply per-type template if available
    const template = getTemplate(effectiveType);
    if (template) {
      this.logger.log(`[EXTRACT] Using template: ${template.label}`);
      const templateFields = this.extractWithTemplate(pages, normalized, template.fields, classification.confidence);
      for (const f of templateFields) {
        results.set(f.fieldKey, f);
      }
    }

    // Step 3: Apply generic patterns as supplement/fallback
    // Template fields take precedence — only overwrite with generic if higher confidence
    for (const pattern of FIELD_PATTERNS) {
      for (const pageInfo of pages) {
        const pageText = normalizeText(pageInfo.text);
        const matches  = this.runGenericPattern(pattern, pageText, pageInfo, normalized);
        for (const match of matches) {
          const existing = results.get(match.fieldKey);
          if (!existing || match.confidence > existing.confidence) {
            results.set(match.fieldKey, match);
          }
        }
      }
    }

    const fields = this.postProcess(Array.from(results.values()));

    if (template && fields.length === 0) {
      this.logger.warn(`[EXTRACT] Template matched but 0 fields extracted for ${classification.documentType}`);
    } else {
      this.logger.log(`[EXTRACT] Extracted ${fields.length} fields total`);
    }

    return { fields, classification };
  }

  // ── Template-based extraction ─────────────────────────────────────────────

  private extractWithTemplate(
    pages:         PageText[],
    fullNormalized: string,
    templateFields: TemplateField[],
    classConfidence: number,
  ): ExtractedField[] {
    const results = new Map<string, ExtractedField>();

    for (const tf of templateFields) {
      for (const pageInfo of pages) {
        const pageText = normalizeText(pageInfo.text);

        for (const regex of tf.patterns) {
          regex.lastIndex = 0;
          const match = pageText.match(regex) ?? fullNormalized.match(regex);
          if (!match) continue;

          const raw = (match[1] ?? match[0])?.trim();
          if (!raw || raw.length < 1) continue;

          const value = tf.transform ? tf.transform(raw) : raw;
          if (!value || value.length < 1) continue;

          // Template match gets a bonus from classification confidence
          const boost = (tf.boost ?? 0) + (tf.important ? 0.05 : 0) + (classConfidence * 0.1);
          const confidence = Math.min(0.92, 0.72 + boost);

          const existing = results.get(tf.fieldKey);
          if (!existing || confidence > existing.confidence) {
            results.set(tf.fieldKey, {
              fieldKey:         tf.fieldKey,
              fieldValue:       value.slice(0, 500),
              confidence,
              sourcePage:       pageInfo.pageNumber,
              sourceLine:       this.extractSourceLine(pageText, match.index ?? 0).slice(0, 200),
              sourceDocumentId: pageInfo.documentId,
              label:            tf.label,
            });
          }
          break; // first matching pattern wins per field
        }
      }
    }

    return Array.from(results.values());
  }

  // ── Generic pattern runner (existing logic) ───────────────────────────────

  private runGenericPattern(
    pattern: { field: string; label: string; patterns: RegExp[]; confidence: number; extractor?: (m: RegExpMatchArray, full: string) => string | null },
    text:    string,
    page:    PageText,
    fullText: string,
  ): ExtractedField[] {
    const found: ExtractedField[] = [];

    for (const regex of pattern.patterns) {
      regex.lastIndex = 0;
      let match: RegExpMatchArray | null;

      if (regex.flags.includes('g')) {
        while ((match = regex.exec(text)) !== null) {
          const value = pattern.extractor
            ? pattern.extractor(match, fullText)
            : (match[1] ?? match[0])?.trim() ?? null;

          if (!value || value.trim().length === 0) continue;

          found.push({
            fieldKey:         pattern.field,
            fieldValue:       value,
            confidence:       this.adjustConfidence(pattern.confidence, value, pattern.field),
            sourcePage:       page.pageNumber,
            sourceLine:       this.extractSourceLine(text, match.index ?? 0).slice(0, 200),
            sourceDocumentId: page.documentId,
            label:            pattern.label,
          });

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
              fieldKey:         pattern.field,
              fieldValue:       value,
              confidence:       this.adjustConfidence(pattern.confidence, value, pattern.field),
              sourcePage:       page.pageNumber,
              sourceLine:       this.extractSourceLine(text, match.index ?? 0).slice(0, 200),
              sourceDocumentId: page.documentId,
              label:            pattern.label,
            });
          }
        }
      }

      if (found.length > 0 && SINGLE_VALUE_FIELDS.has(pattern.field)) break;
    }

    return found;
  }

  // ── Post-processing ───────────────────────────────────────────────────────

  private postProcess(fields: ExtractedField[]): ExtractedField[] {
    return fields.map(f => {
      switch (f.fieldKey) {
        case 'pincode':
          return { ...f, fieldValue: normalizePincode(f.fieldValue) };
        case 'registrationDate':
        case 'valuationDate':
        case 'paymentDate':
        case 'mutationDate':
        case 'agreementDate':
        case 'sanctionDate':
          return { ...f, fieldValue: normalizeDate(f.fieldValue) ?? f.fieldValue };
        case 'ownerName':
        case 'vendorName':
        case 'purchaserName':
        case 'sellerName':
        case 'buyerName':
        case 'coOwnerName':
          return { ...f, fieldValue: this.cleanName(f.fieldValue) };
        case 'totalArea':
        case 'landArea':
        case 'plotArea':
        case 'plinthArea':
        case 'builtUpArea':
        case 'superArea':
        case 'carpetArea':
          return { ...f, fieldValue: this.normalizeAreaValue(f.fieldValue) };
        case 'saleAmount':
        case 'totalSalePrice':
        case 'tokenAmount':
        case 'balanceAmount':
        case 'marketValue':
        case 'distressValue':
        case 'loanAmount':
        case 'taxAmount':
        case 'annualValue':
        case 'landValue':
        case 'buildingValue':
          return { ...f, fieldValue: f.fieldValue.replace(/[,\s]/g, '') };
        default:
          return f;
      }
    }).filter(f => f.fieldValue && f.fieldValue.trim().length > 0);
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
    if (value.length < 3) conf -= 0.10;
    if (field === 'pincode' && !/^\d{6}$/.test(value.replace(/\D/g, ''))) conf -= 0.20;
    if (['ownerName', 'coOwnerName', 'vendorName', 'purchaserName'].includes(field)) {
      if (value === value.toUpperCase()) conf -= 0.05;
    }
    return Math.max(0.1, Math.min(1.0, conf));
  }

  private extractSourceLine(text: string, index: number): string {
    const start = text.lastIndexOf('\n', index) + 1;
    const end   = text.indexOf('\n', index);
    return text.slice(start, end === -1 ? text.length : end).trim();
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
