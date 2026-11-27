import React, { useMemo, useRef, useState } from 'react';
import {
  BellRing,
  BookPlus,
  Check,
  CheckCheck,
  Edit3,
  FileText,
  FileUp,
  ImagePlus,
  Loader2,
  Lock,
  Megaphone,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  AcademicSubject,
  AdminOwnerMeta,
  Announcement,
  AppLanguage,
  BookCoverColor,
  HealthBook,
  MonitoredUserSummary,
  RegistrationAlert,
  StudyLog,
  TaskItem,
  UserProfile,
  UserRole,
} from '../types';
import { parseDeviceBookFile, readDeviceCoverImage } from '../utils/deviceBooks';
import { EmptyStateBox, PageHeroHeader, SectionCard } from './UiPrimitives';
import thumbNotes from '../assets/images/thumb_ai_notes_1795767030204.jpg';

const SINGLE_ADMIN_EMAIL = 'aadamali989@gmail.com';

interface AdminTeacherPanelViewProps {
  profile: UserProfile;
  allUsers: UserProfile[];
  monitoredUsers: MonitoredUserSummary[];
  adminMeta: AdminOwnerMeta;
  announcements: Announcement[];
  books: HealthBook[];
  tasks: TaskItem[];
  studyLogs: StudyLog[];
  registrationAlerts: RegistrationAlert[];
  language?: AppLanguage;
  onMarkAlertRead: (alertId: string) => Promise<void>;
  onMarkAllAlertsRead: () => Promise<void>;
  onPublishAnnouncement: (announcement: {
    title: string;
    subject: AcademicSubject | 'All';
    dueDate: string;
    body: string;
  }) => Promise<void>;
  onAddBook: (book: {
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
  }) => Promise<string | null>;
  onDeleteBook: (bookId: string) => Promise<void>;
  onUpdateUserRole: (targetUid: string, nextRole: UserRole) => Promise<void>;
  onUpdateDisplayName: (nextName: string) => Promise<void>;
  onUpdateAdminMeta: (nextMeta: AdminOwnerMeta) => void;
}

const COVER_COLORS: { id: BookCoverColor; label: string; swatch: string }[] = [
  { id: 'navy', label: 'Hilaac Navy', swatch: 'bg-[#10234B]' },
  { id: 'emerald', label: 'Hilaac Green', swatch: 'bg-[#079B62]' },
  { id: 'orange', label: 'Clinical Amber', swatch: 'bg-[#D97706]' },
  { id: 'slate', label: 'Deep Slate', swatch: 'bg-[#334155]' },
];

