import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedDeviceBookFile {
  suggestedTitle: string;
  chapterTitle: string;
  chapterContent: string;
  summary: string;
  pdfUrl?: string;
  pdfBytes?: Uint8Array;
  pageCount?: number;
  estimatedMinutes: number;
}

function cleanFileNameTitle(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

function stripHtmlTags(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').trim();
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function extractPdfPreview(bytes: Uint8Array): Promise<{
  pageCount: number;
  extractedText: string;
}> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages || 1;
    const maxPagesToSample = Math.min(pageCount, 3);
    const chunks: string[] = [];

    for (let p = 1; p <= maxPagesToSample; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) {
        chunks.push(pageText);
      }
    }

    await pdf.cleanup();
    return {
      pageCount,
      extractedText: chunks.join('\n\n').slice(0, 12000),
    };
  } catch {
    return { pageCount: 0, extractedText: '' };
  }
}

export async function parseDeviceBookFile(file: File): Promise<ParsedDeviceBookFile> {
  const lowerName = file.name.toLowerCase();
  const suggestedTitle = cleanFileNameTitle(file.name) || 'Imported Health Textbook';

  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    let pdfUrl: string | undefined;
    if (file.size <= 1_500_000) {
      pdfUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read PDF file from device.'));
        reader.readAsDataURL(file);
      });
    } else {
      pdfUrl = URL.createObjectURL(file);
    }

    const { pageCount, extractedText } = await extractPdfPreview(pdfBytes);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const pageLabel = pageCount > 0 ? `${pageCount} pages` : `${sizeMb} MB`;
    const estimatedMinutes = pageCount > 0 ? Math.max(10, Math.min(360, pageCount * 2)) : 35;

    return {
      suggestedTitle,
      chapterTitle: `${suggestedTitle} (${pageCount > 0 ? `${pageCount} Pages` : 'PDF Document'})`,
      chapterContent:
        extractedText ||
        `Imported PDF file "${file.name}" (${sizeMb} MB) from your device. Use the in-app PDF reader above to read pages, zoom, and extract text into your study notes.`,
      summary: `Device PDF textbook (${pageLabel}, ${sizeMb} MB) opened directly inside Hilaac Reader.`,
      pdfUrl,
      pdfBytes,
      pageCount: pageCount || undefined,
      estimatedMinutes,
    };
  }

  let rawText = await file.text();
  if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    rawText = stripHtmlTags(rawText);
  } else if (lowerName.endsWith('.json')) {
    try {
      const parsed = JSON.parse(rawText) as unknown;
      if (typeof parsed === 'string') {
        rawText = parsed;
      } else if (parsed && typeof parsed === 'object') {
        rawText = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // keep raw text
    }
  }

  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  const safeContent = normalized
    ? normalized.slice(0, 60000)
    : `Imported study file "${file.name}" from device.`;
  const wordCount = safeContent.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.max(5, Math.min(240, Math.round(wordCount / 180) || 15));
  const summarySource = safeContent.replace(/\s+/g, ' ').trim();

  return {
    suggestedTitle,
    chapterTitle: 'Chapter 1: Imported Study Text',
    chapterContent: safeContent,
    summary:
      summarySource.length > 220
        ? `${summarySource.slice(0, 217)}...`
        : summarySource || `Imported from ${file.name}`,
    estimatedMinutes,
  };
}

export async function readDeviceCoverImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });

  if (dataUrl.length <= 350_000) {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 420;
      const scale = Math.min(1, maxWidth / (img.width || maxWidth));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
