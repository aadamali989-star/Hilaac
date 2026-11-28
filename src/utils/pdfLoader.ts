import type * as PdfJsModule from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

export type PdfJsLib = typeof PdfJsModule;
export type PdfDocumentProxy = PdfJsModule.PDFDocumentProxy;
export type PdfRenderTask = PdfJsModule.RenderTask;

let cachedPdfJsPromise: Promise<PdfJsLib> | null = null;

export async function loadPdfJs(): Promise<PdfJsLib> {
  if (!cachedPdfJsPromise) {
    cachedPdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return mod;
    });
  }
  return cachedPdfJsPromise;
}