export const AdminTeacherPanelView: React.FC<AdminTeacherPanelViewProps> = ({
  profile,
  allUsers,
  monitoredUsers,
  adminMeta,
  announcements,
  books,
  tasks,
  studyLogs,
  registrationAlerts,
  language = 'en',
  onMarkAlertRead,
  onMarkAllAlertsRead,
  onPublishAnnouncement,
  onAddBook,
  onDeleteBook,
  onUpdateUserRole,
  onUpdateDisplayName,
  onUpdateAdminMeta,
}) => {
  const isSo = language === 'so';
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<AcademicSubject | 'All'>('All');
  const [dueDate, setDueDate] = useState('');
  const [body, setBody] = useState('');

  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookSubject, setBookSubject] = useState<AcademicSubject>('Pharmacology');
  const [bookEdition, setBookEdition] = useState('1st Edition');
  const [bookMinutes, setBookMinutes] = useState(25);
  const [bookCoverColor, setBookCoverColor] = useState<BookCoverColor>('navy');
  const [bookCoverImage, setBookCoverImage] = useState<string | undefined>(undefined);
  const [bookPdfUrl, setBookPdfUrl] = useState<string | undefined>(undefined);
  const [bookPdfBytes, setBookPdfBytes] = useState<Uint8Array | undefined>(undefined);
  const [bookDeviceFileName, setBookDeviceFileName] = useState('');
  const [bookFilePreview, setBookFilePreview] = useState<{
    name: string;
    sizeLabel: string;
    pageCount?: number;
    isPdf: boolean;
  } | null>(null);
  const [isDraggingBook, setIsDraggingBook] = useState(false);
  const [isReadingBookFile, setIsReadingBookFile] = useState(false);
  const [bookSummary, setBookSummary] = useState('');
  const [chapterTitle, setChapterTitle] = useState('Chapter 1: Clinical Overview');
  const [chapterContent, setChapterContent] = useState('');

  const [notice, setNotice] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'student' | 'teacher' | 'google' | 'device'>('all');
  const [editingAdminProfile, setEditingAdminProfile] = useState(false);
  const [adminNameDraft, setAdminNameDraft] = useState(profile.displayName);
  const [adminTitleDraft, setAdminTitleDraft] = useState(adminMeta.adminTitle);
  const [adminOrgDraft, setAdminOrgDraft] = useState(adminMeta.organization);
  const [adminBioDraft, setAdminBioDraft] = useState(adminMeta.bio);
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);

  const bookFileInputRef = useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin =
    profile.role === 'admin' && profile.email.toLowerCase() === SINGLE_ADMIN_EMAIL;
  const customBooks = books.filter((b) => b.isCustom);
  const unreadCount = registrationAlerts.filter((a) => !a.read).length;

  const trackedList = useMemo<MonitoredUserSummary[]>(() => {
    if (monitoredUsers.length > 0) return monitoredUsers;
    return allUsers.map((u) => ({
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      source: u.isCloudSynced ? 'google' : 'device',
      xp: u.xp,
      streakDays: u.streakDays,
      studyMinutes: u.studyMinutes,
      participationScore: u.participationScore,
      completedTasks: 0,
      totalTasks: 0,
      sessionsCount: 0,
    }));
  }, [monitoredUsers, allUsers]);

  const filteredTrackedUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return trackedList.filter((u) => {
      if (userFilter === 'student' && u.role !== 'student') return false;
      if (userFilter === 'teacher' && u.role !== 'teacher') return false;
      if (userFilter === 'google' && u.source !== 'google') return false;
      if (userFilter === 'device' && u.source !== 'device') return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [trackedList, userFilter, userSearch]);

  const totalPlatformMinutes = useMemo(
    () => trackedList.reduce((acc, u) => acc + u.studyMinutes, 0),
    [trackedList]
  );

  function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  async function processSelectedBookFile(file: File) {
    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
    const isSupported =
      isPdf ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.htm') ||
      lowerName.endsWith('.json') ||
      file.type === 'text/plain';

    if (!isSupported) {
      setNotice(
        isSo
          ? 'Fadlan soo geli fayl PDF, TXT, Markdown, HTML, ama JSON ah.'
          : 'Please choose a PDF, TXT, Markdown, HTML, or JSON file.'
      );
      return;
    }

    setIsReadingBookFile(true);
    try {
      const parsed = await parseDeviceBookFile(file);
      setBookDeviceFileName(file.name);
      setBookFilePreview({
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        pageCount: parsed.pageCount,
        isPdf,
      });
      setBookSummary(parsed.summary);
      setChapterContent(parsed.chapterContent);
      setBookPdfUrl(parsed.pdfUrl);
      setBookPdfBytes(parsed.pdfBytes);
      setBookMinutes(parsed.estimatedMinutes);
    } catch (err) {
      setNotice(
        err instanceof Error
          ? err.message
          : isSo
          ? 'Faylka buugga lama akhrin karin.'
          : 'Unable to read selected book file.'
      );
    } finally {
      setIsReadingBookFile(false);
    }
  }

  async function handleChooseBookFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedBookFile(file);
  }

  function handleBookDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingBook) {
      setIsDraggingBook(true);
    }
  }

  function handleBookDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBook(false);
  }

  async function handleBookDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBook(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      if (bookFileInputRef.current && typeof DataTransfer !== 'undefined') {
        const dt = new DataTransfer();
        dt.items.add(file);
        bookFileInputRef.current.files = dt.files;
      }
    } catch {
      // ignore if browser disallows programmatic FileList assignment
    }
    await processSelectedBookFile(file);
  }

  function handleClearSelectedBookFile() {
    setBookDeviceFileName('');
    setBookFilePreview(null);
    setBookPdfUrl(undefined);
    setBookPdfBytes(undefined);
    if (bookFileInputRef.current) {
      bookFileInputRef.current.value = '';
    }
  }

  async function handleChooseCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await readDeviceCoverImage(file);
      setBookCoverImage(url);
    } catch (err) {
      setNotice(
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

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await onPublishAnnouncement({
      title: title.trim(),
      subject,
      dueDate: dueDate.trim(),
      body: body.trim(),
    });
    setTitle('');
    setDueDate('');
    setBody('');
    setNotice(isSo ? 'Ogeysiiska waa la daabacay.' : 'Announcement published to all learners.');
    setTimeout(() => setNotice(null), 3000);
  }

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookTitle.trim() || !bookAuthor.trim() || !bookSummary.trim() || (!chapterContent.trim() && !bookPdfUrl && !bookPdfBytes)) {
      return;
    }
    await onAddBook({
      title: bookTitle.trim(),
      author: bookAuthor.trim(),
      subject: bookSubject,
      edition: bookEdition.trim() || '1st Edition',
      readMinutes: Math.max(1, Math.min(1000, Number(bookMinutes) || 20)),
      summary: bookSummary.trim(),
      coverColor: bookCoverColor,
      coverImage: bookCoverImage,
      pdfUrl: bookPdfUrl,
      pdfBytes: bookPdfBytes,
      chapterTitle: chapterTitle.trim() || 'Chapter 1: Overview',
      chapterContent: chapterContent.trim() || bookSummary.trim(),
    });
    setBookTitle('');
    setBookAuthor('');
    setBookSummary('');
    setChapterContent('');
    setBookCoverImage(undefined);
    setBookPdfUrl(undefined);
    setBookPdfBytes(undefined);
    setBookDeviceFileName('');
    setBookFilePreview(null);
    if (bookFileInputRef.current) {
      bookFileInputRef.current.value = '';
    }
    setNotice(isSo ? 'Buugga waa lagu daray maktabadda.' : 'Health book published to the Health Books Library.');
    setTimeout(() => setNotice(null), 3000);
  }

  async function handleSaveInlineAdminProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdminProfile(true);
    try {
      if (adminNameDraft.trim() && adminNameDraft.trim() !== profile.displayName) {
        await onUpdateDisplayName(adminNameDraft.trim());
      }
      onUpdateAdminMeta({
        adminTitle: adminTitleDraft.trim() || 'Single System Administrator',
        organization: adminOrgDraft.trim() || 'Hilaac Health Center',
        bio: adminBioDraft.trim(),
      });
      setEditingAdminProfile(false);
      setNotice(isSo ? 'Profile-ka gaarka ah ee Admin waa la cusboonaysiiyay.' : 'Admin Owner Profile updated.');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setSavingAdminProfile(false);
    }
  }

  if (!isAdmin) {
    return (
      <SectionCard className="p-8 text-center max-w-xl mx-auto space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#F1F5F9] dark:bg-[#13203C] text-[#10234B] dark:text-slate-200 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="font-display text-lg font-extrabold text-[#10234B] dark:text-white">
          {isSo ? 'Hal Maamule Oo Keliya' : 'Single Administrator Only'}
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-400">
          {isSo
            ? 'Qaybta Maamulka (Admin Panel) waxaa loo xiray maamulka sare oo keliya.'
            : 'The Admin Panel is restricted to authorized platform administration only.'}
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeroHeader
        thumbSrc={thumbNotes}
        thumbAlt="Hilaac Administrator Panel"
        kicker={isSo ? 'Maamulaha Guud' : 'Platform Administration'}
        title={isSo ? 'Xarunta Maamulka Guud (Admin Panel)' : 'Administrator Panel'}
        subtitle={`${profile.displayName} · ${
          isSo
            ? 'La soco dhammaan isticmaalayaasha, diiwaangelinta cusub, buugaagta, iyo ogeysiisyada.'
            : 'Track all users, review live sign-ups, publish Health Books, and post notices.'
        }`}
        rightSlot={
          <div className="inline-flex items-center gap-2 rounded-[9px] border border-[#079B62]/35 bg-[#ECFDF5] dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-[#079B62] dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-[#079B62]" />
            <span>{isSo ? 'Hal Maamule Oo Keliya (1/1)' : 'Single Owner Active (1/1)'}</span>
          </div>
        }
      />

      {notice && (
        <div
          role="status"
          className="rounded-[10px] border border-[#079B62]/40 bg-[#ECFDF5] dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-bold text-[#079B62] dark:text-emerald-300"
        >
          {notice}
        </div>
      )}

      {/* Dedicated Single-Owner Admin Profile Card */}
      <SectionCard className="overflow-hidden border-[#10234B]/20 dark:border-[#1E2E4D]">
        <div className="bg-[#10234B] text-white px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-[12px] bg-[#079B62] border-2 border-[#F59E0B] text-white font-display text-lg font-extrabold flex items-center justify-center shrink-0">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F59E0B]/20 border border-[#F59E0B]/50 text-[10px] font-extrabold uppercase tracking-wider text-[#FDE68A]">
                  <ShieldCheck className="w-3 h-3 text-[#F59E0B]" />
                  {isSo ? 'Profile-ka Gaarka ah ee Admin' : 'Dedicated Admin Profile'}
                </span>
                <span className="text-[11px] font-semibold text-emerald-300">
                  · {adminMeta.organization}
                </span>
              </div>
              <h2 className="mt-1 font-display text-base sm:text-lg font-extrabold text-white truncate">
                {profile.displayName}
              </h2>
              <p className="text-xs text-slate-300 truncate">
                {adminMeta.adminTitle}
              </p>
              {adminMeta.bio && (
                <p className="mt-1 text-xs text-slate-200/90 line-clamp-2">{adminMeta.bio}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAdminNameDraft(profile.displayName);
              setAdminTitleDraft(adminMeta.adminTitle);
              setAdminOrgDraft(adminMeta.organization);
              setAdminBioDraft(adminMeta.bio);
              setEditingAdminProfile((v) => !v);
            }}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-white/25 bg-white/10 hover:bg-white/15 text-xs font-bold text-white shrink-0 self-start sm:self-center"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>
              {editingAdminProfile
                ? isSo
                  ? 'Xir Tafatirka'
                  : 'Close Editor'
                : isSo
                ? 'Wax Ka Beddel Profile-ka'
                : 'Edit Admin Profile'}
            </span>
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] dark:bg-[#0B1426] grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#E2E8F0] dark:border-[#1E2E4D]">
          <div>
            <div className="text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              {isSo ? 'Isticmaalayaasha La Socdo' : 'Users Tracked'}
            </div>
            <div className="font-mono text-lg font-extrabold text-[#10234B] dark:text-white tabular-nums">
              {trackedList.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              {isSo ? 'Diiwaangelin Cusub' : 'Unread Alerts'}
            </div>
            <div className="font-mono text-lg font-extrabold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
              {unreadCount}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              {isSo ? 'Wadarta Daqiiqadaha' : 'Platform Study Time'}
            </div>
            <div className="font-mono text-lg font-extrabold text-[#079B62] tabular-nums">
              {totalPlatformMinutes}m
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              {isSo ? 'Buugaag & Fariimo' : 'Books & Notices'}
            </div>
            <div className="font-mono text-lg font-extrabold text-[#10234B] dark:text-white tabular-nums">
              {books.length} · {announcements.length}
            </div>
          </div>
        </div>

        {editingAdminProfile && (
          <form
            onSubmit={handleSaveInlineAdminProfile}
            className="p-4 sm:p-5 border-t border-[#E2E8F0] dark:border-[#1E2E4D] space-y-3 bg-white dark:bg-[#0D172B]"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#10234B] dark:text-slate-200 mb-1">
                  {isSo ? 'Magaca Maamulaha' : 'Admin Display Name'}
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={adminNameDraft}
                  onChange={(e) => setAdminNameDraft(e.target.value)}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#10234B] dark:text-slate-200 mb-1">
                  {isSo ? 'Xilka Maamulka' : 'Admin Title'}
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={adminTitleDraft}
                  onChange={(e) => setAdminTitleDraft(e.target.value)}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#10234B] dark:text-slate-200 mb-1">
                  {isSo ? 'Xarunta' : 'Organization'}
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={adminOrgDraft}
                  onChange={(e) => setAdminOrgDraft(e.target.value)}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#10234B] dark:text-slate-200 mb-1">
                {isSo ? 'Qoraalka Profile-ka Admin' : 'Admin Bio & Oversight Scope'}
              </label>
              <textarea
                rows={2}
                maxLength={240}
                value={adminBioDraft}
                onChange={(e) => setAdminBioDraft(e.target.value)}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAdminProfile(false)}
                className="min-h-[36px] px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#475569] dark:text-slate-300"
              >
                {isSo ? 'Jooji' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={savingAdminProfile}
                className="min-h-[36px] px-4 py-1.5 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold disabled:opacity-50"
              >
                {savingAdminProfile
                  ? isSo
                    ? 'Kaydinaya...'
                    : 'Saving...'
                  : isSo
                  ? 'Kaydi Profile-ka'
                  : 'Save Admin Profile'}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* New User Registration Alerts Feed */}
      <SectionCard className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#F59E0B]" />
            <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
              {isSo ? 'Is-diiwaangelinta Cusub' : 'New User Registrations'} ({unreadCount}{' '}
              {isSo ? 'cusub' : 'unread'})
            </h2>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAlertsRead}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {isSo ? 'Dhammaan Waa La Arkay' : 'Mark All Read'}
            </button>
          )}
        </div>

        {registrationAlerts.length === 0 ? (
          <EmptyStateBox
            icon={<BellRing className="w-5 h-5" />}
            title={isSo ? 'Weli qof cusub isma diiwaangelin' : 'No registration alerts yet'}
            description={
              isSo
                ? 'Akoon kasta oo cusub oo la sameeyo halkan ayuu si toos ah uga soo muuqan doonaa.'
                : 'Every new student or teacher account created appears here immediately.'
            }
          />
        ) : (
          <div className="space-y-2">
            {registrationAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`py-2.5 px-3.5 rounded-[10px] border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  !alert.read
                    ? 'border-[#F59E0B]/45 bg-[#FFFBEB]/70 dark:bg-amber-950/20'
                    : 'border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#10234B] dark:text-white">
                    {!alert.read && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B45309] dark:text-[#F59E0B]">
                        {isSo ? 'CUSUB' : 'NEW'} ·
                      </span>
                    )}
                    <span>{alert.displayName}</span>
                    <span className="text-[#079B62] uppercase text-[10px] font-extrabold">
                      {alert.role}
                    </span>
                    <span className="text-[#475569] dark:text-slate-400 font-normal">
                      · {alert.source === 'google' ? 'Google Cloud' : isSo ? 'Akoonka Qalabka' : 'Device Account'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#475569] dark:text-slate-400 mt-0.5 truncate">
                    {alert.email} ·{' '}
                    {new Date(alert.createdAtMs).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {!alert.read && (
                  <button
                    type="button"
                    onClick={() => onMarkAlertRead(alert.id)}
                    className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#13203C] text-[11px] font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62] shrink-0 self-start sm:self-auto"
                  >
                    <Check className="w-3 h-3 text-[#079B62]" />
                    {isSo ? 'Waa La Arkay' : 'Mark Read'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Add Health Book + Post Notice */}
        <div className="lg:col-span-5 space-y-5">
          {/* Add Health Book Form */}
          <SectionCard className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BookPlus className="w-4 h-4 text-[#079B62]" />
              <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                {isSo ? 'Ku Dar Buug Cusub' : 'Add Health Book to Library'}
              </h2>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-3">
              {/* Choose from Device: Dedicated Drag-and-Drop Zone + File Input + Filename Preview */}
              <div className="space-y-2.5 rounded-[12px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C]/65 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#10234B] dark:text-slate-200">
                    {isSo ? 'Ka Dooro Qalabka' : 'Choose from Device'}
                  </span>
                  {bookFilePreview && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#079B62]">
                      <Check className="w-3.5 h-3.5" />
                      {isSo ? 'Faylka Waa Diyaar' : 'File Preview Ready'}
                    </span>
                  )}
                </div>

                <div
                  onDragEnter={handleBookDragOver}
                  onDragOver={handleBookDragOver}
                  onDragLeave={handleBookDragLeave}
                  onDrop={handleBookDrop}
                  onClick={() => bookFileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      bookFileInputRef.current?.click();
                    }
                  }}
                  aria-label={isSo ? 'Soo jiid ama dooro faylka PDF' : 'Drag and drop or choose a PDF book file'}
                  className={`cursor-pointer rounded-[10px] border-2 border-dashed px-3.5 py-4 text-center transition-colors ${
                    isDraggingBook
                      ? 'border-[#079B62] bg-[#ECFDF5] dark:bg-emerald-950/45 ring-2 ring-[#079B62]/25'
                      : 'border-[#079B62]/65 bg-white dark:bg-[#0D172B] hover:border-[#079B62] hover:bg-[#ECFDF5]/40 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <div className="pointer-events-none flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/50 text-[#079B62] flex items-center justify-center">
                      {isReadingBookFile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-xs font-extrabold text-[#10234B] dark:text-white">
                      {isReadingBookFile
                        ? isSo
                          ? 'Akhrinaya faylka PDF...'
                          : 'Reading selected file...'
                        : isDraggingBook
                        ? isSo
                          ? 'Halkan ku daadi faylka...'
                          : 'Drop your PDF file here...'
                        : isSo
                        ? 'Halkan ku soo jiid PDF ama guji si aad u doorato'
                        : 'Drag & drop your PDF here, or click to browse'}
                    </div>
                    <div className="text-[11px] text-[#475569] dark:text-slate-400">
                      {isSo
                        ? 'Faylasha la oggol yahay: .pdf, .txt, .md, .html'
                        : 'Supports .pdf, .txt, .md, .html'}
                    </div>
                  </div>
                </div>

                {/* Native File Input (shows selected filename) + Cover Image Trigger */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                  <label className="block min-w-0">
                    <span className="sr-only">
                      {isSo ? 'Dooro faylka PDF qalabka' : 'Choose PDF or book file from device'}
                    </span>
                    <input
                      ref={bookFileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.html,.htm,.json,application/pdf,text/plain"
                      onChange={handleChooseBookFile}
                      className="block w-full text-[11px] text-[#475569] dark:text-slate-300 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-[7px] file:border-0 file:text-[11px] file:font-bold file:bg-[#079B62] file:text-white hover:file:bg-[#058152] file:cursor-pointer cursor-pointer truncate"
                    />
                  </label>

                  <div>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleChooseCoverFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] text-[11px] font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62]"
                    >
                      <ImagePlus className="w-3.5 h-3.5 shrink-0 text-[#079B62]" />
                      <span className="truncate">
                        {bookCoverImage
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

                {/* Clear Selected File / PDF Filename Preview Before Final Submission */}
                {(bookFilePreview || bookDeviceFileName) && (
                  <div
                    role="region"
                    aria-label={isSo ? 'Horudhaca faylka la doortay' : 'Selected file preview'}
                    className="rounded-[9px] border border-[#079B62]/50 bg-white dark:bg-[#0D172B] px-3 py-2.5 flex items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-[7px] bg-[#10234B] dark:bg-[#13203C] text-white flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#F59E0B]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#079B62]">
                          {isSo ? 'Faylka La Doortay' : 'Selected File Preview'}
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#FFFBEB] dark:bg-amber-950/50 text-[#B45309] dark:text-[#F59E0B] border border-[#F59E0B]/40 shrink-0">
                            {bookFilePreview?.isPdf ? 'PDF' : 'FILE'}
                          </span>
                          <span
                            title={bookFilePreview?.name || bookDeviceFileName}
                            className="text-xs font-extrabold text-[#10234B] dark:text-white truncate"
                          >
                            {bookFilePreview?.name || bookDeviceFileName}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#475569] dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          {bookFilePreview?.sizeLabel && <span>{bookFilePreview.sizeLabel}</span>}
                          {bookFilePreview?.pageCount ? (
                            <span>
                              · {bookFilePreview.pageCount}{' '}
                              {isSo ? 'bog' : bookFilePreview.pageCount === 1 ? 'page' : 'pages'}
                            </span>
                          ) : null}
                          <span className="text-[#079B62] font-semibold">
                            · {isSo ? 'Guji Daabac Buugga si aad u dhammaystirto' : 'Review details & click Publish'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => bookFileInputRef.current?.click()}
                        title={isSo ? 'Beddel faylka' : 'Replace file'}
                        className="min-h-[30px] inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-[11px] font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62]"
                      >
                        <FileUp className="w-3 h-3" />
                        <span className="hidden sm:inline">{isSo ? 'Beddel' : 'Change'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelectedBookFile}
                        aria-label={isSo ? 'Ka saar faylka la doortay' : 'Remove selected file'}
                        className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-[6px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#10234B] dark:text-slate-200 mb-1">
                  {isSo ? 'Magaca Buugga (Gacanta ku qor)' : 'Book Name / Title (Manual Entry)'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder={
                    isSo
                      ? 'Gacanta ku qor magaca buugga (tusaale: Nelson Essentials of Pediatrics)'
                      : 'Enter book name manually (e.g., Nelson Essentials of Pediatrics)'
                  }
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
                />
              </div>
              <input
                type="text"
                required
                maxLength={120}
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder={isSo ? 'Qoraaga & Daabacaha' : 'Author(s) & Publisher'}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <select
                  value={bookSubject}
                  onChange={(e) => setBookSubject(e.target.value as AcademicSubject)}
                  aria-label={isSo ? 'Maadada buugga' : 'Book subject'}
                  className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-semibold text-[#10234B] dark:text-white"
                >
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Anatomy & Physiology">Anatomy &amp; Physiology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Clinical OPD">Clinical OPD</option>
                </select>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={bookEdition}
                  onChange={(e) => setBookEdition(e.target.value)}
                  placeholder={isSo ? 'Daabacaadda (tusaale: 9th Ed)' : 'Edition (e.g., 9th Ed)'}
                  className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] dark:text-slate-400 mb-1">
                    {isSo ? 'Daqiiqadaha Akhriska' : 'Est. Read Minutes'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={bookMinutes}
                    onChange={(e) => setBookMinutes(Number(e.target.value))}
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-1.5 text-xs font-mono text-[#10234B] dark:text-white"
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-[#475569] dark:text-slate-400 mb-1">
                    {isSo ? 'Midabka Jaldigga' : 'Cover Theme'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {COVER_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setBookCoverColor(c.id)}
                        title={c.label}
                        aria-label={c.label}
                        className={`w-6 h-6 rounded-md ${c.swatch} border-2 ${
                          bookCoverColor === c.id
                            ? 'border-[#F59E0B] scale-110'
                            : 'border-transparent opacity-80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <textarea
                rows={2}
                required
                maxLength={500}
                value={bookSummary}
                onChange={(e) => setBookSummary(e.target.value)}
                placeholder={isSo ? 'Faahfaahin kooban oo buugga ah...' : 'Short book description for preview cards...'}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />

              <input
                type="text"
                required
                maxLength={160}
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder={isSo ? 'Cinwaanka Cutubka 1' : 'Chapter 1 title'}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />

              <textarea
                rows={4}
                required
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
                placeholder={
                  isSo
                    ? 'Qoraalka Cutubka 1 (tuducyada ku kala saar sadar banaan)...'
                    : 'Chapter 1 paragraphs (separate paragraphs with a blank line)...'
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />

              <button
                type="submit"
                className="w-full min-h-[42px] py-2.5 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold transition-colors"
              >
                {isSo ? 'Daabac Buugga' : 'Publish Health Book'}
              </button>
            </form>

            {customBooks.length > 0 && (
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E4D] space-y-2">
                <div className="text-xs font-bold text-[#10234B] dark:text-slate-300">
                  {isSo ? 'Buugaagta La Kordhiyay' : 'Added Books'} ({customBooks.length})
                </div>
                {customBooks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 text-xs border-b border-[#E2E8F0]/70 dark:border-[#1E2E4D] pb-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#10234B] dark:text-white truncate">
                        {b.title}
                      </div>
                      <div className="text-[#475569] dark:text-slate-400 truncate">
                        {b.subject} · {b.edition}
                      </div>
                    </div>
                    {(isAdmin || b.authorUid === profile.uid) && (
                      <button
                        type="button"
                        onClick={() => onDeleteBook(b.id)}
                        aria-label={`${isSo ? 'Tirtir' : 'Delete'} ${b.title}`}
                        className="p-1 text-slate-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Publish Announcement / Assignment Deadline */}
          <SectionCard className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#F59E0B]" />
              <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                {isSo ? 'Dir Ogeysiis Cusub' : 'Post Teacher Notice or Deadline'}
              </h2>
            </div>

            <form onSubmit={handlePost} className="space-y-3">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isSo
                    ? 'Cinwaanka ogeysiiska (tusaale: Imtixaanka Farmashiyaha)'
                    : 'Notice title (e.g., Pharmacology Antidote Quiz Due)'
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as AcademicSubject | 'All')}
                  aria-label={isSo ? 'Maadada ogeysiiska' : 'Notice subject'}
                  className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-semibold text-[#10234B] dark:text-white"
                >
                  <option value="All">{isSo ? 'Dhammaan Maadooyinka' : 'All Subjects'}</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Anatomy & Physiology">Anatomy &amp; Physiology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Clinical OPD">Clinical OPD</option>
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  aria-label={isSo ? 'Taariikhda kama dambaysta ah' : 'Assignment due date'}
                  className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-mono text-[#10234B] dark:text-white"
                />
              </div>
              <textarea
                rows={3}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  isSo
                    ? 'Faahfaahinta shaqada, akhriska, ama xasuusinta imtixaanka...'
                    : 'Reading assignment details, quiz expectations, or clinical reminders...'
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[40px] py-2.5 rounded-[9px] bg-[#10234B] dark:bg-[#079B62] text-white text-xs font-bold hover:opacity-95"
              >
                {isSo ? 'Daabac Ogeysiiska' : 'Publish Notice'}
              </button>
            </form>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E4D] space-y-2.5">
              <div className="text-xs font-bold text-[#10234B] dark:text-slate-300">
                {isSo ? 'Ogeysiisyadii Ugu Dambeeyay' : 'Recent Notices'} ({announcements.length})
              </div>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="text-xs border-b border-[#E2E8F0]/70 dark:border-[#1E2E4D] pb-2 last:border-b-0"
                >
                  <div className="font-bold text-[#10234B] dark:text-white">{a.title}</div>
                  <div className="text-[#475569] dark:text-slate-400">
                    {a.subject} {a.dueDate ? `· ${isSo ? 'Waqtiga' : 'Due'} ${a.dueDate}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Participation Summary & User Role Administration */}
        <section className="lg:col-span-7 space-y-5">
          <SectionCard className="p-4 sm:p-5">
            <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
              {isSo ? 'Xogta Guud ee Madasha' : 'Active Workspace Metrics'}
            </h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-[#475569] dark:text-slate-400">
                  {isSo ? 'Buugaagta' : 'Library Books'}
                </div>
                <div className="font-mono text-xl font-extrabold text-[#10234B] dark:text-white tabular-nums">
                  {books.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#475569] dark:text-slate-400">
                  {isSo ? 'Hawlaha' : 'Tracked Tasks'}
                </div>
                <div className="font-mono text-xl font-extrabold text-[#10234B] dark:text-white tabular-nums">
                  {tasks.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#475569] dark:text-slate-400">
                  {isSo ? 'Kulamada Waxbarasho' : 'Study Sessions'}
                </div>
                <div className="font-mono text-xl font-extrabold text-[#079B62] tabular-nums">
                  {studyLogs.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#475569] dark:text-slate-400">
                  {isSo ? 'Dhibcaha Ka-qaybgalka' : 'Participation XP'}
                </div>
                <div className="font-mono text-xl font-extrabold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
                  {profile.participationScore}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#079B62]" />
                <div>
                  <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                    {isSo ? 'La Socodka Isticmaalayaasha' : 'User Activity & Account Tracking'} (
                    {trackedList.length})
                  </h2>
                  <p className="text-[11px] text-[#475569] dark:text-slate-400">
                    {isSo
                      ? 'La soco ardayda iyo macallimiinta (Google Cloud & Qalabka), XP-ga, waqtiga akhriska, iyo hawlaha.'
                      : 'Monitor all Cloud & Device registered learners, study minutes, tasks completed, and roles.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Search + Role/Source Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={isSo ? 'Raadi magac ama iimayl...' : 'Search user name or email...'}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-8 pr-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: isSo ? 'Dhammaan' : 'All' },
                    { id: 'student', label: isSo ? 'Arday' : 'Students' },
                    { id: 'teacher', label: isSo ? 'Macallin' : 'Teachers' },
                    { id: 'google', label: 'Cloud' },
                    { id: 'device', label: isSo ? 'Qalabka' : 'Device' },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setUserFilter(pill.id)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-[7px] text-[11px] font-bold whitespace-nowrap shrink-0 transition-colors ${
                      userFilter === pill.id
                        ? 'bg-[#10234B] dark:bg-[#079B62] text-white'
                        : 'bg-[#F1F5F9] dark:bg-[#13203C] text-[#475569] dark:text-slate-300'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTrackedUsers.length === 0 ? (
              <EmptyStateBox
                icon={<Users className="w-5 h-5" />}
                title={
                  trackedList.length === 0
                    ? isSo
                      ? 'Weli isticmaale ma soo gelin'
                      : 'No registered users tracked yet'
                    : isSo
                    ? 'Qof lagama helin raadinta'
                    : 'No users match this filter'
                }
                description={
                  isSo
                    ? 'Isticmaale kasta oo is diiwaangeliya (Google ama Qalabka) halkan ayuu ka soo muuqan doonaa.'
                    : 'Every registered user across Google Cloud and Device accounts appears here automatically.'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[540px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] dark:border-[#1E2E4D] text-[#475569] dark:text-slate-400">
                      <th className="py-2 pr-3 font-bold">{isSo ? 'Isticmaalaha' : 'User'}</th>
                      <th className="py-2 pr-3 font-bold">{isSo ? 'Nooca' : 'Source'}</th>
                      <th className="py-2 pr-3 font-bold">XP / {isSo ? 'Waqti' : 'Study'}</th>
                      <th className="py-2 pr-3 font-bold">{isSo ? 'Hawlo' : 'Tasks'}</th>
                      <th className="py-2 font-bold">{isSo ? 'Doorka' : 'Role'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/70 dark:divide-[#1E2E4D]">
                    {filteredTrackedUsers.map((u) => {
                      const isSingleOwnerRow =
                        u.email.toLowerCase() === SINGLE_ADMIN_EMAIL || u.role === 'admin';
                      return (
                        <tr key={u.uid}>
                          <td className="py-2.5 pr-3">
                            <div className="font-bold text-[#10234B] dark:text-white">
                              {u.displayName}
                            </div>
                            <div className="text-[11px] text-[#475569] dark:text-slate-400 truncate max-w-[190px]">
                              {u.email}
                            </div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                u.source === 'google'
                                  ? 'bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#079B62]'
                                  : 'bg-[#F1F5F9] dark:bg-[#13203C] text-[#10234B] dark:text-slate-300'
                              }`}
                            >
                              {u.source === 'google' ? 'Google Cloud' : isSo ? 'Qalabka' : 'Device'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 font-mono tabular-nums">
                            <span className="font-bold text-[#B45309] dark:text-[#F59E0B]">
                              {u.xp} XP
                            </span>
                            <span className="text-[#475569] dark:text-slate-400">
                              {' '}
                              · {u.studyMinutes}m · {u.streakDays}d
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 font-mono tabular-nums text-[#10234B] dark:text-slate-200">
                            {u.completedTasks}/{u.totalTasks}
                          </td>
                          <td className="py-2.5">
                            {isSingleOwnerRow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[7px] bg-[#10234B] text-[#FDE68A] text-[10px] font-extrabold">
                                <ShieldCheck className="w-3 h-3 text-[#F59E0B]" />
                                {isSo ? 'Maamule (1/1)' : 'Single Owner'}
                              </span>
                            ) : (
                              <select
                                value={u.role === 'teacher' ? 'teacher' : 'student'}
                                onChange={(e) => onUpdateUserRole(u.uid, e.target.value as UserRole)}
                                aria-label={`${isSo ? 'Doorka' : 'Role for'} ${u.displayName}`}
                                className="rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-2 py-1 text-xs font-semibold text-[#10234B] dark:text-white"
                              >
                                <option value="student">{isSo ? 'Arday' : 'Student'}</option>
                                <option value="teacher">{isSo ? 'Macallin' : 'Teacher'}</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </section>
      </div>
    </div>
  );
};
