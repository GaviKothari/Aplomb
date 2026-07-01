import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

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

// ── Abstract adapter ──────────────────────────────────────────────────────────

export abstract class OcrAdapter {
  abstract extractText(imageBuffer: Buffer, mimeType: string): Promise<string>;
  abstract readonly engineName: string;
}

// ── System Tesseract binary adapter (fast — native C++, models pre-installed) ──

export class SystemTesseractAdapter extends OcrAdapter {
  readonly engineName = 'tesseract-system';
  private readonly logger = new Logger(SystemTesseractAdapter.name);

  static async isAvailable(): Promise<boolean> {
    try {
      await execAsync('tesseract --version', { timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    const tmpId   = `ocr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tmpDir  = os.tmpdir();
    const ext     = mimeType === 'application/pdf' ? 'pdf' : 'png';
    const inFile  = path.join(tmpDir, `${tmpId}.${ext}`);
    const outBase = path.join(tmpDir, `${tmpId}-out`);

    try {
      await fs.writeFile(inFile, buffer);

      if (mimeType === 'application/pdf') {
        // Convert PDF pages to PNGs with pdftoppm, then OCR each
        const pngBase = path.join(tmpDir, tmpId);
        try {
          await execAsync(`pdftoppm -r 200 -png "${inFile}" "${pngBase}"`, { timeout: 30_000 });
        } catch {
          // pdftoppm failed — try passing PDF directly to tesseract
          await execAsync(`tesseract "${inFile}" "${outBase}" -l hin+eng txt`, { timeout: 60_000 });
          return this.readOutput(`${outBase}.txt`);
        }

        // Find all generated page PNGs and OCR each
        const dir   = await fs.readdir(tmpDir);
        const pages = dir
          .filter(f => f.startsWith(path.basename(pngBase)) && f.endsWith('.png'))
          .sort();

        const texts: string[] = [];
        for (const pg of pages) {
          const pgPath    = path.join(tmpDir, pg);
          const pgOutBase = path.join(tmpDir, `${tmpId}-pg-${pg}`);
          try {
            await execAsync(`tesseract "${pgPath}" "${pgOutBase}" -l hin+eng txt`, { timeout: 60_000 });
            texts.push(await this.readOutput(`${pgOutBase}.txt`));
          } finally {
            await fs.unlink(pgPath).catch(() => null);
            await fs.unlink(`${pgOutBase}.txt`).catch(() => null);
          }
        }
        return texts.join('\n\n');
      } else {
        // Image — pass directly
        await execAsync(`tesseract "${inFile}" "${outBase}" -l hin+eng txt`, { timeout: 60_000 });
        return this.readOutput(`${outBase}.txt`);
      }
    } catch (e: any) {
      this.logger.warn(`System Tesseract failed: ${e.message}`);
      return '';
    } finally {
      await fs.unlink(inFile).catch(() => null);
      await fs.unlink(`${outBase}.txt`).catch(() => null);
    }
  }

  private async readOutput(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return '';
    }
  }
}

// ── Tesseract.js adapter (fallback when system binary not installed) ───────────

export class TesseractJsAdapter extends OcrAdapter {
  readonly engineName = 'tesseract.js';
  private readonly logger = new Logger(TesseractJsAdapter.name);
  private workerPromise: Promise<any> | null = null;

  getWorker(): Promise<any> {
    if (!this.workerPromise) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Tesseract = require('tesseract.js') as any;
        this.workerPromise = Tesseract.createWorker('hin+eng').catch((e: any) => {
          this.logger.warn(`Tesseract.js worker init failed: ${e.message}`);
          this.workerPromise = null;
          return null;
        });
      } catch (e: any) {
        this.logger.warn(`tesseract.js failed to load: ${e.message}`);
        return Promise.resolve(null);
      }
    }
    return this.workerPromise!;
  }

  async extractText(buffer: Buffer): Promise<string> {
    try {
      const worker = await this.getWorker();
      if (!worker) return '';
      const { data } = await worker.recognize(buffer);
      return data.text ?? '';
    } catch (e: any) {
      this.logger.warn(`Tesseract.js OCR failed: ${e.message}`);
      this.workerPromise = null;
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

// ── PDF text extraction (digital PDFs — no OCR needed) ───────────────────────

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
  private adapter: OcrAdapter = new TesseractJsAdapter();

  async onModuleInit() {
    // Prefer system Tesseract binary — much faster, zero download latency
    const sysAvailable = await SystemTesseractAdapter.isAvailable();
    if (sysAvailable) {
      this.adapter = new SystemTesseractAdapter();
      this.logger.log('[OCR] Using system Tesseract binary (hin+eng)');
    } else {
      this.logger.log('[OCR] System Tesseract not found — using tesseract.js (slower)');
      try {
        (this.adapter as TesseractJsAdapter).getWorker()
          .then(() => this.logger.log('[OCR] Tesseract.js worker pre-warmed'))
          .catch(() => null);
      } catch { /* non-fatal */ }
    }
  }

  async onModuleDestroy() {
    if (this.adapter instanceof TesseractJsAdapter) {
      await this.adapter.terminate();
    }
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
    // Fast path: digital PDF — text is embedded, no OCR needed
    const nativePages = await extractNativePdfText(buffer);
    const hasUsableText = nativePages.some(t => t.replace(/\s/g, '').length > 50);

    if (hasUsableText) {
      this.logger.log(`[OCR] ${documentId}: native PDF text (${nativePages.length} pages)`);
      const pages: OcrPageResult[] = nativePages.map((text, i) => ({
        pageNumber: i + 1,
        text,
        wordCount:  text.split(/\s+/).filter(Boolean).length,
        engine:     'pdf-parse',
      }));
      return { pages, totalText: nativePages.join('\n\n'), engine: 'pdf-parse' };
    }

    // Scanned PDF — needs OCR
    this.logger.log(`[OCR] ${documentId}: scanned PDF — queuing Tesseract background run`);
    return { pages: [], totalText: '', engine: 'needs-tesseract' };
  }

  private async processImage(_buffer: Buffer, documentId: string): Promise<OcrDocumentResult> {
    this.logger.log(`[OCR] ${documentId}: image — queuing Tesseract background run`);
    return { pages: [], totalText: '', engine: 'needs-tesseract' };
  }

  /** Run Tesseract directly — called from background tasks, not the request path. */
  async runTesseract(buffer: Buffer, mimeType = 'application/pdf'): Promise<OcrDocumentResult> {
    const text = await this.adapter.extractText(buffer, mimeType);
    const page: OcrPageResult = {
      pageNumber: 1,
      text,
      wordCount:  text.split(/\s+/).filter(Boolean).length,
      engine:     this.adapter.engineName,
    };
    return { pages: [page], totalText: text, engine: this.adapter.engineName };
  }
}
