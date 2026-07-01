/**
 * Property Entity Engine.
 *
 * Universal extraction: no document classification, no per-type templates.
 * Strategy per field:
 *   1. Scan full text for each keyword synonym (strong + supporting)
 *   2. Grab the text window immediately after the keyword
 *   3. Parse it by field type (currency, date, area, text…)
 *   4. Score confidence by keyword strength + value quality
 *   5. Keep highest-confidence match per field key
 *
 * This is intentionally simpler and more robust than regex chains.
 * A keyword match + nearby-text extraction handles OCR noise much better
 * than trying to match keyword AND value in one complex pattern.
 */

import { PROPERTY_ENTITY_DICTIONARY, EntityField, FieldType } from './property-entity-dictionary';

export interface ExtractedEntity {
  fieldKey:         string;
  label:            string;
  fieldValue:       string;
  confidence:       number;
  sourcePage:       number | null;
  sourceLine:       string | null;
  sourceDocumentId: string | null;
}

export interface PageInput {
  pageNumber:  number;
  text:        string;
  documentId:  string;
  wordCount?:  number;
}

const WINDOW_CHARS = 220;   // chars to inspect after keyword
const MIN_WORDS    = 15;    // skip pages with fewer words (blank, sig, legal boilerplate)

export class PropertyEntityEngine {

  extract(pages: PageInput[]): ExtractedEntity[] {
    const results = new Map<string, ExtractedEntity>();

    for (const page of pages) {
      // Skip nearly-empty pages (blank, purely legal, signatures)
      const wordCount = page.wordCount ?? page.text.split(/\s+/).filter(Boolean).length;
      if (wordCount < MIN_WORDS) continue;

      for (const field of PROPERTY_ENTITY_DICTIONARY) {
        const candidate = this.extractField(field, page);
        if (!candidate) continue;

        const existing = results.get(field.key);
        if (!existing || candidate.confidence > existing.confidence) {
          results.set(field.key, candidate);
        }
      }
    }

    return Array.from(results.values());
  }

  // ── Per-field extraction ───────────────────────────────────────────────────

  private extractField(field: EntityField, page: PageInput): ExtractedEntity | null {
    const text       = page.text;
    const lowerText  = text.toLowerCase();
    let best: ExtractedEntity | null = null;

    const tryKeywords = (keywords: string[], isStrong: boolean) => {
      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        let searchFrom = 0;

        while (true) {
          const idx = lowerText.indexOf(kwLower, searchFrom);
          if (idx === -1) break;
          searchFrom = idx + kwLower.length;

          // Get window of text immediately after keyword
          const windowStart = idx + kwLower.length;
          const raw = text.slice(windowStart, windowStart + WINDOW_CHARS);

          // Strip leading punctuation / whitespace / colon
          const cleaned = raw.replace(/^[\s:：।—\-–]+/, '').trim();
          if (!cleaned) continue;

          const value = this.parseByType(cleaned, field.type);
          if (!value) continue;

          if (field.validate && !field.validate(value)) continue;

          const finalValue = field.transform ? field.transform(value) : value;
          if (!finalValue || finalValue.length < 1) continue;

          const isHindi  = /[ऀ-ॿ]/.test(kw);
          const baseConf = isStrong ? 0.86 : 0.70;
          const conf     = this.adjustConf(baseConf, finalValue, field.type, isHindi);

          const candidate: ExtractedEntity = {
            fieldKey:         field.key,
            label:            field.label,
            fieldValue:       finalValue.slice(0, 400),
            confidence:       conf,
            sourcePage:       page.pageNumber,
            sourceLine:       this.sourceLine(text, idx).slice(0, 200),
            sourceDocumentId: page.documentId,
          };

          if (!best || conf > best.confidence) {
            best = candidate;
          }
        }
      }
    };

    tryKeywords(field.strong, true);
    tryKeywords(field.supporting, false);

    return best;
  }

  // ── Type-specific value parsers ────────────────────────────────────────────

  private parseByType(window: string, type: FieldType): string | null {
    switch (type) {

      case 'currency': {
        // Find first number-like thing: ₹ / Rs. / digits with commas
        const m = window.match(/(?:rs\.?\s*|₹\s*|inr\s*)?([\d,]{3,}(?:\.\d{1,2})?)/i)
               ?? window.match(/([\d,]{4,}(?:\.\d{1,2})?)/);
        return m ? m[1].replace(/,/g, '') : null;
      }

      case 'date': {
        const patterns = [
          /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/,
          /(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/,
          /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
          /(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i,
        ];
        for (const p of patterns) {
          const m = window.match(p);
          if (m) return this.normalizeDate(m[1]);
        }
        return null;
      }

      case 'area': {
        const m = window.match(
          /([\d,]+(?:\.\d{1,3})?)\s*(?:sq\.?\s*(?:ft|yd|m|meter|feet|yard|mtr)|sqft|sqyd|sqm|square\s*(?:feet|yard|meter)|marla|kanal|bigha|acre|gaj|hectare|वर्ग\s*(?:फुट|गज|मीटर)|बीघा|मरला)/i,
        );
        if (m) return `${m[1].replace(/,/g, '')} ${m[0].replace(m[1], '').trim()}`.trim();
        // Fallback: just a number followed by area-like context
        const n = window.match(/([\d,]+(?:\.\d{1,3})?)/);
        return n ? n[1].replace(/,/g, '') : null;
      }

      case 'number': {
        const m = window.match(/(\d{1,4}(?:\.\d{1,2})?)/);
        return m ? m[1] : null;
      }

      case 'pincode': {
        const m = window.match(/(\d{6})/);
        return m ? m[1] : null;
      }

      case 'text':
      default: {
        // Take until first hard break: double-newline, or >80 chars on one line
        const line = window
          .split(/\n{2,}|\r\n\r\n/)[0]          // stop at paragraph break
          .split('\n')[0]                         // take first line
          .replace(/^[\s:।—\-–]+/, '')           // strip leading junk
          .replace(/\s+/g, ' ')
          .trim();
        // Must be at least 2 chars and not look like a page header/number
        if (line.length < 2 || /^\d+$/.test(line)) return null;
        return line.slice(0, 120);
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private adjustConf(base: number, value: string, type: FieldType, isHindi: boolean): number {
    let c = base;
    if (isHindi) c += 0.04;                              // Hindi match is more specific
    if (type === 'currency' && value.length >= 4) c += 0.04;
    if (type === 'date'     && /\d{4}/.test(value)) c += 0.04;
    if (type === 'pincode'  && /^\d{6}$/.test(value)) c += 0.06;
    if (value.length < 2) c -= 0.15;
    return Math.max(0.1, Math.min(0.97, Math.round(c * 100) / 100));
  }

  private sourceLine(text: string, idx: number): string {
    const start = text.lastIndexOf('\n', idx) + 1;
    const end   = text.indexOf('\n', idx);
    return text.slice(start, end === -1 ? text.length : end).trim();
  }

  private normalizeDate(raw: string): string {
    // DD/MM/YYYY or similar → YYYY-MM-DD
    const dmy = raw.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const ymd = raw.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymd) {
      const [, y, m, d] = ymd;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return raw;
  }
}
