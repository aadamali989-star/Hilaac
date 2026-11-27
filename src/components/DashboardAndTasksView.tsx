import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { academicModulesData } from '../data/academicData';
import { PWAInstallButton } from './PWAInstallButton';
import type {
  AcademicSubject,
  Announcement,
  AppLanguage,
  AppNavTab,
  FlashcardItem,
  HealthBook,
  StudyLog,
  TaskItem,
  TaskSubject,
  UserProfile,
} from '../types';
import { SubjectEmblemSvg } from './ClinicalSvgs';
import { EmptyStateBox, SectionCard } from './UiPrimitives';
import welcomeHeroImg from '../assets/images/welcome_health_hero_1795714670970.jpg';
import thumbPharm from '../assets/images/thumb_pharmacology_kit_1795767006640.jpg';
import thumbBooks from '../assets/images/thumb_medical_books_1795767006210.jpg';
import thumbNotes from '../assets/images/thumb_ai_notes_1795767030204.jpg';
import thumbStudy from '../assets/images/thumb_clinical_study_1795767004787.jpg';

interface DashboardAndTasksViewProps {
  profile: UserProfile;
  books: HealthBook[];
  tasks: TaskItem[];
  studyLogs: StudyLog[];
  flashcards: FlashcardItem[];
  announcements: Announcement[];
  isOnline: boolean;
  language: AppLanguage;
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotifications: () => Promise<void>;
  onSendTestNotification: () => void;
  onAddTask: (task: {
    title: string;
    subject: TaskSubject;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    notifyEnabled: boolean;
    notes: string;
  }) => Promise<void>;
  onToggleTask: (task: TaskItem) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleDownloadBook: (bookId: string) => Promise<void>;
  onOpenModule: (subject: AcademicSubject) => void;
  onNavigateTab: (tab: AppNavTab) => void;
}

const TASK_SUBJECTS: TaskSubject[] = [
  'Personal',
  'Pharmacology',
  'Anatomy & Physiology',
  'Microbiology',
  'Biochemistry',
  'Clinical OPD',
];

const ACADEMIC_SUBJECTS: AcademicSubject[] = [
  'Pharmacology',
  'Anatomy & Physiology',
  'Microbiology',
  'Biochemistry',
  'Clinical OPD',
];

