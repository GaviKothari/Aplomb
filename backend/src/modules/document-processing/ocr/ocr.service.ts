import { Injectable, Logger } from '@nestjs/common';

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  wordCount: number;
  engine: string;
}

export interface OcrDocumentResult {
  pages: OcrPageResult[];
  totalText: string;
  engine: string;
}

// ── Abstract adapter — swap engines without touching callers ──────────────────

export abstract class OcrAdapter {
  abstract extractText(imageBuffer: Buffer, language?: string): Promise<string>;
  abstract readonly engineName: string;
}

// ── Tesseract.js adapter (default — zero system deps) ─────────────────────────

export class TesseractAdapter extends OcrAdapter {
  readonly engineName = 'tesseract.js';
  private readonly logger = new Logger(TesseractAdapter.name);

  async extractText(imageBuffer: Buffer, language = 'hin+eng'): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Tesseract = require('tesseract.js') as any;
      const worker = await Tesseract.createWorker(language);
      const { data } = await worker.recognize(imageBuffer);
      await worker.terminate();
      return data.text ?? '';
    } catch (e: any) {
      this.logger.warn(`Tesseract OCR failed: ${e.message}`);
      return '';
    }
  }
}

// ── PDF text extraction (for native/digital PDFs, no OCR needed) ─────────────

async function extractNativePdfText(buffer: Buffer): Promise<string[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse') as any;
    const data = await pdfParse(buffer);
    return (data.text as string)
      .split(/\f|\n---\n|Page \d+ of \d+/i)
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 10);
  } catch {
    return [];
  }
}

// ── Main OCR service ──────────────────────────────────────────────────────────

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly adapter: OcrAdapter = new TesseractAdapter();

  async processBuffer(
    buffer: Buffer,
    mimeType: string,
    documentId: string,
  ): Promise<OcrDocumentResult> {
    if (mimeType === 'application/pdf') {
      return this.processPdf(buffer, documentId);
    }
    return this.processImage(buffer, documentId);
  }

  private async processPdf(buffer: Buffer, documentId: string): Promise<OcrDocumentResult> {
    const nativePages = await extractNativePdfText(buffer);
    const hasUsableText = nativePages.some(t => t.replace(/\s/g, '').length > 50);

    if (hasUsableText) {
      this.logger.log(`[OCR] ${documentId}: native text extraction (${nativePages.length} pages)`);
      const pages: OcrPageResult[] = nativePages.map((text, i) => ({
        pageNumber: i + 1,
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        engine: 'pdf-parse',
      }));
      return { pages, totalText: nativePages.join('\n\n'), engine: 'pdf-parse' };
    }

    this.logger.log(`[OCR] ${documentId}: scanned PDF — falling back to image OCR`);
    return this.processScannedPdf(buffer);
  }

  private async processScannedPdf(buffer: Buffer): Promise<OcrDocumentResult> {
    // OCR the raw PDF buffer directly — Tesseract handles single-page scanned PDFs.
    // For multi-page scanned PDFs this produces one merged text block (good enough for field extraction).
    const text = await this.adapter.extractText(buffer);
    const page: OcrPageResult = {
      pageNumber: 1,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      engine: this.adapter.engineName,
    };
    return { pages: [page], totalText: text, engine: this.adapter.engineName };
  }

  private async processImage(buffer: Buffer, _documentId: string): Promise<OcrDocumentResult> {
    const text = await this.adapter.extractText(buffer);
    const page: OcrPageResult = {
      pageNumber: 1,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      engine: this.adapter.engineName,
    };
    return { pages: [page], totalText: text, engine: this.adapter.engineName };
  }
}
