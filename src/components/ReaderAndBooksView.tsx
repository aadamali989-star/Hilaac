import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  FileUp,
  Heart,
  Highlighter,
  ImagePlus,
  Link2,
  Moon,
  Pause,
  PenLine,
  Play,
  Search,
  Square,
  Sun,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import type {
  AcademicSubject,
  ActiveStudySession,
  AppLanguage,
  BookCoverColor,
  HealthBook,
  ReaderAnnotation,
  UserProfile,
} from '../types';
import { parseDeviceBookFile, readDeviceCoverImage } from '../utils/deviceBooks';
import { InAppPdfViewer } from './InAppPdfViewer';
import { EmptyStateBox, PageHeroHeader, SectionCard } from './UiPrimitives';
import thumbBooks from '../assets/images/thumb_medical_books_1795767006210.jpg';

interface DeviceBookPayload {
  title: string;
  author: string;
  subject: AcademicSubject;
  edition: string;
  readMinutes: number;
  summary: string;
  coverColor: BookCoverColor;
  coverImage?: string;
  pdfUrl?: string;
  pdfBytes?: Uint8Array;
  chapterTitle: string;
  chapterContent: string;
}

interface ReaderAndBooksViewProps {
  profile: UserProfile;
  books: HealthBook[];
  annotations: ReaderAnnotation[];
  language?: AppLanguage;
  onSaveAnnotation: (annotation: {
    bookId: string;
    pageTitle: string;
    highlightText: string;
    note: string;
    color: 'amber' | 'emerald' | 'navy';
  }) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onToggleDownloadBook: (bookId: string) => Promise<void>;
  onToggleFavoriteBook: (bookId: string) => Promise<void>;
  onAddDeviceBook: (book: DeviceBookPayload) => Promise<string | null>;
  onDeleteBook: (bookId: string) => Promise<void>;
  activeStudySession: ActiveStudySession | null;
  sessionElapsedSeconds: number;
  onStartStudySession: (subject: AcademicSubject, moduleTitle: string) => void;
  onPauseStudySession: () => void;
  onResumeStudySession: () => void;
  onFinishStudySession: () => void;
}

const HIGHLIGHT_STYLES: Record<ReaderAnnotation['color'], string> = {
  amber: 'bg-[#FFFBEB] dark:bg-amber-950/35 border-[#F59E0B]/60',
  emerald: 'bg-[#ECFDF5] dark:bg-emerald-950/35 border-[#079B62]/50',
  navy: 'bg-[#F1F5F9] dark:bg-[#13203C] border-[#10234B]/30 dark:border-slate-600',
  sky: 'bg-[#F1F5F9] dark:bg-[#13203C] border-[#10234B]/30 dark:border-slate-600',
  rose: 'bg-[#FFFBEB] dark:bg-amber-950/35 border-[#F59E0B]/60',
};

const COVER_THEME_CLASSES: Record<BookCoverColor, string> = {
  navy: 'bg-[#10234B]',
  emerald: 'bg-[#079B62]',
  orange: 'bg-[#B45309]',
  slate: 'bg-[#1E293B]',
  burgundy: 'bg-[#10234B]',
  indigo: 'bg-[#1E293B]',
  teal: 'bg-[#079B62]',
};

const SUBJECT_FILTERS: ('All' | 'Favorites' | AcademicSubject)[] = [
  'All',
  'Favorites',
  'Pharmacology',
  'Anatomy & Physiology',
  'Microbiology',
  'Biochemistry',
  'Clinical OPD',
];

