import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Highlighter,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { AppLanguage, HealthBook } from '../types';
import { loadPdfJs, type PdfDocumentProxy, type PdfRenderTask } from '../utils/pdfLoader';
import { loadPdfBinary } from '../utils/pdfStorage';

interface InAppPdfViewerProps {
  book: HealthBook;
  paperTheme: 'white' | 'sepia' | 'dark';
  language: AppLanguage;
  onSendTextToHighlight?: (text: string) => void;
}

function dataUriToBytes(dataUri: string): Uint8Array | null {
  try {
    const commaIdx = dataUri.indexOf(',');
    if (commaIdx === -1) return null;
    const base64 = dataUri.slice(commaIdx + 1);
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export const InAppPdfViewer: React.FC<InAppPdfViewerProps> = ({
  book,
  paperTheme,
  language,
  onSendTextToHighlight,
}) => {
  const isSo = language === 'so';
  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [renderingPage, setRenderingPage] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageText, setPageText] = useState<string>('');
  const [showExtractedText, setShowExtractedText] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedDoc: PdfDocumentProxy | null = null;

    async function loadDocument() {
      setLoadingDoc(true);
      setLoadError(null);
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      setPageText('');

      try {
        let docSource: { data: Uint8Array } | { url: string } | null = null;

        const storedBytes = await loadPdfBinary(book.id);
        if (storedBytes && storedBytes.byteLength > 0) {
          docSource = { data: storedBytes };
        } else if (book.pdfUrl) {
          if (book.pdfUrl.startsWith('data:')) {
            const bytes = dataUriToBytes(book.pdfUrl);
            if (bytes) {
              docSource = { data: bytes };
            }
          } else {
            docSource = { url: book.pdfUrl };
          }
        }

        if (!docSource) {
          throw new Error(
            isSo
              ? 'Faylka PDF lagama helin qalabkan. Fadlan dib uga dooro qalabka.'
              : 'PDF file data was not found on this device. Please re-import the PDF from your device.'
          );
        }

        const pdfjsLib = await loadPdfJs();
        const task = pdfjsLib.getDocument(docSource);
        const doc = await task.promise;
        if (cancelled) {
          await doc.cleanup();
          return;
        }
        loadedDoc = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages || 1);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : isSo
              ? 'PDF-ka lama furi karin gudaha app-ka.'
              : 'Unable to open PDF inside the app.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDoc(false);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
      if (loadedDoc) {
        loadedDoc.cleanup().catch(() => {});
      }
    };
  }, [book.id, book.pdfUrl, isSo]);

  useEffect(() => {
    let cancelled = false;
    let activeRenderTask: PdfRenderTask | null = null;

    async function renderCurrentPage() {
      if (!pdfDoc || !canvasRef.current) return;
      setRenderingPage(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const containerWidth = containerRef.current?.clientWidth ?? 640;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.max(0.6, Math.min(2.2, (containerWidth - 24) / unscaledViewport.width));
        const effectiveScale = fitScale * scale;
        const viewport = page.getViewport({ scale: effectiveScale });

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);

        activeRenderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });
        await activeRenderTask.promise;

        const textContent = await page.getTextContent();
        if (!cancelled) {
          const extracted = textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          setPageText(extracted);
        }
      } catch {
        // ignore cancelled render errors during fast paging/zooming
      } finally {
        if (!cancelled) {
          setRenderingPage(false);
        }
      }
    }

    renderCurrentPage();

    return () => {
      cancelled = true;
      if (activeRenderTask) {
        activeRenderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  const barBg =
    paperTheme === 'dark'
      ? 'bg-[#10234B] border-[#1E2E4D] text-[#E2E8F0]'
      : paperTheme === 'sepia'
      ? 'bg-[#F4EAD2] border-[#E4D5B7] text-[#3B2C1A]'
      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#10234B]';

  const frameBg =
    paperTheme === 'dark'
      ? 'bg-[#091734] border-[#1E2E4D]'
      : paperTheme === 'sepia'
      ? 'bg-[#EFE4CC] border-[#D9C7A3]'
      : 'bg-[#F1F5F9] border-[#E2E8F0]';

  const btnStyle =
    paperTheme === 'dark'
      ? 'border-[#1E2E4D] bg-[#13203C] text-white hover:border-[#079B62]'
      : paperTheme === 'sepia'
      ? 'border-[#D9C7A3] bg-[#FBF5E6] text-[#3B2C1A] hover:border-[#9A5B13]'
      : 'border-[#E2E8F0] bg-white text-[#10234B] hover:border-[#079B62]';

  return (
    <div className="mt-5 space-y-3">
      {/* In-App PDF Controls Toolbar */}
      <div className={`rounded-[12px] border px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 ${barBg}`}>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#079B62] shrink-0" />
          <span className="text-xs font-extrabold">
            {isSo ? 'Akhristaha PDF Gudaha App-ka' : 'In-App PDF Reader'}
          </span>
          {numPages > 0 && (
            <span className="font-mono text-xs font-bold opacity-80 tabular-nums">
              · {currentPage}/{numPages}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1 || loadingDoc}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label={isSo ? 'Bogga hore' : 'Previous page'}
            className={`min-h-[32px] px-2 rounded-[7px] border text-xs font-bold disabled:opacity-40 inline-flex items-center ${btnStyle}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="number"
            min={1}
            max={Math.max(1, numPages)}
            value={currentPage}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 1 && v <= Math.max(1, numPages)) {
                setCurrentPage(v);
              }
            }}
            aria-label={isSo ? 'Lambarka bogga' : 'Page number'}
            className={`w-12 text-center rounded-[7px] border py-1 text-xs font-mono font-bold tabular-nums ${btnStyle}`}
          />

          <button
            type="button"
            disabled={currentPage >= numPages || loadingDoc}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            aria-label={isSo ? 'Bogga xiga' : 'Next page'}
            className={`min-h-[32px] px-2 rounded-[7px] border text-xs font-bold disabled:opacity-40 inline-flex items-center ${btnStyle}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.7, Number((s - 0.15).toFixed(2))))}
            aria-label={isSo ? 'Yaree' : 'Zoom out'}
            className={`min-h-[32px] px-2 rounded-[7px] border text-xs font-bold inline-flex items-center ${btnStyle}`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-[11px] font-bold px-1 tabular-nums">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
            aria-label={isSo ? 'Weynee' : 'Zoom in'}
            className={`min-h-[32px] px-2 rounded-[7px] border text-xs font-bold inline-flex items-center ${btnStyle}`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {pageText && (
            <button
              type="button"
              onClick={() => setShowExtractedText(!showExtractedText)}
              className={`min-h-[32px] px-2.5 rounded-[7px] border text-xs font-bold inline-flex items-center gap-1 ${btnStyle}`}
            >
              <span>{showExtractedText ? (isSo ? 'Qari Qoraalka' : 'Hide Text') : isSo ? 'Qoraalka Bogga' : 'Page Text'}</span>
            </button>
          )}

          {book.pdfUrl && (
            <a
              href={book.pdfUrl}
              download={`${book.title.replace(/[^a-z0-9]/gi, '_')}.pdf`}
              aria-label={isSo ? 'Soo dejiso PDF' : 'Download PDF Copy'}
              className={`min-h-[32px] px-2.5 rounded-[7px] border text-xs font-bold inline-flex items-center gap-1 ${btnStyle}`}
            >
              <Download className="w-3.5 h-3.5 text-[#079B62]" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          )}
        </div>
      </div>

      {/* PDF Canvas Viewport */}
      <div
        ref={containerRef}
        className={`relative rounded-[14px] border p-3 overflow-auto max-h-[620px] flex justify-center ${frameBg}`}
      >
        {loadingDoc ? (
          <div className="py-20 flex flex-col items-center gap-2 text-xs font-semibold">
            <Loader2 className="w-6 h-6 animate-spin text-[#079B62]" />
            <span>{isSo ? 'Furaya PDF-ka gudaha app-ka...' : 'Opening PDF inside app...'}</span>
          </div>
        ) : loadError ? (
          <div className="py-12 px-4 text-center space-y-2.5 max-w-md">
            <p className="text-xs font-bold text-[#B91C1C] dark:text-red-300">{loadError}</p>
            {book.pdfUrl && (
              <a
                href={book.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[#079B62] text-white text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                {isSo ? 'Soo Dejiso PDF' : 'Download PDF File'}
              </a>
            )}
          </div>
        ) : (
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              className={`rounded-[6px] shadow-md bg-white transition-all ${
                paperTheme === 'dark'
                  ? 'invert hue-rotate-180 brightness-95 contrast-90'
                  : paperTheme === 'sepia'
                  ? 'sepia-[0.22] contrast-[0.98]'
                  : ''
              }`}
            />
            {renderingPage && (
              <div className="absolute top-2 right-2 rounded-md bg-[#10234B]/80 text-white px-2 py-1 text-[11px] font-bold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extracted Selectable Text & Send to Highlight */}
      {showExtractedText && pageText && (
        <div className={`rounded-[12px] border p-4 space-y-2.5 ${barBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold">
              {isSo ? `Qoraalka Bogga ${currentPage}` : `Extracted Text — Page ${currentPage}`}
            </span>
            {onSendTextToHighlight && (
              <button
                type="button"
                onClick={() => onSendTextToHighlight(pageText.slice(0, 450))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#079B62] text-white text-[11px] font-bold hover:bg-[#058152]"
              >
                <Highlighter className="w-3 h-3" />
                {isSo ? 'U Dir Xusuus-qorka' : 'Copy to Highlight'}
              </button>
            )}
          </div>
          <p className="text-xs leading-relaxed opacity-90 select-text whitespace-pre-wrap">
            {pageText}
          </p>
        </div>
      )}
    </div>
  );
};
