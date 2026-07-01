import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

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

// ── Tesseract.js adapter — singleton worker, created once and reused ──────────

export class TesseractAdapter extends OcrAdapter {
  readonly engineName = 'tesseract.js';
  private readonly logger = new Logger(TesseractAdapter.name);
  private workerPromise: Promise<any> | null = null;

  getWorker(): Promise<any> {
    if (!this.workerPromise) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Tesseract = require('tesseract.js') as any;
      this.workerPromise = Tesseract.createWorker('hin+eng').catch((e: any) => {
        this.logger.warn(`Tesseract worker init failed: ${e.message}`);
        this.workerPromise = null; // allow retry next call
        return null;
      });
    }
    return this.workerPromise;
  }

  async extractText(imageBuffer: Buffer): Promise<string> {
    try {
      const worker = await this.getWorker();
      if (!worker) return '';
      const { data } = await worker.recognize(imageBuffer);
      return data.text ?? '';
    } catch (e: any) {
      this.logger.warn(`Tesseract OCR failed: ${e.message}`);
      this.workerPromise = null; // reset so next call retries
      return '';
    }
  }

  async terminate(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise.catch(() => null);
      await worker?.terminate().catch(() => null);
      this.workerPromise = null;
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
export class OcrService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcrService.name);
  private readonly adapter = new TesseractAdapter();

  onModuleInit() {
    // Pre-warm: kick off worker creation so first upload doesn't pay the init cost.
    (this.adapter as TesseractAdapter).getWorker().then(() => {
      this.logger.log('[OCR] Tesseract worker pre-warmed');
    }).catch(() => null);
  }

  async onModuleDestroy() {
    await (this.adapter as TesseractAdapter).terminate();
  }

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
      this.logger.log(`[OCR] ${documentId}: native PDF text (${nativePages.length} pages)`);
      const pages: OcrPageResult[] = nativePages.map((text, i) => ({
        pageNumber: i + 1,
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        engine: 'pdf-parse',
      }));
      return { pages, totalText: nativePages.join('\n\n'), engine: 'pdf-parse' };
    }

    // Scanned PDF — needs Tesseract, signal caller to run it in background
    this.logger.log(`[OCR] ${documentId}: scanned PDF — queuing Tesseract background run`);
    return { pages: [], totalText: '', engine: 'needs-tesseract' };
  }

  private async processImage(_buffer: Buffer, documentId: string): Promise<OcrDocumentResult> {
    this.logger.log(`[OCR] ${documentId}: image — queuing Tesseract background run`);
    return { pages: [], totalText: '', engine: 'needs-tesseract' };
  }

  /** Run Tesseract directly on a buffer — call this in a background task, not in the request path. */
  async runTesseract(buffer: Buffer): Promise<OcrDocumentResult> {
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