function getTimeGreeting(language: AppLanguage): string {
  const hr = new Date().getHours();
  if (language === 'so') {
    if (hr < 12) return 'Subax wanaagsan';
    if (hr < 17) return 'Galab wanaagsan';
    return 'Fiid wanaagsan';
  }
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

function getSubjectLabel(subject: TaskSubject, isSo: boolean): string {
  if (!isSo) return subject;
  switch (subject) {
    case 'Personal':
      return 'Gaar ah';
    case 'Pharmacology':
      return 'Farmashiye';
    case 'Anatomy & Physiology':
      return 'Anatomy & Physiology';
    case 'Microbiology':
      return 'Microbiology';
    case 'Biochemistry':
      return 'Biochemistry';
    case 'Clinical OPD':
      return 'Clinical OPD';
  }
}

export const DashboardAndTasksView: React.FC<DashboardAndTasksViewProps> = ({
  profile,
  books,
  tasks,
  studyLogs,
  flashcards,
  announcements,
  isOnline,
  language,
  notificationPermission,
  onRequestNotifications,
  onSendTestNotification,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onToggleDownloadBook,
  onOpenModule,
  onNavigateTab,
}) => {
  const isSo = language === 'so';

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<TaskSubject>('Personal');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'due_soon'>('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [hideStarterGuide, setHideStarterGuide] = useState(false);

  const [utilityTab, setUtilityTab] = useState<'alerts' | 'apps'>('alerts');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const nowMs = Date.now();

  const taskCounts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let dueSoon = 0;
    tasks.forEach((t) => {
      if (t.completed) {
        completed += 1;
      } else {
        pending += 1;
        if (t.dueDate && new Date(t.dueDate).getTime() - nowMs <= 48 * 60 * 60 * 1000) {
          dueSoon += 1;
        }
      }
    });
    return { all: tasks.length, pending, completed, dueSoon };
  }, [tasks, nowMs]);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return tasks.filter((t) => {
      if (taskFilter === 'pending' && t.completed) return false;
      if (taskFilter === 'completed' && !t.completed) return false;
      if (taskFilter === 'due_soon') {
        if (t.completed || !t.dueDate) return false;
        const diff = new Date(t.dueDate).getTime() - nowMs;
        if (diff > 48 * 60 * 60 * 1000) return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q)
      );
    });
  }, [tasks, taskFilter, taskSearch, nowMs]);

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && t.dueDate)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4);
  }, [tasks]);

  const subjectAnalytics = useMemo(() => {
    return ACADEMIC_SUBJECTS.map((subj) => {
      const logs = studyLogs.filter((l) => l.subject === subj);
      const minutes = logs.reduce((acc, l) => acc + l.minutesSpent, 0);
      const quizLogs = logs.filter((l) => l.quizScore > 0);
      const avgQuiz =
        quizLogs.length > 0
          ? Math.round(quizLogs.reduce((acc, l) => acc + l.quizScore, 0) / quizLogs.length)
          : 0;
      const spec = academicModulesData.find((m) => m.id === subj);
      const target = spec ? spec.targetMinutes : 45;
      const progressPct = Math.min(100, Math.round((minutes / target) * 100));
      const soSubtitleMap: Record<AcademicSubject, string> = {
        Pharmacology: 'Daawooyinka, MOA & badbaadada',
        'Anatomy & Physiology': 'Hab-dhisyada jidhka & wadnaha',
        Microbiology: 'Jeermiska & antibiotics-ka',
        Biochemistry: 'Tamarta unugga & enzymes',
        'Clinical OPD': 'Habraacyada & 100 OPD',
      };
      return {
        subject: subj,
        subtitle: isSo ? soSubtitleMap[subj] : spec?.subtitle ?? '',
        minutes,
        target,
        progressPct,
        avgQuiz,
        sessions: logs.length,
      };
    });
  }, [studyLogs, isSo]);

  const lastStudiedModule = useMemo(() => {
    if (studyLogs.length === 0) return null;
    const sorted = [...studyLogs].sort((a, b) => b.createdAtMs - a.createdAtMs);
    return sorted[0];
  }, [studyLogs]);

  const recentActivities = useMemo(() => {
    const items: {
      id: string;
      title: string;
      meta: string;
      timeMs: number;
      accent: 'green' | 'amber';
    }[] = [];

    studyLogs.forEach((log) => {
      const detail =
        log.participationType === 'quiz'
          ? isSo
            ? `Imtixaan · ${log.quizScore}%`
            : `Quiz · ${log.quizScore}%`
          : log.participationType === 'case_study'
          ? isSo
            ? `Kiis Caafimaad · ${log.quizScore}%`
            : `Case Study · ${log.quizScore}%`
          : `${log.minutesSpent}m`;
      items.push({
        id: `log-${log.id}`,
        title: log.moduleTitle,
        meta: `${log.subject} · ${detail}`,
        timeMs: log.createdAtMs,
        accent: log.quizScore > 0 ? 'amber' : 'green',
      });
    });

    tasks
      .filter((t) => t.completed)
      .slice(0, 4)
      .forEach((t) => {
        items.push({
          id: `task-${t.id}`,
          title: t.title,
          meta: `${getSubjectLabel(t.subject, isSo)} · ${isSo ? 'Hawl La Dhammeeyay' : 'Task Completed'}`,
          timeMs: t.createdAtMs,
          accent: 'green',
        });
      });

    return items.sort((a, b) => b.timeMs - a.timeMs).slice(0, 5);
  }, [studyLogs, tasks, isSo]);

  const dueFlashcardsCount = useMemo(() => {
    const nowIso = new Date().toISOString();
    return flashcards.filter((c) => c.nextReviewAt <= nowIso).length;
  }, [flashcards]);

  const completedTasksCount = taskCounts.completed;
  const taskCompletionPct = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  const totalMinutes = studyLogs.reduce((sum, l) => sum + l.minutesSpent, 0);
  const greeting = getTimeGreeting(language);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onAddTask({
      title: title.trim(),
      subject,
      priority,
      dueDate,
      notifyEnabled,
      notes: notes.trim(),
    });
    setTitle('');
    setNotes('');
    setStatusMessage(isSo ? 'Hawsha waa la kaydiyay.' : 'Task saved to your workspace.');
    setTimeout(() => setStatusMessage(null), 2500);
  }

  const quickShortcuts: {
    label: string;
    desc: string;
    meta: string;
    tab: AppNavTab;
    thumb: string;
  }[] = [
    {
      label: isSo ? 'Maadooyinka' : 'Medical Subjects',
      desc: isSo ? 'Daawooyin, A&P, Micro, Biochem & OPD' : 'Pharmacology, A&P, Micro, Biochem & OPD',
      meta: isSo ? '5 maado' : '5 modules',
      tab: 'modules',
      thumb: thumbPharm,
    },
    {
      label: isSo ? 'Buugaagta Caafimaadka' : 'Health Books',
      desc: isSo ? 'Akhris Cad, Sepia & Madow + PDF' : 'White, Sepia & Dark reader + device PDF',
      meta: `${books.length} ${isSo ? 'buug' : 'books'}`,
      tab: 'reader',
      thumb: thumbBooks,
    },
    {
      label: isSo ? 'Kaararka Xusuusta' : 'Flashcards',
      desc: isSo ? 'Ku celceli kaararka maalinlaha ah' : 'Spaced repetition active recall deck',
      meta: `${dueFlashcardsCount} ${isSo ? 'sugaya' : 'due'}`,
      tab: 'flashcards',
      thumb: thumbNotes,
    },
    {
      label: isSo ? 'Macallinka AI' : 'AI Study Tutor',
      desc: isSo ? 'Sharaxaad Soomaali & Ingiriisi ah' : 'Clear study help & peer study groups',
      meta: isSo ? 'Waydii AI' : 'Ask AI',
      tab: 'community',
      thumb: thumbStudy,
    },
  ];

  const showStarterChecklist = !hideStarterGuide && (studyLogs.length === 0 || completedTasksCount === 0);

  return (
    <div className="space-y-5">
      {/* Personal Home Hero & KPI Overview */}
      <SectionCard className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={welcomeHeroImg}
              alt="Hilaac Healthcare Learning Platform"
              className="w-14 h-14 sm:w-20 sm:h-16 rounded-[12px] object-cover border border-[#E2E8F0] dark:border-[#1E2E4D] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#079B62] truncate">
                {isSo ? 'Bogga Ardayga' : 'Student Dashboard'}
                <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                {isOnline ? (isSo ? 'Khadka Waa Diyaar' : 'Online') : 'Offline'}
                <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-[#475569] dark:text-slate-400 font-semibold">
                  Learn Healthcare. Build Knowledge. Save Lives.
                </span>
              </p>
              <h1 className="mt-0.5 font-display text-xl sm:text-[24px] font-extrabold tracking-tight text-[#10234B] dark:text-white truncate">
                {greeting}, {profile.displayName}
              </h1>
              <p className="mt-0.5 text-xs text-[#475569] dark:text-slate-400">
                {isSo
                  ? 'Hawlahaaga maalinlaha ah, waqtiga waxbarashada, buugaagta, iyo horumarkaaga.'
                  : 'Track daily tasks, clinical subjects, health books, and learning progress.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 sm:divide-x sm:divide-[#E2E8F0] dark:sm:divide-[#1E2E4D]">
            <div className="sm:pl-4 first:pl-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                {isSo ? 'Hawlo Dhammaystiran' : 'Tasks Done'}
              </div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-[#10234B] dark:text-white tabular-nums">
                {completedTasksCount}/{tasks.length}
              </div>
            </div>
            <div className="sm:pl-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                {isSo ? 'Waqtiga Waxbarashada' : 'Study Time'}
              </div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-[#079B62] tabular-nums">
                {totalMinutes}m
              </div>
            </div>
            <div className="sm:pl-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                {isSo ? 'Kaarar Sugaya' : 'Due Cards'}
              </div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
                {dueFlashcardsCount}
              </div>
            </div>
            <div className="sm:pl-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-400">
                {isSo ? 'Dhibcaha XP' : 'XP Score'}
              </div>
              <div className="mt-0.5 font-mono text-xl font-extrabold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
                {profile.xp}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Task Progress + Continue Studying Shortcut */}
        <div className="pt-3.5 border-t border-[#E2E8F0]/80 dark:border-[#1E2E4D] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#10234B] dark:text-slate-200">
                {isSo ? 'Horumarka Maanta' : 'Learning & Task Progress'}
              </span>
              <span className="font-mono font-bold text-[#079B62] tabular-nums">
                {taskCompletionPct}% ({completedTasksCount}/{tasks.length})
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#E2E8F0] dark:bg-[#13203C] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#079B62] transition-all duration-300"
                style={{ width: `${taskCompletionPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                lastStudiedModule
                  ? onOpenModule(lastStudiedModule.subject)
                  : onOpenModule('Pharmacology')
              }
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62] whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#079B62]" />
              {lastStudiedModule
                ? `${isSo ? 'Sii Wad' : 'Continue'}: ${lastStudiedModule.subject.split(' ')[0]}`
                : isSo
                ? 'Sii Wad Waxbarashada'
                : 'Continue Studying'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('reader')}
              className="min-h-[38px] px-3 py-1.5 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62] whitespace-nowrap"
            >
              {isSo ? 'Buugaagta' : 'Health Books'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('community')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold whitespace-nowrap transition-colors"
            >
              {isSo ? 'Waydii AI' : 'Ask AI Tutor'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Simple 3-Step Starter Strip */}
      {showStarterChecklist && (
        <section className="rounded-[14px] border border-[#079B62]/30 bg-[#ECFDF5]/60 dark:bg-[#0D172B] px-4 sm:px-5 py-3.5">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <h2 className="font-display text-sm font-extrabold text-[#10234B] dark:text-white">
                {isSo ? '3 Tallaabo oo Degdeg ah' : '3 Quick Steps to Start'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setHideStarterGuide(true)}
              className="text-xs font-semibold text-[#475569] dark:text-slate-400 hover:text-[#10234B] dark:hover:text-white"
            >
              {isSo ? 'Qari' : 'Dismiss'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#13203C] px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#10234B] dark:text-white flex items-center gap-1.5 min-w-0">
                {completedTasksCount > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#079B62] shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                )}
                <span className="truncate">
                  {isSo ? '1. Dhammee hawsha koowaad' : '1. Check off your first task'}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-[#079B62] shrink-0">
                {completedTasksCount > 0 ? (isSo ? 'Dhammaaday' : 'Done') : isSo ? 'Tallaabo 1' : 'Step 1'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('reader')}
              className="text-left rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#13203C] px-3.5 py-2.5 flex items-center justify-between gap-2 hover:border-[#079B62] transition-colors"
            >
              <div className="text-xs font-bold text-[#10234B] dark:text-white flex items-center gap-1.5 min-w-0">
                {totalMinutes > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-[#079B62] shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                )}
                <span className="truncate">
                  {isSo ? '2. Akhri buug (Cad / Sepia / Madow)' : '2. Read in White, Sepia or Dark'}
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#079B62] shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('community')}
              className="text-left rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#13203C] px-3.5 py-2.5 flex items-center justify-between gap-2 hover:border-[#079B62] transition-colors"
            >
              <div className="text-xs font-bold text-[#10234B] dark:text-white flex items-center gap-1.5 min-w-0">
                <Circle className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span className="truncate">
                  {isSo ? '3. Waydii Macallinka AI' : '3. Ask the AI Study Tutor'}
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#079B62] shrink-0" />
            </button>
          </div>
        </section>
      )}

      {/* Quick-Start Workspace Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickShortcuts.map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => onNavigateTab(item.tab)}
            className="group text-left rounded-[14px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] p-3.5 shadow-[0_1px_3px_rgba(16,35,75,0.04)] hover:border-[#079B62] transition-colors flex items-center gap-3 min-h-[74px]"
          >
            <img
              src={item.thumb}
              alt={item.label}
              className="w-12 h-12 rounded-[10px] object-cover border border-[#E2E8F0] dark:border-[#1E2E4D] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-sm font-extrabold text-[#10234B] dark:text-white truncate">
                  {item.label}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#079B62] shrink-0 transition-colors" />
              </div>
              <div className="text-[11px] text-[#475569] dark:text-slate-400 truncate mt-0.5">
                {item.desc}
              </div>
              <div className="mt-1 inline-block font-mono text-[11px] font-bold text-[#079B62] tabular-nums">
                {item.meta}
              </div>
            </div>
          </button>
        ))}
      </section>

      {statusMessage && (
        <div
          role="status"
          className="rounded-[10px] border border-[#079B62]/40 bg-[#ECFDF5] dark:bg-emerald-950/40 px-4 py-2.5 text-sm font-bold text-[#079B62] dark:text-emerald-300"
        >
          {statusMessage}
        </div>
      )}

      {/* Main 2-Column Workspace: Personal Tasks + Recent Activities (Left) | Alerts, Deadlines & Offline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-5">
          {/* Personal Task Tracker */}
          <SectionCard className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-extrabold text-[#10234B] dark:text-white">
                  {isSo ? 'Hawlahaaga Maalinlaha ah' : 'Daily Study Tasks'}
                </h2>
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  {isSo
                    ? 'Qorshee akhriskaaga, xasuusinta, iyo shaqooyinka caafimaad.'
                    : 'Plan daily reading chapters, shifts, and assignments.'}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-[#F1F5F9] dark:bg-[#13203C] rounded-[9px] overflow-x-auto no-scrollbar max-w-full">
                {(
                  [
                    { id: 'all', label: `${isSo ? 'Dhammaan' : 'All'} (${taskCounts.all})` },
                    { id: 'pending', label: `${isSo ? 'Dhiman' : 'To Do'} (${taskCounts.pending})` },
                    { id: 'due_soon', label: `${isSo ? 'Dhow' : 'Due'} (${taskCounts.dueSoon})` },
                    { id: 'completed', label: `${isSo ? 'Dhammaaday' : 'Done'} (${taskCounts.completed})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTaskFilter(tab.id)}
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-[7px] transition-colors whitespace-nowrap tabular-nums shrink-0 ${
                      taskFilter === tab.id
                        ? 'bg-[#10234B] dark:bg-[#079B62] text-white'
                        : 'text-[#475569] dark:text-slate-400 hover:text-[#10234B] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Task Form */}
            <form onSubmit={handleCreateTask} className="space-y-3 pb-4 border-b border-[#E2E8F0] dark:border-[#1E2E4D]">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isSo ? 'Maxaad qabanaysaa maanta?' : 'What do you need to accomplish today?'}
                  className="flex-1 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3.5 py-2.5 text-sm text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
                />
                <button
                  type="submit"
                  className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  {isSo ? 'Ku Dar' : 'Add Task'}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as TaskSubject)}
                    aria-label={isSo ? 'Maadada hawsha' : 'Task Subject'}
                    className="rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-2.5 py-1.5 text-xs font-bold text-[#10234B] dark:text-white"
                  >
                    {TASK_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {getSubjectLabel(s, isSo)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                    aria-label={isSo ? 'Muhiimadda hawsha' : 'Task Priority'}
                    className="rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-2.5 py-1.5 text-xs font-bold text-[#10234B] dark:text-white"
                  >
                    <option value="high">{isSo ? 'Muhiimad Sare' : 'High Priority'}</option>
                    <option value="medium">{isSo ? 'Muhiimad Dhexe' : 'Normal Priority'}</option>
                    <option value="low">{isSo ? 'Muhiimad Hoose' : 'Low Priority'}</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTaskOptions(!showTaskOptions)}
                  className="text-xs font-bold text-[#10234B] dark:text-[#079B62] hover:underline"
                >
                  {showTaskOptions
                    ? isSo
                      ? 'Qari waqtiga & faahfaahinta'
                      : 'Hide due date & note'
                    : isSo
                    ? 'Ku dar waqti & faahfaahin'
                    : 'Add due date & note'}
                </button>
              </div>

              {showTaskOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    aria-label={isSo ? 'Taariikhda kama dambaysta ah' : 'Due Date and Time'}
                    className="rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-1.5 text-xs font-mono text-[#10234B] dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={isSo ? 'Faahfaahin kooban (ikhtiyaari)' : 'Short note (optional)'}
                      className="flex-1 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-1.5 text-xs text-[#10234B] dark:text-white"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] dark:text-slate-300 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={notifyEnabled}
                        onChange={(e) => setNotifyEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-[#079B62] focus:ring-[#079B62]"
                      />
                      {isSo ? 'Xasuusin' : 'Alert'}
                    </label>
                  </div>
                </div>
              )}
            </form>

            {/* Search tasks */}
            {tasks.length > 0 && (
              <div className="pt-3 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-[22px]" />
                <input
                  type="search"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder={isSo ? 'Raadi hawlahaaga...' : 'Search tasks by title, subject, or note...'}
                  aria-label={isSo ? 'Raadi hawlaha' : 'Search personal tasks'}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-8 pr-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>
            )}

            {/* Task List */}
            <div className="mt-3 divide-y divide-[#E2E8F0]/70 dark:divide-[#1E2E4D]">
              {filteredTasks.length === 0 ? (
                <EmptyStateBox
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  title={
                    tasks.length === 0
                      ? isSo
                        ? 'Weli wax hawl ah kuma jirto'
                        : 'Your task list is empty'
                      : isSo
                      ? 'Wax hawl ah lagama helin'
                      : 'No tasks match this filter'
                  }
                  description={
                    tasks.length === 0
                      ? isSo
                        ? 'Ku dar hawshaada ugu horreysa xagga sare si aad ula socoto.'
                        : 'Add your first study goal or reminder above.'
                      : isSo
                      ? 'Nadiifi raadinta ama dooro Dhammaan si aad u aragto hawlaha.'
                      : 'Clear the search box or switch tabs to see all tasks.'
                  }
                  actionLabel={
                    taskFilter !== 'all' || taskSearch.trim()
                      ? isSo
                        ? 'Muuji Dhammaan'
                        : 'Show All Tasks'
                      : undefined
                  }
                  onAction={
                    taskFilter !== 'all' || taskSearch.trim()
                      ? () => {
                          setTaskFilter('all');
                          setTaskSearch('');
                        }
                      : undefined
                  }
                />
              ) : (
                filteredTasks.map((task) => {
                  const isOverdue =
                    !task.completed && task.dueDate && new Date(task.dueDate).getTime() < nowMs;
                  return (
                    <div
                      key={task.id}
                      className="py-3 px-2 -mx-2 rounded-[9px] hover:bg-[#F8FAFC] dark:hover:bg-[#13203C]/60 transition-colors flex items-start justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        aria-label={`${isSo ? 'Calaamadee' : 'Toggle'} ${task.title}`}
                        className="mt-0.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-[#079B62] transition-colors shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-[#079B62]" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-bold ${
                            task.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-[#10234B] dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#475569] dark:text-slate-400">
                          <span>{getSubjectLabel(task.subject, isSo)}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'high'
                                ? 'text-[#B91C1C] dark:text-red-400 font-bold'
                                : task.priority === 'medium'
                                ? 'text-[#B45309] dark:text-[#F59E0B] font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {task.priority === 'high'
                              ? isSo
                                ? 'Sare'
                                : 'High'
                              : task.priority === 'medium'
                              ? isSo
                                ? 'Dhexe'
                                : 'Normal'
                              : isSo
                              ? 'Hoose'
                              : 'Low'}
                          </span>
                          {task.dueDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`font-mono tabular-nums ${
                                  isOverdue ? 'text-[#B91C1C] dark:text-red-400 font-bold' : ''
                                }`}
                              >
                                {isOverdue
                                  ? isSo
                                    ? 'Dhacday '
                                    : 'Overdue '
                                  : isSo
                                  ? 'Waqtiga '
                                  : 'Due '}
                                {new Date(task.dueDate).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </>
                          )}
                        </div>
                        {task.notes && (
                          <p className="mt-1 text-xs text-[#475569] dark:text-slate-400">
                            {task.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`${isSo ? 'Tirtir' : 'Delete'} ${task.title}`}
                        className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-[#B91C1C] dark:hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          {/* Recent Study Activities */}
          <SectionCard className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#079B62]" />
                <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                  {isSo ? 'Dhaqdhaqaaqii Ugu Dambeeyay' : 'Recent Learning Activity'}
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-[#475569] dark:text-slate-400 tabular-nums">
                {recentActivities.length}
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-[#475569] dark:text-slate-400 py-2">
                {isSo
                  ? 'Marka aad buug akhrido ama imtixaan dhammayso, dhaqdhaqaaqaagu halkan ayuu ka muuqanayaa.'
                  : 'Complete a task, quiz, or reading timer session to see your recent study log here.'}
              </p>
            ) : (
              <div className="divide-y divide-[#E2E8F0]/70 dark:divide-[#1E2E4D]">
                {recentActivities.map((act) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-[#10234B] dark:text-slate-100 truncate">
                        {act.title}
                      </div>
                      <div className="text-[11px] text-[#475569] dark:text-slate-400 truncate">
                        {act.meta}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-bold tabular-nums shrink-0 ${
                        act.accent === 'amber'
                          ? 'text-[#B45309] dark:text-[#F59E0B]'
                          : 'text-[#079B62]'
                      }`}
                    >
                      {new Date(act.timeMs).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Clean Tabbed Utility Panel (Right Column — Deadlines, Notices & Offline Apps) */}
        <aside className="lg:col-span-5 rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)]">
          <div className="bg-[#10234B] p-2 flex items-center gap-1.5">
            {(
              [
                { id: 'alerts', label: isSo ? 'Ogeysiisyada & Waqtiga' : 'Deadlines & Notices' },
                { id: 'apps', label: isSo ? 'Buugaagta Offline' : 'Offline & App' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setUtilityTab(t.id)}
                className={`flex-1 min-h-[36px] py-1.5 px-2.5 rounded-[8px] text-xs font-bold whitespace-nowrap transition-colors ${
                  utilityTab === t.id
                    ? 'bg-[#079B62] text-white'
                    : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {utilityTab === 'alerts' && (
              <>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#F59E0B]" />
                      <h3 className="font-display text-sm font-extrabold text-[#10234B] dark:text-white">
                        {isSo ? 'Xasuusinta Waqtiga' : 'Deadline Alerts'}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-[#475569] dark:text-slate-400">
                      {notificationPermission === 'granted'
                        ? isSo
                          ? 'Shidan'
                          : 'Enabled'
                        : notificationPermission === 'denied'
                        ? isSo
                          ? 'Xanniban'
                          : 'Blocked'
                        : isSo
                        ? 'Damsan'
                        : 'Off'}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] dark:text-slate-400">
                    {isSo
                      ? 'Hel ogeysiis marka wakhtiga hawshaadu soo dhowaado (24 saac gudohood).'
                      : 'Get notified automatically when a task deadline is within 24 hours.'}
                  </p>
                  {notificationPermission !== 'granted' ? (
                    <button
                      type="button"
                      onClick={onRequestNotifications}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-[8px] bg-[#10234B] dark:bg-[#079B62] text-white text-xs font-bold hover:opacity-95"
                    >
                      {isSo ? 'Daar Ogeysiisyada' : 'Turn On Deadline Alerts'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onSendTestNotification}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62]"
                    >
                      {isSo ? 'Dir Ogeysiis Tijaabo ah' : 'Send Test Notification'}
                    </button>
                  )}

                  <div className="pt-3 border-t border-[#E2E8F0]/70 dark:border-[#1E2E4D] space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#10234B] dark:text-slate-300">
                      <CalendarClock className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>{isSo ? 'Hawlaha Soo Socda' : 'Upcoming Deadlines'}</span>
                    </div>
                    {upcomingDeadlines.length === 0 ? (
                      <p className="text-xs text-[#475569] dark:text-slate-400">
                        {isSo
                          ? 'Wax waqti kama dambays ah oo soo socda ma jiraan.'
                          : 'No pending task deadlines.'}
                      </p>
                    ) : (
                      upcomingDeadlines.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-[#10234B] dark:text-slate-300">{d.title}</span>
                          <span className="font-mono text-[#B45309] dark:text-[#F59E0B] font-bold tabular-nums shrink-0">
                            {new Date(d.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E2E4D] space-y-2.5">
                  <h3 className="font-display text-sm font-extrabold text-[#10234B] dark:text-white">
                    {isSo ? 'Ogeysiisyada Macallimiinta' : 'Faculty & Center Notices'}
                  </h3>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-[#475569] dark:text-slate-400">
                      {isSo
                        ? 'Weli wax ogeysiis macallin ah lama soo dirin.'
                        : 'No faculty notices posted yet.'}
                    </p>
                  ) : (
                    announcements.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className="rounded-[10px] border border-[#F59E0B]/35 bg-[#FFFBEB]/60 dark:bg-amber-950/20 p-3 space-y-1"
                      >
                        <div className="text-xs font-bold text-[#10234B] dark:text-white">{a.title}</div>
                        <div className="text-[11px] text-[#475569] dark:text-slate-400">
                          {a.subject} · {a.authorName}
                          {a.dueDate ? ` · ${isSo ? 'Waqtiga' : 'Due'} ${a.dueDate}` : ''}
                        </div>
                        <p className="text-xs text-[#10234B]/90 dark:text-slate-300">{a.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {utilityTab === 'apps' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-sm font-extrabold text-[#10234B] dark:text-white">
                    {isSo ? 'Buugaagta Offline' : 'Offline Health Books'}
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                    {isSo
                      ? 'Kaydi buugaag si aad u akhrido internet la’aan.'
                      : 'Save books to study without internet.'}
                  </p>
                  <div className="mt-2.5 divide-y divide-[#E2E8F0]/70 dark:divide-[#1E2E4D]">
                    {books.map((book) => {
                      const saved = profile.downloadedModules.includes(book.id);
                      return (
                        <div key={book.id} className="py-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#10234B] dark:text-white truncate">
                            {book.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleDownloadBook(book.id)}
                            className={`px-2.5 py-1 rounded-[7px] text-[11px] font-bold whitespace-nowrap shrink-0 ${
                              saved
                                ? 'bg-[#ECFDF5] dark:bg-emerald-950/60 text-[#079B62] dark:text-emerald-300 border border-[#079B62]/40'
                                : 'border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200 hover:border-[#079B62]'
                            }`}
                          >
                            {saved ? (isSo ? 'Waa La Kaydiyay' : 'Saved Offline') : isSo ? 'Kaydi' : 'Save'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E4D] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#079B62]" />
                    <h3 className="font-display text-sm font-extrabold text-[#10234B] dark:text-white">
                      {isSo ? 'Ku Shubo Taleefanka' : 'Mobile App Downloads'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href="https://apps.apple.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] hover:border-[#079B62]"
                    >
                      <div>
                        <div className="text-[10px] text-[#475569] dark:text-slate-400">
                          {isSo ? 'Ka soo dejiso' : 'Download on'}
                        </div>
                        <div className="text-xs font-extrabold text-[#10234B] dark:text-white">
                          App Store (iOS)
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>

                    <a
                      href="https://play.google.com/store"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] hover:border-[#079B62]"
                    >
                      <div>
                        <div className="text-[10px] text-[#475569] dark:text-slate-400">
                          {isSo ? 'Ka hel' : 'Get it on'}
                        </div>
                        <div className="text-xs font-extrabold text-[#10234B] dark:text-white">
                          Google Play
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>

                  <PWAInstallButton variant="full" language={language} />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Academic Subject Shortcuts & Progress Grid */}
      <SectionCard className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-[#10234B] dark:text-white">
              {isSo ? 'Maadooyinka Caafimaadka & Horumarka' : 'Medical Subjects & Progress'}
            </h2>
            <p className="text-xs text-[#475569] dark:text-slate-400">
              {isSo
                ? 'Dooro maado si aad u furto casharrada, daawooyinka, iyo imtixaannada.'
                : 'Select any subject to open lecture notes, visual guides, protocols, and quizzes.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#079B62]">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">
              {totalMinutes}m {isSo ? 'wadar' : 'total'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {subjectAnalytics.map((item) => (
            <div
              key={item.subject}
              className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] p-3.5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start gap-2.5">
                  <SubjectEmblemSvg subject={item.subject} size={36} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-[#10234B] dark:text-white leading-tight">
                      {item.subject}
                    </h3>
                    <p className="text-[11px] text-[#475569] dark:text-slate-400 line-clamp-2 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between text-xs text-[#475569] dark:text-slate-400">
                  <span>{isSo ? 'Waqti' : 'Study time'}</span>
                  <span className="font-mono font-bold text-[#10234B] dark:text-slate-200 tabular-nums">
                    {item.minutes}/{item.target}m
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-[#E2E8F0] dark:bg-[#0D172B] overflow-hidden">
                  <div
                    className="h-full bg-[#079B62] transition-all"
                    style={{ width: `${item.progressPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-[#475569] dark:text-slate-400">
                  <span>{isSo ? 'Celcelis Imtixaan' : 'Quiz Avg'}</span>
                  <span className="font-mono font-bold tabular-nums text-[#B45309] dark:text-[#F59E0B]">
                    {item.avgQuiz > 0 ? `${item.avgQuiz}%` : '—'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenModule(item.subject)}
                className="w-full min-h-[38px] py-1.5 px-3 rounded-[8px] bg-[#10234B] hover:bg-[#091734] dark:bg-[#079B62] dark:hover:bg-[#058152] text-white text-xs font-bold transition-colors"
              >
                {isSo ? 'Fur' : 'Open'} {item.subject.split(' ')[0]}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