const BookCoverVisual: React.FC<{
  book: HealthBook;
  compact?: boolean;
}> = ({ book, compact = false }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(book.coverImage) && !imgFailed;

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] shadow-sm ${
        COVER_THEME_CLASSES[book.coverColor || 'navy']
      }`}
    >
      {showImage ? (
        <img
          src={book.coverImage}
          alt={`${book.title} cover`}
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full p-3.5 flex flex-col justify-between text-white">
          <div className="border-t border-b border-[#F59E0B]/60 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FDE68A]">
            {book.subject}
          </div>
          <div className="my-auto py-2">
            <div className="h-0.5 w-8 bg-[#F59E0B] mb-2" />
            <div className={`${compact ? 'text-xs' : 'text-sm'} font-display font-extrabold leading-snug line-clamp-4`}>
              {book.title}
            </div>
          </div>
          <div className="text-[10px] text-slate-200 line-clamp-2 border-t border-white/20 pt-1.5">
            {book.author}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-black/25" />
      {showImage && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#10234B]/90 px-2.5 py-2 text-white border-t border-white/10">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#F59E0B] truncate">
            {book.subject}
          </div>
          <div className={`${compact ? 'text-[11px]' : 'text-xs'} font-display font-bold leading-tight line-clamp-2 mt-0.5`}>
            {book.title}
          </div>
        </div>
      )}
    </div>
  );
};

const COVER_COLORS: { id: BookCoverColor; label: string; swatch: string }[] = [
  { id: 'navy', label: 'Hilaac Navy', swatch: 'bg-[#10234B]' },
  { id: 'emerald', label: 'Hilaac Green', swatch: 'bg-[#079B62]' },
  { id: 'orange', label: 'Clinical Amber', swatch: 'bg-[#D97706]' },
  { id: 'slate', label: 'Deep Slate', swatch: 'bg-[#1E293B]' },
];

type ReaderPaperTheme = 'white' | 'sepia' | 'dark';
type ReaderFontFamily = 'serif' | 'sans';

const READER_FONT_SIZES = [
  { label: '15px', bodyClass: 'text-[15px] leading-[1.82]', titleClass: 'text-xl sm:text-2xl' },
  { label: '17px', bodyClass: 'text-[17px] leading-[1.85]', titleClass: 'text-2xl sm:text-[26px]' },
  { label: '19px', bodyClass: 'text-[19px] leading-[1.88]', titleClass: 'text-2xl sm:text-[28px]' },
  { label: '21px', bodyClass: 'text-[21px] leading-[1.9]', titleClass: 'text-[26px] sm:text-[30px]' },
] as const;

const READER_THEME_STYLES: Record<
  ReaderPaperTheme,
  {
    enLabel: string;
    soLabel: string;
    swatch: string;
    container: string;
    divider: string;
    heading: string;
    prose: string;
    muted: string;
    accent: string;
    toolbar: string;
    chapterActive: string;
    chapterIdle: string;
    tipBox: string;
    actionBtn: string;
  }
> = {
  white: {
    enLabel: 'White',
    soLabel: 'Cad',
    swatch: 'bg-white border-slate-300',
    container: 'bg-white text-[#0F172A] border-[#E2E8F0]',
    divider: 'border-[#E2E8F0]',
    heading: 'text-[#10234B]',
    prose: 'text-[#1E293B]',
    muted: 'text-[#475569]',
    accent: 'text-[#079B62]',
    toolbar: 'bg-[#F8FAFC] border-[#E2E8F0]',
    chapterActive: 'bg-[#10234B] text-white',
    chapterIdle: 'bg-[#F1F5F9] text-[#10234B] hover:bg-[#E2E8F0]',
    tipBox: 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]',
    actionBtn: 'border-[#E2E8F0] text-[#10234B] hover:bg-[#F8FAFC]',
  },
  sepia: {
    enLabel: 'Sepia',
    soLabel: 'Sepia',
    swatch: 'bg-[#F3E7CD] border-[#C9B38C]',
    container: 'bg-[#FBF5E6] text-[#3B2C1A] border-[#E4D5B7]',
    divider: 'border-[#E6D9BE]',
    heading: 'text-[#2D1F10]',
    prose: 'text-[#3B2C1A]',
    muted: 'text-[#735D43]',
    accent: 'text-[#9A5B13]',
    toolbar: 'bg-[#F4EAD2] border-[#E4D5B7]',
    chapterActive: 'bg-[#6B4F2B] text-[#FFFDF8]',
    chapterIdle: 'bg-[#EFE4CC] text-[#4E3B25] hover:bg-[#E5D6B6]',
    tipBox: 'bg-[#F4EAD2] border-[#E4D5B7] text-[#665139]',
    actionBtn: 'border-[#D9C7A3] text-[#3B2C1A] hover:bg-[#F3E8CE]',
  },
  dark: {
    enLabel: 'Dark',
    soLabel: 'Madow',
    swatch: 'bg-[#091734] border-slate-600',
    container: 'bg-[#091734] text-[#E2E8F0] border-[#1E2E4D]',
    divider: 'border-[#1E2E4D]',
    heading: 'text-[#F8FAFC]',
    prose: 'text-[#E2E8F0]',
    muted: 'text-[#94A3B8]',
    accent: 'text-[#34D399]',
    toolbar: 'bg-[#10234B] border-[#1E2E4D]',
    chapterActive: 'bg-[#079B62] text-white',
    chapterIdle: 'bg-[#13203C] text-[#CBD5E1] hover:bg-[#1E2E4D]',
    tipBox: 'bg-[#10234B] border-[#1E2E4D] text-[#CBD5E1]',
    actionBtn: 'border-[#1E2E4D] text-[#E2E8F0] hover:bg-[#13203C]',
  },
};

const READER_PREFS_KEY = 'hilaac_reader_prefs_v1';
const RECENT_BOOKS_KEY = 'hilaac_recent_books_v1';

export const ReaderAndBooksView: React.FC<ReaderAndBooksViewProps> = ({
  profile,
  books,
  annotations,
  language = 'en',
  onSaveAnnotation,
  onDeleteAnnotation,
  onToggleDownloadBook,
  onToggleFavoriteBook,
  onAddDeviceBook,
  onDeleteBook,
  activeStudySession,
  sessionElapsedSeconds,
  onStartStudySession,
  onPauseStudySession,
  onResumeStudySession,
  onFinishStudySession,
}) => {
  const isSo = language === 'so';
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id ?? '');
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Favorites' | AcademicSubject>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewBookId, setPreviewBookId] = useState<string | null>(null);

  const [recentBookIds, setRecentBookIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_BOOKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string').slice(0, 4);
        }
      }
    } catch {
      // ignore storage failure
    }
    return books[0]?.id ? [books[0].id] : [];
  });

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [chooseTab, setChooseTab] = useState<'file' | 'compose'>('file');
  const [devTitle, setDevTitle] = useState('');
  const [devAuthor, setDevAuthor] = useState(profile.displayName || 'Personal Device Library');
  const [devSubject, setDevSubject] = useState<AcademicSubject>('Pharmacology');
  const [devEdition, setDevEdition] = useState('Device Copy');
  const [devMinutes, setDevMinutes] = useState(25);
  const [devCoverColor, setDevCoverColor] = useState<BookCoverColor>('navy');
  const [devCoverImage, setDevCoverImage] = useState<string | undefined>(undefined);
  const [devPdfUrl, setDevPdfUrl] = useState<string | undefined>(undefined);
  const [devPdfBytes, setDevPdfBytes] = useState<Uint8Array | undefined>(undefined);
  const [devLinkUrl, setDevLinkUrl] = useState('');
  const [devSummary, setDevSummary] = useState('');
  const [devChapterTitle, setDevChapterTitle] = useState('Chapter 1: Study Notes');
  const [devChapterContent, setDevChapterContent] = useState('');
  const [devFileName, setDevFileName] = useState('');
  const [devError, setDevError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);

  const [highlightText, setHighlightText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [highlightColor, setHighlightColor] = useState<'amber' | 'emerald' | 'navy'>('amber');
  const [feedback, setFeedback] = useState<string | null>(null);

  const [readerTheme, setReaderTheme] = useState<ReaderPaperTheme>(() => {
    try {
      const raw = localStorage.getItem(READER_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { theme?: ReaderPaperTheme };
        if (parsed.theme === 'white' || parsed.theme === 'sepia' || parsed.theme === 'dark') {
          return parsed.theme;
        }
      }
    } catch {
      // fallback to default
    }
    return 'white';
  });
  const [readerFont, setReaderFont] = useState<ReaderFontFamily>(() => {
    try {
      const raw = localStorage.getItem(READER_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { font?: ReaderFontFamily };
        if (parsed.font === 'serif' || parsed.font === 'sans') return parsed.font;
      }
    } catch {
      // fallback to default
    }
    return 'serif';
  });
  const [readerFontStep, setReaderFontStep] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(READER_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { fontStep?: number };
        if (typeof parsed.fontStep === 'number' && parsed.fontStep >= 0 && parsed.fontStep <= 3) {
          return parsed.fontStep;
        }
      }
    } catch {
      // fallback to default
    }
    return 1;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        READER_PREFS_KEY,
        JSON.stringify({ theme: readerTheme, font: readerFont, fontStep: readerFontStep })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [readerTheme, readerFont, readerFontStep]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_BOOKS_KEY, JSON.stringify(recentBookIds.slice(0, 4)));
    } catch {
      // ignore storage quota errors
    }
  }, [recentBookIds]);

  const readerRef = useRef<HTMLDivElement | null>(null);
  const deviceBookInputRef = useRef<HTMLInputElement | null>(null);
  const deviceCoverInputRef = useRef<HTMLInputElement | null>(null);
  const quickPdfInputRef = useRef<HTMLInputElement | null>(null);
  const devTitleInputRef = useRef<HTMLInputElement | null>(null);

  const activeBook = books.find((b) => b.id === selectedBookId) ?? books[0];
  const activeChapter = activeBook?.chapters[selectedChapterIndex] ?? activeBook?.chapters[0];
  const previewBook = books.find((b) => b.id === previewBookId) ?? null;

  const recentBooks = useMemo(
    () => recentBookIds.map((id) => books.find((b) => b.id === id)).filter((b): b is HealthBook => Boolean(b)),
    [recentBookIds, books]
  );

  const favoriteIds = profile.favoriteBooks ?? [];
  const isDownloaded = activeBook ? profile.downloadedModules.includes(activeBook.id) : false;
  const isActiveFavorited = activeBook ? favoriteIds.includes(activeBook.id) : false;

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter((book) => {
      if (filterCategory === 'Favorites' && !favoriteIds.includes(book.id)) {
        return false;
      }
      if (
        filterCategory !== 'All' &&
        filterCategory !== 'Favorites' &&
        book.subject !== filterCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.subject.toLowerCase().includes(q)
      );
    });
  }, [books, filterCategory, favoriteIds, searchQuery]);

  function openBookInReader(bookId: string) {
    setSelectedBookId(bookId);
    setSelectedChapterIndex(0);
    setPreviewBookId(null);
    setRecentBookIds((prev) => [bookId, ...prev.filter((id) => id !== bookId)].slice(0, 4));
    setTimeout(() => {
      readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function handleSelectionGrab() {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      setHighlightText(selection.slice(0, 480));
    }
  }

  async function handleAddAnnotation(e: React.FormEvent) {
    e.preventDefault();
    if (!highlightText.trim() || !activeBook || !activeChapter) return;
    await onSaveAnnotation({
      bookId: activeBook.id,
      pageTitle: activeChapter.title,
      highlightText: highlightText.trim(),
      note: noteText.trim(),
      color: highlightColor,
    });
    setHighlightText('');
    setNoteText('');
    setFeedback(isSo ? 'Calaamadda iyo xusuus-qorka waa la kaydiyay.' : 'Highlight and note saved.');
    setTimeout(() => setFeedback(null), 2500);
  }

  async function handleChooseBookFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDevError(null);
    setIsReadingFile(true);
    try {
      const parsed = await parseDeviceBookFile(file);
      setDevFileName(file.name);
      setDevSummary(parsed.summary);
      setDevChapterContent(parsed.chapterContent);
      setDevPdfUrl(parsed.pdfUrl);
      setDevPdfBytes(parsed.pdfBytes);
      setDevMinutes(parsed.estimatedMinutes);
    } catch (err) {
      setDevError(
        err instanceof Error
          ? err.message
          : isSo
          ? 'Faylka lama akhrin karin.'
          : 'Unable to read selected file.'
      );
    } finally {
      setIsReadingFile(false);
      e.target.value = '';
    }
  }

  async function handleQuickOpenPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDevError(null);
    setIsReadingFile(true);
    try {
      const parsed = await parseDeviceBookFile(file);
      setDevFileName(file.name);
      setDevTitle('');
      setDevSummary(parsed.summary);
      setDevChapterContent(parsed.chapterContent);
      setDevPdfUrl(parsed.pdfUrl);
      setDevPdfBytes(parsed.pdfBytes);
      setDevMinutes(parsed.estimatedMinutes);
      setChooseTab('file');
      setShowDeviceModal(true);
      setTimeout(() => {
        devTitleInputRef.current?.focus();
      }, 60);
    } catch (err) {
      setFeedback(
        err instanceof Error
          ? err.message
          : isSo
          ? 'PDF-ka lama akhrin karin.'
          : 'Could not read selected PDF file.'
      );
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsReadingFile(false);
      e.target.value = '';
    }
  }

  async function handleChooseCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDevError(null);
    try {
      const imgUrl = await readDeviceCoverImage(file);
      setDevCoverImage(imgUrl);
    } catch (err) {
      setDevError(
        err instanceof Error
          ? err.message
          : isSo
          ? 'Sawirka jaldigga lama akhrin karin.'
          : 'Unable to read selected cover image.'
      );
    } finally {
      e.target.value = '';
    }
  }

  async function handleSubmitDeviceBook(e: React.FormEvent) {
    e.preventDefault();
    setDevError(null);
    if (!devTitle.trim()) {
      setDevError(
        isSo
          ? 'Fadlan gacanta ku qor magaca buugga.'
          : 'Please enter the book name manually.'
      );
      return;
    }

    const trimmedLink = devLinkUrl.trim();
    if (chooseTab === 'compose') {
      if (trimmedLink && !/^https?:\/\//i.test(trimmedLink)) {
        setDevError(
          isSo
            ? 'Link-ga PDF waa inuu ku bilaabmaa https:// ama http://'
            : 'PDF link must start with https:// or http://'
        );
        return;
      }
      if (!devChapterContent.trim() && !trimmedLink) {
        setDevError(
          isSo
            ? 'Fadlan ku qor qoraalka cutubka ama geli link-ga PDF.'
            : 'Please write chapter notes or paste a direct PDF link.'
        );
        return;
      }
    } else if (!devChapterContent.trim() && !devPdfUrl && !devPdfBytes) {
      setDevError(
        isSo
          ? 'Fadlan ka dooro fayl (.pdf, .txt, .md, .html) qalabkaaga.'
          : 'Please choose a book file (.pdf, .txt, .md, .html) from your device.'
      );
      return;
    }

    const finalPdfUrl = chooseTab === 'file' ? devPdfUrl : trimmedLink || undefined;
    const finalPdfBytes = chooseTab === 'file' ? devPdfBytes : undefined;

    const newBookId = await onAddDeviceBook({
      title: devTitle.trim(),
      author: devAuthor.trim() || profile.displayName || 'Device Textbook',
      subject: devSubject,
      edition: devEdition.trim() || (chooseTab === 'compose' ? 'Study Notes' : 'Device Copy'),
      readMinutes: Math.max(1, Math.min(1000, Number(devMinutes) || 20)),
      summary:
        devSummary.trim() ||
        (chooseTab === 'compose'
          ? trimmedLink
            ? `Linked PDF resource for ${devSubject}.`
            : `Custom ${devSubject} study chapter.`
          : `Imported from device (${devFileName || 'Local Book'}).`),
      coverColor: devCoverColor,
      coverImage: devCoverImage,
      pdfUrl: finalPdfUrl,
      pdfBytes: finalPdfBytes,
      chapterTitle: devChapterTitle.trim() || 'Chapter 1: Overview',
      chapterContent:
        devChapterContent.trim() ||
        devSummary.trim() ||
        (trimmedLink
          ? `Linked PDF book "${devTitle.trim()}" opened inside the in-app PDF reader.`
          : `Imported book "${devTitle.trim()}" from device.`),
    });

    setShowDeviceModal(false);
    setChooseTab('file');
    setDevTitle('');
    setDevFileName('');
    setDevSummary('');
    setDevChapterContent('');
    setDevCoverImage(undefined);
    setDevPdfUrl(undefined);
    setDevPdfBytes(undefined);
    setDevLinkUrl('');

    if (newBookId) {
      openBookInReader(newBookId);
    }
    setFeedback(
      isSo
        ? 'Buugga waa lagu daray waxaana lagu furay gudaha app-ka.'
        : 'Book added and opened inside the in-app reader.'
    );
    setTimeout(() => setFeedback(null), 3500);
  }

  const bookAnnotations = activeBook ? annotations.filter((a) => a.bookId === activeBook.id) : [];
  const displaySeconds = activeStudySession ? sessionElapsedSeconds : 0;
  const mm = String(Math.floor(displaySeconds / 60)).padStart(2, '0');
  const ss = String(displaySeconds % 60).padStart(2, '0');

  return (
    <div className="space-y-5">
      <PageHeroHeader
        thumbSrc={thumbBooks}
        thumbAlt="Hilaac Medical Textbooks Library"
        kicker={isSo ? 'Maktabadda Caafimaadka' : 'Digital Medical Library'}
        title={isSo ? 'Buugaagta Caafimaadka & Akhriska' : 'Health Books Library & Reader'}
        subtitle={
          isSo
            ? 'Ka soo qaado buug qalabkaaga (.pdf, .txt), calaamadee kuwaad jeceshahay, kuna akhri Cad, Sepia ama Madow.'
            : 'Explore textbooks, choose books from your device (.pdf, .txt), save favorites, and read in White, Sepia, or Dark.'
        }
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={quickPdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleQuickOpenPdf}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => quickPdfInputRef.current?.click()}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-[#10234B] hover:bg-[#193366] dark:bg-[#13203C] dark:border dark:border-[#F59E0B]/60 text-white text-xs font-bold transition-colors"
            >
              <FileText className="w-4 h-4 text-[#F59E0B]" />
              {isSo ? 'Fur PDF App-ka' : 'Open PDF in App'}
            </button>

            <button
              type="button"
              onClick={() => setShowDeviceModal(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold transition-colors"
            >
              <FileUp className="w-4 h-4" />
              {isSo ? 'Dooro / Ku Dar Buug' : 'Choose / Add Book'}
            </button>

            <div className="min-h-[40px] flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-1.5">
              <span
                className={`font-mono text-sm font-bold tabular-nums ${
                  activeStudySession?.status === 'paused'
                    ? 'text-[#B45309] dark:text-[#F59E0B]'
                    : activeStudySession?.status === 'running'
                    ? 'text-[#079B62]'
                    : 'text-[#10234B] dark:text-white'
                }`}
              >
                {mm}:{ss}
              </span>
              {!activeStudySession ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeBook && activeChapter) {
                      onStartStudySession(activeBook.subject, `${activeBook.title}: ${activeChapter.title}`);
                    } else {
                      onStartStudySession('Pharmacology', isSo ? 'Akhriska Buugaagta' : 'Medical Book Reading');
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#079B62] text-white text-xs font-bold hover:bg-[#058152]"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isSo ? 'Bilow' : 'Start Timer'}
                </button>
              ) : (
                <>
                  {activeStudySession.status === 'running' ? (
                    <button
                      type="button"
                      onClick={onPauseStudySession}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#F59E0B] text-[#10234B] text-xs font-bold hover:bg-[#D97706]"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      {isSo ? 'Haki' : 'Pause'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onResumeStudySession}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#079B62] text-white text-xs font-bold hover:bg-[#058152]"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isSo ? 'Sii Wad' : 'Resume'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onFinishStudySession}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#10234B] text-white text-xs font-bold hover:opacity-90"
                  >
                    <Square className="w-3.5 h-3.5" />
                    {isSo ? 'Dhammee' : 'Finish'}
                  </button>
                </>
              )}
            </div>
          </div>
        }
      />

      {feedback && (
        <div
          role="status"
          className="rounded-[10px] border border-[#079B62]/40 bg-[#ECFDF5] dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-bold text-[#079B62] dark:text-emerald-300"
        >
          {feedback}
        </div>
      )}

      {/* Continue Reading / Reading History Strip */}
      {recentBooks.length > 0 && (
        <SectionCard className="p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#10234B] dark:text-white">
              <Clock className="w-3.5 h-3.5 text-[#079B62]" />
              <span>{isSo ? 'Taariikhda Akhriska & Sii Wad' : 'Reading History & Continue'}</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-[#475569] dark:text-slate-400 tabular-nums">
              {recentBooks.length} {isSo ? 'buug' : 'recent'}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {recentBooks.map((rb) => {
              const isCurrent = activeBook && rb.id === activeBook.id;
              return (
                <button
                  key={rb.id}
                  type="button"
                  onClick={() => openBookInReader(rb.id)}
                  className={`min-h-[40px] inline-flex items-center gap-2 px-3 py-1.5 rounded-[9px] border text-left transition-colors shrink-0 max-w-[260px] ${
                    isCurrent
                      ? 'border-[#079B62] bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#079B62] dark:text-emerald-300'
                      : 'border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-[#10234B] dark:text-slate-200 hover:border-[#079B62]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0 text-[#079B62]" />
                  <span className="text-xs font-bold truncate">{rb.title}</span>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Filter & Search Bar + Catalog Grid */}
      <SectionCard className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {SUBJECT_FILTERS.map((cat) => {
              const active = filterCategory === cat;
              const label =
                cat === 'All'
                  ? isSo
                    ? 'Dhammaan'
                    : 'All'
                  : cat === 'Favorites'
                  ? `${isSo ? 'La Jecel Yahay' : 'Favorites'} (${favoriteIds.length})`
                  : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#10234B] dark:bg-[#079B62] text-white'
                      : 'bg-[#F1F5F9] dark:bg-[#13203C] text-[#475569] dark:text-slate-300 hover:text-[#10234B] dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isSo ? 'Raadi buug ama qoraa...' : 'Search textbook or author...'}
              aria-label={isSo ? 'Raadi buugaagta' : 'Search health books'}
              className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-8 pr-3 py-2 text-xs text-[#10234B] dark:text-white"
            />
          </div>
        </div>

        {/* Book Covers Grid */}
        {filteredBooks.length === 0 ? (
          <EmptyStateBox
            icon={<BookOpen className="w-5 h-5" />}
            title={isSo ? 'Buug lagama helin qaybtan' : 'No books match your filter'}
            description={
              isSo
                ? 'Beddel raadinta ama dooro Dhammaan si aad u aragto maktabadda oo dhan.'
                : 'Try clearing the search query or switching back to All categories.'
            }
            actionLabel={isSo ? 'Muuji Dhammaan' : 'Show All Books'}
            onAction={() => {
              setFilterCategory('All');
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {filteredBooks.map((book) => {
              const active = activeBook && book.id === activeBook.id;
              const cached = profile.downloadedModules.includes(book.id);
              const favorited = favoriteIds.includes(book.id);

              return (
                <div
                  key={book.id}
                  className={`rounded-[14px] border p-3.5 transition-colors flex gap-3.5 ${
                    active
                      ? 'border-[#079B62] bg-[#ECFDF5]/40 dark:bg-[#13203C]'
                      : 'border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] hover:border-[#079B62]/60'
                  }`}
                >
                  {/* 3:4 Book Cover */}
                  <div className="w-20 sm:w-24 shrink-0">
                    <BookCoverVisual book={book} compact />
                  </div>

                  {/* Book Metadata + Preview / Favorite / Read Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#079B62] truncate">
                          {book.subject}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFavoriteBook(book.id)}
                          aria-label={
                            favorited
                              ? `${isSo ? 'Ka saar' : 'Remove'} ${book.title}`
                              : `${isSo ? 'Calaamadee' : 'Favorite'} ${book.title}`
                          }
                          className={`p-1.5 rounded-md transition-colors shrink-0 ${
                            favorited
                              ? 'text-[#D97706] dark:text-[#F59E0B] bg-[#FFFBEB] dark:bg-amber-950/40'
                              : 'text-slate-400 hover:text-[#F59E0B]'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <h2 className="mt-0.5 font-display text-sm font-extrabold text-[#10234B] dark:text-white leading-snug line-clamp-2">
                        {book.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#475569] dark:text-slate-300 truncate">
                        {book.author}
                      </p>
                      <div className="mt-1 text-[11px] text-[#475569] dark:text-slate-400">
                        {book.edition} · {book.readMinutes}m {cached ? '· Offline' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewBookId(book.id)}
                        className="min-h-[36px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isSo ? 'Eeg' : 'Preview'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openBookInReader(book.id)}
                        className="min-h-[36px] flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-[8px] bg-[#10234B] dark:bg-[#079B62] text-white text-xs font-bold hover:opacity-95"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {isSo ? 'Akhri' : 'Read'}
                      </button>
                      {book.isCustom && (book.authorUid === profile.uid || profile.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => onDeleteBook(book.id)}
                          aria-label={`${isSo ? 'Tirtir' : 'Remove'} ${book.title}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Reader Viewport + Annotation Margin */}
      {activeBook && activeChapter && (() => {
        const paper = READER_THEME_STYLES[readerTheme];
        const fontSpec = READER_FONT_SIZES[readerFontStep] ?? READER_FONT_SIZES[1];
        const hasPrevChapter = selectedChapterIndex > 0;
        const hasNextChapter = selectedChapterIndex < activeBook.chapters.length - 1;

        return (
          <div ref={readerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <article
              className={`lg:col-span-8 rounded-[16px] border p-4 sm:p-8 transition-colors shadow-[0_2px_12px_rgba(16,35,75,0.05)] ${paper.container}`}
            >
              <div className={`flex flex-wrap items-start justify-between gap-4 border-b pb-5 ${paper.divider}`}>
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="hidden sm:block w-16 shrink-0">
                    <BookCoverVisual book={activeBook} compact />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold ${paper.muted}`}>
                      {activeBook.author} · {activeBook.edition}
                    </div>
                    <h2 className={`mt-1 font-display text-lg sm:text-xl font-extrabold tracking-tight ${paper.heading}`}>
                      {activeBook.title}
                    </h2>
                    <p className={`mt-1 text-xs leading-relaxed ${paper.muted}`}>
                      {activeBook.summary}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleFavoriteBook(activeBook.id)}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold border transition-colors ${
                      isActiveFavorited
                        ? 'border-[#F59E0B] bg-[#FFFBEB] dark:bg-amber-950/40 text-[#B45309] dark:text-[#F59E0B]'
                        : paper.actionBtn
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isActiveFavorited ? 'fill-current' : ''}`} />
                    {isActiveFavorited
                      ? isSo
                        ? 'La Jecel Yahay'
                        : 'Favorited'
                      : isSo
                      ? 'Calaamadee'
                      : 'Favorite'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleDownloadBook(activeBook.id)}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold border transition-colors ${
                      isDownloaded
                        ? 'border-[#079B62] bg-[#079B62]/15 text-[#079B62] dark:text-emerald-300'
                        : paper.actionBtn
                    }`}
                  >
                    {isDownloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    {isDownloaded
                      ? isSo
                        ? 'Diyaar Offline'
                        : 'Available Offline'
                      : isSo
                      ? 'Kaydi Offline'
                      : 'Save Offline'}
                  </button>
                </div>
              </div>

              {/* Reader Paper Theme (White / Sepia / Dark) & Typography Controls */}
              <div
                className={`mt-4 rounded-[12px] border px-3 py-2.5 flex flex-wrap items-center justify-between gap-2.5 ${paper.toolbar}`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] font-bold uppercase tracking-wider mr-0.5 ${paper.muted}`}>
                    {isSo ? 'Midabka:' : 'Paper:'}
                  </span>
                  {(['white', 'sepia', 'dark'] as const).map((mode) => {
                    const spec = READER_THEME_STYLES[mode];
                    const activeMode = readerTheme === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setReaderTheme(mode)}
                        aria-pressed={activeMode}
                        className={`min-h-[32px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-xs font-bold border transition-all ${
                          activeMode
                            ? `${paper.chapterActive} border-transparent shadow-xs`
                            : `${paper.actionBtn} bg-transparent`
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full border ${spec.swatch}`} />
                        {mode === 'white' && <Sun className="w-3 h-3 hidden sm:inline" />}
                        {mode === 'dark' && <Moon className="w-3 h-3 hidden sm:inline" />}
                        <span>{isSo ? spec.soLabel : spec.enLabel}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`inline-flex items-center rounded-[7px] border p-0.5 ${paper.divider}`}>
                    <button
                      type="button"
                      onClick={() => setReaderFont('serif')}
                      className={`px-2.5 py-1 rounded-[5px] text-xs font-bold transition-colors font-reader-serif ${
                        readerFont === 'serif' ? paper.chapterActive : paper.muted
                      }`}
                    >
                      Serif
                    </button>
                    <button
                      type="button"
                      onClick={() => setReaderFont('sans')}
                      className={`px-2.5 py-1 rounded-[5px] text-xs font-bold transition-colors ${
                        readerFont === 'sans' ? paper.chapterActive : paper.muted
                      }`}
                    >
                      Sans
                    </button>
                  </div>

                  <div className={`inline-flex items-center gap-1 rounded-[7px] border px-1.5 py-0.5 ${paper.divider}`}>
                    <Type className={`w-3.5 h-3.5 ${paper.muted}`} />
                    <button
                      type="button"
                      onClick={() => setReaderFontStep((s) => Math.max(0, s - 1))}
                      disabled={readerFontStep === 0}
                      aria-label={isSo ? 'Yaree qoraalka' : 'Decrease text size'}
                      className={`px-1.5 py-0.5 rounded text-xs font-bold disabled:opacity-35 ${paper.heading}`}
                    >
                      A-
                    </button>
                    <span className={`font-mono text-[11px] font-bold tabular-nums px-1 ${paper.muted}`}>
                      {fontSpec.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReaderFontStep((s) => Math.min(READER_FONT_SIZES.length - 1, s + 1))}
                      disabled={readerFontStep === READER_FONT_SIZES.length - 1}
                      aria-label={isSo ? 'Weynee qoraalka' : 'Increase text size'}
                      className={`px-1.5 py-0.5 rounded text-xs font-bold disabled:opacity-35 ${paper.heading}`}
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              {/* Chapter Tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                {activeBook.chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChapterIndex(idx)}
                    className={`min-h-[34px] px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors text-left ${
                      idx === selectedChapterIndex ? paper.chapterActive : paper.chapterIdle
                    }`}
                  >
                    {ch.title}
                  </button>
                ))}
              </div>

              {(activeBook.hasLocalPdf || activeBook.pdfUrl) && (
                <InAppPdfViewer
                  book={activeBook}
                  paperTheme={readerTheme}
                  language={language}
                  onSendTextToHighlight={(txt) => setHighlightText(txt)}
                />
              )}

              {/* Editorial Reading Column */}
              <div onMouseUp={handleSelectionGrab} className="mt-6 max-w-[66ch] mx-auto">
                <div className={`text-[11px] font-bold uppercase tracking-[0.12em] ${paper.accent}`}>
                  {isSo ? 'Cutubka' : 'Chapter'} {selectedChapterIndex + 1} / {activeBook.chapters.length} ·{' '}
                  {activeBook.subject}
                </div>

                <h3
                  className={`mt-2 font-bold tracking-tight text-balance flex items-start gap-2.5 ${fontSpec.titleClass} ${paper.heading} ${
                    readerFont === 'serif' ? 'font-reader-serif' : 'font-display'
                  }`}
                >
                  <BookOpen className={`w-5 h-5 mt-1 shrink-0 ${paper.accent}`} />
                  <span>{activeChapter.title}</span>
                </h3>

                <div className={`mt-4 rounded-[10px] border px-3.5 py-2 text-xs ${paper.tipBox}`}>
                  {isSo
                    ? 'Talo: Calaamadee tuduc kasta oo hoose si aad ugu kaydiso xusuus-qorkaaga.'
                    : 'Tip: Highlight any sentence below to save it into your study annotations.'}
                </div>

                <div
                  className={`mt-6 space-y-5 text-pretty ${fontSpec.bodyClass} ${paper.prose} ${
                    readerFont === 'serif' ? 'font-reader-serif' : ''
                  }`}
                >
                  {activeChapter.paragraphs.map((p, idx) => (
                    <p
                      key={idx}
                      className={
                        idx === 0
                          ? 'first-letter:text-[2.2em] first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-[0.95] first-letter:mt-1'
                          : ''
                      }
                    >
                      {p}
                    </p>
                  ))}
                </div>

                {/* Previous / Next Chapter Navigation */}
                {activeBook.chapters.length > 1 && (
                  <div className={`mt-8 pt-5 border-t flex items-center justify-between gap-2 ${paper.divider}`}>
                    <button
                      type="button"
                      disabled={!hasPrevChapter}
                      onClick={() => {
                        setSelectedChapterIndex((i) => Math.max(0, i - 1));
                        readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`min-h-[38px] inline-flex items-center gap-1 px-3 py-2 rounded-[8px] border text-xs font-bold transition-colors disabled:opacity-40 ${paper.actionBtn}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isSo ? 'Cutubkii Hore' : 'Previous Chapter'}
                      </span>
                      <span className="sm:hidden">{isSo ? 'Hore' : 'Prev'}</span>
                    </button>
                    <span className={`font-mono text-xs tabular-nums ${paper.muted}`}>
                      {selectedChapterIndex + 1} / {activeBook.chapters.length}
                    </span>
                    <button
                      type="button"
                      disabled={!hasNextChapter}
                      onClick={() => {
                        setSelectedChapterIndex((i) => Math.min(activeBook.chapters.length - 1, i + 1));
                        readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`min-h-[38px] inline-flex items-center gap-1 px-3 py-2 rounded-[8px] border text-xs font-bold transition-colors disabled:opacity-40 ${paper.actionBtn}`}
                    >
                      <span className="hidden sm:inline">
                        {isSo ? 'Cutubka Xiga' : 'Next Chapter'}
                      </span>
                      <span className="sm:hidden">{isSo ? 'Xiga' : 'Next'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </article>

            {/* Annotation Tool Panel */}
            <SectionCard className="lg:col-span-4 p-4 sm:p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <Highlighter className="w-4 h-4 text-[#F59E0B]" />
                  <h3 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                    {isSo ? 'Calaamadeynta & Xusuus-qorka' : 'Annotations & Highlights'}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-[#475569] dark:text-slate-400">
                  {isSo
                    ? 'Kaydi qeexitaannada muhiimka ah iyo qoraalladaada gaarka ah.'
                    : 'Capture key definitions or add study margin notes.'}
                </p>
              </div>

              <form onSubmit={handleAddAnnotation} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#10234B] dark:text-slate-300 mb-1">
                    {isSo ? 'Qoraalka La Doortay' : 'Highlighted Excerpt'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={highlightText}
                    onChange={(e) => setHighlightText(e.target.value)}
                    placeholder={
                      isSo
                        ? 'Ka dooro qoraal buugga ama ku dheji halkan...'
                        : 'Select text in the book or paste a key quote...'
                    }
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10234B] dark:text-slate-300 mb-1">
                    {isSo ? 'Xusuus-qorkaaga' : 'Personal Margin Note'}
                  </label>
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={isSo ? 'Tusaale: Qodob muhiim u ah imtixaanka' : 'e.g., High-yield exam alert'}
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(['amber', 'emerald', 'navy'] as const).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setHighlightColor(col)}
                        aria-label={`${isSo ? 'Midabka' : 'Highlight color'} ${col}`}
                        className={`w-6 h-6 rounded-full border-2 ${
                          col === 'amber'
                            ? 'bg-[#F59E0B]'
                            : col === 'emerald'
                            ? 'bg-[#079B62]'
                            : 'bg-[#10234B]'
                        } ${
                          highlightColor === col ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="min-h-[36px] px-3.5 py-1.5 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold transition-colors"
                  >
                    {isSo ? 'Kaydi' : 'Save Note'}
                  </button>
                </div>
              </form>

              <div className="border-t border-[#E2E8F0] dark:border-[#1E2E4D] pt-4 space-y-2.5">
                <div className="text-xs font-bold text-[#10234B] dark:text-slate-300">
                  {isSo ? 'Calaamadaha Kaydsan' : 'Saved Annotations'} ({bookAnnotations.length})
                </div>
                {bookAnnotations.length === 0 ? (
                  <p className="text-xs text-[#475569] dark:text-slate-400">
                    {isSo
                      ? 'Weli wax calaamad ah looma kaydin buuggan.'
                      : 'No highlights saved for this book yet.'}
                  </p>
                ) : (
                  bookAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      className={`rounded-[9px] border p-3 text-xs space-y-1 ${
                        HIGHLIGHT_STYLES[ann.color] ?? HIGHLIGHT_STYLES.amber
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[#10234B] dark:text-slate-100">
                          “{ann.highlightText}”
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteAnnotation(ann.id)}
                          aria-label={isSo ? 'Tirtir calaamadda' : 'Delete annotation'}
                          className="text-slate-500 hover:text-red-600 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {ann.note && (
                        <div className="text-[#10234B]/90 dark:text-slate-300 font-medium">
                          {isSo ? 'Xusuus:' : 'Note:'} {ann.note}
                        </div>
                      )}
                      <div className="text-[11px] text-[#475569] dark:text-slate-400">
                        {ann.pageTitle}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        );
      })()}

      {/* Book Preview Modal */}
      {previewBook && (
        <div
          className="fixed inset-0 z-50 bg-[#091734]/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-preview-title"
          onClick={() => setPreviewBookId(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[18px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-2xl p-5 sm:p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                <div className="w-32 sm:w-40 shrink-0 mx-auto sm:mx-0">
                  <BookCoverVisual book={previewBook} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#079B62]">
                    {previewBook.subject} · {previewBook.edition} · {previewBook.readMinutes}{' '}
                    {isSo ? 'daqiiqo' : 'min read'}
                  </div>
                  <h2
                    id="book-preview-title"
                    className="font-display text-lg sm:text-xl font-extrabold text-[#10234B] dark:text-white"
                  >
                    {previewBook.title}
                  </h2>
                  <p className="text-xs font-semibold text-[#475569] dark:text-slate-300">
                    {previewBook.author}
                  </p>
                  <p className="text-sm text-[#10234B]/90 dark:text-slate-300 leading-relaxed pt-1">
                    {previewBook.summary}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewBookId(null)}
                aria-label={isSo ? 'Xir' : 'Close preview'}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-[#10234B] dark:hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-[#E2E8F0] dark:border-[#1E2E4D] pt-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                {isSo ? 'Tusmada Cutubyada' : 'Table of Contents'} ({previewBook.chapters.length}{' '}
                {isSo ? 'cutub' : 'chapters'})
              </div>
              <ul className="space-y-1.5">
                {previewBook.chapters.map((ch) => (
                  <li
                    key={ch.id}
                    className="text-xs font-semibold text-[#10234B] dark:text-slate-200 flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#079B62] shrink-0" />
                    <span>{ch.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {previewBook.chapters[0]?.paragraphs[0] && (
              <div className="rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] p-4 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#079B62]">
                  {isSo ? 'Hordhac' : 'Preview Excerpt'} — {previewBook.chapters[0].title}
                </div>
                <p className="text-sm leading-relaxed text-[#10234B]/90 dark:text-slate-200">
                  {previewBook.chapters[0].paragraphs[0]}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0] dark:border-[#1E2E4D]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleFavoriteBook(previewBook.id)}
                  className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border text-xs font-bold transition-colors ${
                    favoriteIds.includes(previewBook.id)
                      ? 'border-[#F59E0B] bg-[#FFFBEB] dark:bg-amber-950/40 text-[#B45309] dark:text-[#F59E0B]'
                      : 'border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200'
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${favoriteIds.includes(previewBook.id) ? 'fill-current' : ''}`}
                  />
                  {favoriteIds.includes(previewBook.id)
                    ? isSo
                      ? 'La Jecel Yahay'
                      : 'Favorited'
                    : isSo
                    ? 'Ku Dar Kuwa La Jecel Yahay'
                    : 'Add to Favorites'}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleDownloadBook(previewBook.id)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62]"
                >
                  <Download className="w-3.5 h-3.5" />
                  {profile.downloadedModules.includes(previewBook.id)
                    ? isSo
                      ? 'Diyaar Offline'
                      : 'Saved Offline'
                    : isSo
                    ? 'Kaydi Offline'
                    : 'Save Offline'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => openBookInReader(previewBook.id)}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold"
              >
                <BookOpen className="w-4 h-4" />
                {isSo ? 'Ku Fur Akhristaha' : 'Open Full Reader'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choose Book Modal (2 Parts: Device File vs Write Notes / PDF Link) */}
      {showDeviceModal && (
        <div
          className="fixed inset-0 z-50 bg-[#091734]/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-book-modal-title"
          onClick={() => setShowDeviceModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[18px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-2xl p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="device-book-modal-title"
                  className="font-display text-lg font-extrabold text-[#10234B] dark:text-white"
                >
                  {isSo ? 'Dooro ama Ku Dar Buug' : 'Choose or Add a Study Book'}
                </h2>
                <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                  {isSo
                    ? 'Qeybta 1: Ka dooro PDF/TXT qalabkaaga. Qeybta 2: Qor cutub ama ku dar PDF link.'
                    : 'Part 1: Choose a PDF/TXT file from your device. Part 2: Write study notes or paste a PDF link.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeviceModal(false)}
                aria-label={isSo ? 'Xir' : 'Close device book dialog'}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-[#10234B] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Two-Part Choose Selector */}
            <div className="grid grid-cols-2 gap-2 rounded-[11px] bg-[#F1F5F9] dark:bg-[#13203C] p-1">
              <button
                type="button"
                onClick={() => {
                  setChooseTab('file');
                  setDevError(null);
                }}
                className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-[8px] px-2.5 py-2 text-xs font-bold transition-colors ${
                  chooseTab === 'file'
                    ? 'bg-[#079B62] text-white shadow-xs'
                    : 'text-[#475569] dark:text-slate-300 hover:text-[#10234B] dark:hover:text-white'
                }`}
              >
                <FileUp className="w-3.5 h-3.5 shrink-0" />
                <span>{isSo ? '1. Ka Dooro Fayl' : '1. Choose File'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setChooseTab('compose');
                  setDevError(null);
                }}
                className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-[8px] px-2.5 py-2 text-xs font-bold transition-colors ${
                  chooseTab === 'compose'
                    ? 'bg-[#10234B] dark:bg-[#079B62] text-white shadow-xs'
                    : 'text-[#475569] dark:text-slate-300 hover:text-[#10234B] dark:hover:text-white'
                }`}
              >
                <PenLine className="w-3.5 h-3.5 shrink-0" />
                <span>{isSo ? '2. Qor / PDF Link' : '2. Notes / PDF Link'}</span>
              </button>
            </div>

            <form onSubmit={handleSubmitDeviceBook} className="space-y-3">
              {chooseTab === 'file' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <input
                      ref={deviceBookInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.html,.htm,.json,application/pdf,text/plain"
                      onChange={handleChooseBookFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => deviceBookInputRef.current?.click()}
                      className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[9px] border-2 border-dashed border-[#079B62] bg-[#ECFDF5] dark:bg-emerald-950/30 text-xs font-bold text-[#079B62] dark:text-emerald-300"
                    >
                      <FileUp className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {isReadingFile
                          ? isSo
                            ? 'Akhrinaya faylka...'
                            : 'Reading file...'
                          : devFileName
                          ? devFileName.slice(0, 22)
                          : isSo
                          ? 'Dooro Fayl (.pdf/.txt)'
                          : 'Choose Book File (.pdf/.txt)'}
                      </span>
                    </button>
                  </div>

                  <div>
                    <input
                      ref={deviceCoverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleChooseCoverFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => deviceCoverInputRef.current?.click()}
                      className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62]"
                    >
                      <ImagePlus className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {devCoverImage
                          ? isSo
                            ? 'Jaldigga Waa Diyaar'
                            : 'Cover Image Ready'
                          : isSo
                          ? 'Dooro Sawirka Jaldigga'
                          : 'Choose Cover Image'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 rounded-[12px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C]/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#079B62]">
                      {isSo ? 'Qeybta 2: Qor Cutub ama Geli Link PDF' : 'Part 2: Write Chapter Notes or Paste PDF Link'}
                    </span>
                    <div>
                      <input
                        ref={deviceCoverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleChooseCoverFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => deviceCoverInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10234B] dark:text-slate-200 hover:text-[#079B62]"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>{devCoverImage ? (isSo ? 'Jaldig Diyaar' : 'Cover Set') : isSo ? 'Sawir' : 'Cover'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={devLinkUrl}
                      onChange={(e) => setDevLinkUrl(e.target.value)}
                      placeholder={
                        isSo
                          ? 'Link PDF toos ah (ikhtiyaari): https://.../book.pdf'
                          : 'Direct PDF URL (optional): https://.../book.pdf'
                      }
                      className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] pl-8 pr-3 py-2 text-xs text-[#10234B] dark:text-white"
                    />
                  </div>

                  <input
                    type="text"
                    maxLength={140}
                    value={devChapterTitle}
                    onChange={(e) => setDevChapterTitle(e.target.value)}
                    placeholder={isSo ? 'Cinwaanka Cutubka (tusaale: Cutubka 1)' : 'Chapter Title (e.g., Chapter 1: Notes)'}
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                  />

                  <textarea
                    rows={4}
                    maxLength={20000}
                    value={devChapterContent}
                    onChange={(e) => setDevChapterContent(e.target.value)}
                    placeholder={
                      isSo
                        ? 'Halkan ku qor ama ku dhaji casharkaaga caafimaad si aad ugu akhrido Cad, Sepia, ama Madow...'
                        : 'Write or paste your clinical study chapter here to read in White, Sepia, or Dark...'
                    }
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#10234B] dark:text-slate-200 mb-1">
                  {isSo ? 'Magaca Buugga (Gacanta ku qor)' : 'Book Name / Title (Manual Entry)'}
                </label>
                <input
                  ref={devTitleInputRef}
                  type="text"
                  required
                  maxLength={160}
                  value={devTitle}
                  onChange={(e) => setDevTitle(e.target.value)}
                  placeholder={
                    isSo
                      ? 'Gacanta ku qor magaca buugga...'
                      : 'Enter book name manually...'
                  }
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  maxLength={120}
                  value={devAuthor}
                  onChange={(e) => setDevAuthor(e.target.value)}
                  placeholder={isSo ? 'Qoraaga / Isha' : 'Author / Source'}
                  className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
                <select
                  value={devSubject}
                  onChange={(e) => setDevSubject(e.target.value as AcademicSubject)}
                  aria-label={isSo ? 'Maadada buugga' : 'Device book subject'}
                  className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-semibold text-[#10234B] dark:text-white"
                >
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Anatomy & Physiology">Anatomy &amp; Physiology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Clinical OPD">Clinical OPD</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5 items-center">
                <input
                  type="text"
                  maxLength={60}
                  value={devEdition}
                  onChange={(e) => setDevEdition(e.target.value)}
                  placeholder={isSo ? 'Daabacaadda' : 'Edition (e.g., Device Copy)'}
                  className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
                <div className="flex items-center gap-1.5 justify-end">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDevCoverColor(c.id)}
                      aria-label={c.label}
                      className={`w-6 h-6 rounded-md ${c.swatch} border-2 ${
                        devCoverColor === c.id ? 'border-[#F59E0B] scale-110' : 'border-transparent opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                maxLength={500}
                value={devSummary}
                onChange={(e) => setDevSummary(e.target.value)}
                placeholder={
                  isSo
                    ? 'Faahfaahin kooban (si toos ah ayay u buuxsamaysaa markaad fayl doorato)...'
                    : 'Short summary (auto-filled when you choose a file)...'
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />

              {devError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {devError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="min-h-[38px] px-3.5 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#475569] dark:text-slate-300"
                >
                  {isSo ? 'Jooji' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 py-2 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold"
                >
                  {isSo ? 'Ku Dar oo Fur' : 'Add & Open Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
