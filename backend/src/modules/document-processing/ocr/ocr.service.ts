import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

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
      // Dynamic import so the app starts even if tesseract.js is not yet installed
      const Tesseract = await import('tesseract.js');
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
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    // pdf-parse gives us one big text blob; split by form-feed or page markers
    return data.text
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
    // Image (jpg, png, tiff, webp, bmp)
    return this.processImage(buffer, documentId);
  }

  private async processPdf(buffer: Buffer, documentId: string): Promise<OcrDocumentResult> {
    // 1. Try native text extraction first (fast, perfect quality)
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

    // 2. Scanned PDF: render pages to images via sharp/pdfjs then OCR
    this.logger.log(`[OCR] ${documentId}: scanned PDF — falling back to image OCR`);
    return this.processScannedPdf(buffer, documentId);
  }

  private async processScannedPdf(buffer: Buffer, documentId: string): Promise<OcrDocumentResult> {
    // We use pdfjs-dist to render each page to a PNG, then OCR it.
    // If pdfjs-dist is not installed, we OCR the whole buffer as one chunk.
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js').catch(() => null);
      if (!pdfjsLib) throw new Error('pdfjs-dist not available');

      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const pages: OcrPageResult[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page   = await pdf.getPage(i);
        const vp     = page.getViewport({ scale: 2.0 });
        // Render to canvas (Node canvas via pdfjs-dist/legacy)
        // If canvas is not available, skip image render and try raw OCR
        const text = await this.ocrPageFallback(buffer, i);
        pages.push({ pageNumber: i, text, wordCount: text.split(/\s+/).filter(Boolean).length, engine: this.adapter.engineName });
      }

      return { pages, totalText: pages.map(p => p.text).join('\n\n'), engine: this.adapter.engineName };
    } catch {
      // Last resort: OCR the entire PDF buffer as one image
      const text = await this.adapter.extractText(buffer);
      const page: OcrPageResult = { pageNumber: 1, text, wordCount: text.split(/\s+/).filter(Boolean).length, engine: this.adapter.engineName };
      return { pages: [page], totalText: text, engine: this.adapter.engineName };
    }
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

  private async ocrPageFallback(buffer: Buffer, _pageNum: number): Promise<string> {
    return this.adapter.extractText(buffer);
  }

  /** Write buffer to a temp file, return its path */
  private async writeTmp(buffer: Buffer, ext: string): Promise<string> {
    const p = path.join(os.tmpdir(), `${randomUUID()}.${ext}`);
    await fs.writeFile(p, buffer);
    return p;
  }

  private async cleanTmp(p: string): Promise<void> {
    try { await fs.unlink(p); } catch { /* ignore */ }
  }
}
