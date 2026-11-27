import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  BellRing,
  BookOpen,
  Bot,
  CheckSquare,
  ChevronRight,
  Clock,
  GraduationCap,
  Languages,
  Layers,
  LogOut,
  Moon,
  Pause,
  Play,
  ShieldCheck,
  Square,
  Sun,
  WifiOff,
} from 'lucide-react';
import { AdminTeacherPanelView } from './components/AdminTeacherPanelView';
import { HilaacLogo, SubjectEmblemSvg } from './components/ClinicalSvgs';
import { CommunityAndTutorView } from './components/CommunityAndTutorView';
import { DashboardAndTasksView } from './components/DashboardAndTasksView';
import { FlashcardsView } from './components/FlashcardsView';
import { LoginView } from './components/LoginView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ReaderAndBooksView } from './components/ReaderAndBooksView';
import { StudySessionSummaryModal } from './components/StudySessionSummaryModal';
import { SubjectModulesView } from './components/SubjectModulesView';
import { AdminProfileModal, StudentProfileModal } from './components/UiPrimitives';
import {
  defaultFlashcards,
  healthBooks,
  seedLeaderboard,
  seedStudyGroups,
} from './data/academicData';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from './firebase';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { deletePdfBinary, savePdfBinary } from './utils/pdfStorage';
import type {
  AcademicSubject,
  ActiveStudySession,
  AdminOwnerMeta,
  Announcement,
  AppLanguage,
  AppNavTab,
  BookCoverColor,
  CompletedStudySessionSummary,
  FlashcardItem,
  HealthBook,
  LeaderboardEntry,
  MonitoredUserSummary,
  ReaderAnnotation,
  RegistrationAlert,
  StudyGroup,
  StudyGroupPost,
  StudyLog,
  TaskItem,
  TaskSubject,
  UserProfile,
  UserRole,
} from './types';

const ADMIN_EMAIL = 'aadamali989@gmail.com';
const ADMIN_META_KEY = 'hilaac_admin_profile_meta_v1';
const STUDY_SESSION_PREFIX = 'hilaac_study_session_v1_';
const OFFLINE_USER_PREFIX = 'hilaac_offline_state_v2_';
const LOCAL_ACCOUNTS_KEY = 'hilaac_local_accounts_v1';
const LOCAL_REG_ALERTS_KEY = 'hilaac_reg_alerts_v1';
const DEVICE_BOOKS_KEY = 'hilaac_device_books_v1';
const THEME_STORAGE_KEY = 'hilaac_theme_dark';
const LANG_STORAGE_KEY = 'hilaac_ui_lang_v1';

const DEFAULT_ADMIN_META: AdminOwnerMeta = {
  adminTitle: 'Platform Administrator',
  organization: 'Hilaac Health Center',
  bio: '',
};

const LEGACY_ADMIN_TITLES = new Set(['Single System Owner & Lead Admin']);
const LEGACY_ADMIN_BIOS = new Set([
  'Oversees registered learners, clinical textbooks, announcements, and daily platform activity.',
]);

function loadAdminMeta(): AdminOwnerMeta {
  try {
    const raw = localStorage.getItem(ADMIN_META_KEY);
    if (!raw) return DEFAULT_ADMIN_META;
    const parsed = JSON.parse(raw) as Partial<AdminOwnerMeta>;
    const rawTitle = typeof parsed.adminTitle === 'string' ? parsed.adminTitle.trim() : '';
    const rawBio = typeof parsed.bio === 'string' ? parsed.bio : '';
    return {
      adminTitle:
        rawTitle && !LEGACY_ADMIN_TITLES.has(rawTitle)
          ? rawTitle
          : DEFAULT_ADMIN_META.adminTitle,
      organization:
        typeof parsed.organization === 'string' && parsed.organization.trim()
          ? parsed.organization
          : DEFAULT_ADMIN_META.organization,
      bio: LEGACY_ADMIN_BIOS.has(rawBio.trim()) ? '' : rawBio,
    };
  } catch {
    return DEFAULT_ADMIN_META;
  }
}

interface LocalAccountRecord {
  uid: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  username: string;
  createdAtMs: number;
}

async function hashCredential(usernameKey: string, password: string): Promise<string> {
  const input = `hilaac:${usernameKey}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let acc = 0;
  for (let i = 0; i < input.length; i++) {
    acc = (acc * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String(acc);
}

interface OfflineSnapshot {
  profile: UserProfile | null;
  tasks: TaskItem[];
  studyLogs: StudyLog[];
  annotations: ReaderAnnotation[];
  flashcards: FlashcardItem[];
  studyGroups: StudyGroup[];
  posts: StudyGroupPost[];
  announcements: Announcement[];
}

function makeSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toMs(val: unknown): number {
  if (typeof val === 'number') return val;
  if (val && typeof (val as Timestamp).toMillis === 'function') {
    return (val as Timestamp).toMillis();
  }
  return Date.now();
}

function getLocalAccounts(): Record<string, LocalAccountRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LocalAccountRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadLocalRegistrationAlerts(): RegistrationAlert[] {
  try {
    const raw = localStorage.getItem(LOCAL_REG_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegistrationAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRegistrationAlerts(list: RegistrationAlert[]) {
  try {
    localStorage.setItem(LOCAL_REG_ALERTS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // ignore storage quota errors
  }
}

function loadDeviceBooks(): HealthBook[] {
  try {
    const raw = localStorage.getItem(DEVICE_BOOKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HealthBook[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((b) => ({
      ...b,
      pdfUrl: b.pdfUrl && !b.pdfUrl.startsWith('blob:') ? b.pdfUrl : undefined,
    }));
  } catch {
    return [];
  }
}

function saveDeviceBooks(books: HealthBook[]) {
  try {
    const serializable = books.map((b) => ({
      ...b,
      pdfUrl: b.pdfUrl && !b.pdfUrl.startsWith('blob:') ? b.pdfUrl : undefined,
    }));
    localStorage.setItem(DEVICE_BOOKS_KEY, JSON.stringify(serializable));
  } catch {
    // ignore storage quota errors
  }
}

function createDefaultAnnouncements(): Announcement[] {
  return [
    {
      id: 'ann_welcome_1',
      authorUid: 'system-faculty',
      authorName: 'Hilaac Faculty',
      title: 'Weekly Clinical Rounds & Sepsis Bundle Review',
      subject: 'Clinical OPD',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      body: 'Read Chapter 1 of Jawetz Medical Microbiology and complete the OPD quiz.',
      createdAtMs: Date.now(),
    },
  ];
}

function createStarterTasks(uid: string): TaskItem[] {
  return [
    {
      id: `task_welcome_1_${uid}`,
      userId: uid,
      title: 'Review Pharmacology Visual Modules & #1–#209 Safety Notes',
      subject: 'Pharmacology',
      priority: 'high',
      dueDate: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString().slice(0, 16),
      completed: false,
      notifyEnabled: true,
      notes: 'Focus on Heparin/Warfarin antidotes and Digoxin potassium monitoring.',
      createdAtMs: Date.now(),
    },
    {
      id: `task_welcome_2_${uid}`,
      userId: uid,
      title: 'Complete 8 Spaced-Repetition Flashcards',
      subject: 'Personal',
      priority: 'medium',
      dueDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString().slice(0, 16),
      completed: false,
      notifyEnabled: true,
      notes: 'Use SM-2 grading for long-term retention.',
      createdAtMs: Date.now(),
    },
  ];
}

function createFreshOfflineSnapshot(uid: string, profile: UserProfile): OfflineSnapshot {
  return {
    profile,
    tasks: createStarterTasks(uid),
    studyLogs: [],
    annotations: [],
    flashcards: defaultFlashcards.map((c) => ({ ...c, userId: uid })),
    studyGroups: seedStudyGroups,
    posts: [],
    announcements: createDefaultAnnouncements(),
  };
}

function loadUserOfflineSnapshot(uid: string, fallbackProfile: UserProfile): OfflineSnapshot {
  try {
    const raw = localStorage.getItem(`${OFFLINE_USER_PREFIX}${uid}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OfflineSnapshot>;
      return {
        profile: parsed.profile
          ? {
              ...parsed.profile,
              role: parsed.profile.role === 'teacher' ? 'teacher' : 'student',
              favoriteBooks: Array.isArray(parsed.profile.favoriteBooks)
                ? parsed.profile.favoriteBooks
                : [],
            }
          : fallbackProfile,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : createStarterTasks(uid),
        studyLogs: Array.isArray(parsed.studyLogs) ? parsed.studyLogs : [],
        annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
        flashcards:
          Array.isArray(parsed.flashcards) && parsed.flashcards.length > 0
            ? parsed.flashcards
            : defaultFlashcards.map((c) => ({ ...c, userId: uid })),
        studyGroups:
          Array.isArray(parsed.studyGroups) && parsed.studyGroups.length > 0
            ? parsed.studyGroups
            : seedStudyGroups,
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        announcements:
          Array.isArray(parsed.announcements) && parsed.announcements.length > 0
            ? parsed.announcements
            : createDefaultAnnouncements(),
      };
    }
  } catch {
    // ignore corrupt local storage
  }
  return createFreshOfflineSnapshot(uid, fallbackProfile);
}

const TAB_TITLES: Record<AppLanguage, Record<AppNavTab, string>> = {
  en: {
    dashboard: 'Tasks & Home',
    modules: 'Academic Subject Modules',
    reader: 'Health Books & Online Reader',
    flashcards: 'Spaced-Repetition Flashcards',
    community: 'AI Tutor & Study Groups',
    admin: 'Administrator Management Panel',
  },
  so: {
    dashboard: 'Hawlaha & Bogga Hore',
    modules: 'Maadooyinka Waxbarashada',
    reader: 'Buugaagta Caafimaadka & Akhriska',
    flashcards: 'Kaararka Xusuusta (Flashcards)',
    community: 'Macallinka AI & Kooxaha',
    admin: 'Maamulka Guud (Admin Panel)',
  },
};

export default function App() {
  const isOnline = useOnlineStatus();

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'so' ? 'so' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, String(isDark));
    } catch {
      // ignore
    }
  }, [isDark]);

  // Auth & mode state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountsVersion, setAccountsVersion] = useState(0);
  const pendingRoleChoiceRef = useRef<{
    role: UserRole;
    displayName?: string;
  } | null>(null);

  // Domain state (starts unauthenticated so first-time users MUST register)
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [annotations, setAnnotations] = useState<ReaderAnnotation[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>(() =>
    defaultFlashcards.map((c) => ({ ...c, userId: 'local-user' }))
  );
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>(seedStudyGroups);
  const [activeGroupId, setActiveGroupId] = useState<string>(seedStudyGroups[0].id);
  const [groupPosts, setGroupPosts] = useState<StudyGroupPost[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(seedLeaderboard);
  const [announcements, setAnnouncements] = useState<Announcement[]>(createDefaultAnnouncements);
  const [cloudBooks, setCloudBooks] = useState<HealthBook[]>([]);
  const [deviceBooks, setDeviceBooks] = useState<HealthBook[]>(loadDeviceBooks);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [adminMeta, setAdminMeta] = useState<AdminOwnerMeta>(loadAdminMeta);

  // Registration notification alerts
  const [localRegistrationAlerts, setLocalRegistrationAlerts] = useState<RegistrationAlert[]>(
    loadLocalRegistrationAlerts
  );
  const [cloudRegistrationAlerts, setCloudRegistrationAlerts] = useState<RegistrationAlert[]>([]);

  const allRegistrationAlerts = useMemo(() => {
    const merged = new Map<string, RegistrationAlert>();
    localRegistrationAlerts.forEach((a) => merged.set(a.id, a));
    cloudRegistrationAlerts.forEach((a) => merged.set(a.id, a));
    return Array.from(merged.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [localRegistrationAlerts, cloudRegistrationAlerts]);

  const allBooks = useMemo(() => {
    const deviceById = new Map<string, HealthBook>();
    deviceBooks.forEach((b) => deviceById.set(b.id, b));
    const mergedCustom = new Map<string, HealthBook>();
    cloudBooks.forEach((b) => {
      const localMatch = deviceById.get(b.id);
      mergedCustom.set(b.id, {
        ...b,
        coverImage: localMatch?.coverImage || b.coverImage,
        pdfUrl: localMatch?.pdfUrl || b.pdfUrl,
        hasLocalPdf: localMatch?.hasLocalPdf || b.hasLocalPdf,
      });
    });
    deviceBooks.forEach((b) => {
      if (!mergedCustom.has(b.id)) {
        mergedCustom.set(b.id, b);
      }
    });
    return [...Array.from(mergedCustom.values()), ...healthBooks];
  }, [deviceBooks, cloudBooks]);

  // Navigation state with history stack for Back Arrow navigation
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');
  const [tabHistory, setTabHistory] = useState<AppNavTab[]>(['dashboard']);
  const [activeSubject, setActiveSubject] = useState<AcademicSubject>('Pharmacology');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Accurate wall-clock study session tracker (persists across navigation & breaks)
  const [activeStudySession, setActiveStudySession] = useState<ActiveStudySession | null>(null);
  const [timerNowMs, setTimerNowMs] = useState<number>(() => Date.now());
  const [pendingSessionSummary, setPendingSessionSummary] =
    useState<CompletedStudySessionSummary | null>(null);

  useEffect(() => {
    if (!profile) {
      setActiveStudySession(null);
      setPendingSessionSummary(null);
      return;
    }
    try {
      const raw = localStorage.getItem(`${STUDY_SESSION_PREFIX}${profile.uid}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ActiveStudySession>;
        if (
          parsed &&
          (parsed.status === 'running' || parsed.status === 'paused') &&
          typeof parsed.subject === 'string' &&
          typeof parsed.accumulatedMs === 'number'
        ) {
          setActiveStudySession({
            status: parsed.status,
            subject: parsed.subject as AcademicSubject,
            moduleTitle: String(parsed.moduleTitle || `${parsed.subject} Study Session`),
            accumulatedMs: parsed.accumulatedMs,
            lastStartedAtMs: parsed.lastStartedAtMs ?? null,
            startedAtMs: parsed.startedAtMs ?? Date.now(),
            pauseCount: Number(parsed.pauseCount || 0),
            totalPausedMs: Number(parsed.totalPausedMs || 0),
            lastPausedAtMs: parsed.lastPausedAtMs ?? null,
          });
          setTimerNowMs(Date.now());
          return;
        }
      }
    } catch {
      // ignore corrupt session cache
    }
    setActiveStudySession(null);
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile) return;
    try {
      if (activeStudySession) {
        localStorage.setItem(
          `${STUDY_SESSION_PREFIX}${profile.uid}`,
          JSON.stringify(activeStudySession)
        );
      } else {
        localStorage.removeItem(`${STUDY_SESSION_PREFIX}${profile.uid}`);
      }
    } catch {
      // ignore storage quota errors
    }
  }, [activeStudySession, profile?.uid]);

  useEffect(() => {
    if (!activeStudySession || activeStudySession.status !== 'running') return;
    setTimerNowMs(Date.now());
    const id = window.setInterval(() => {
      setTimerNowMs(Date.now());
    }, 500);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimerNowMs(Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeStudySession]);

  const sessionElapsedSeconds = useMemo(() => {
    if (!activeStudySession) return 0;
    const liveMs =
      activeStudySession.status === 'running' && activeStudySession.lastStartedAtMs
        ? Math.max(0, timerNowMs - activeStudySession.lastStartedAtMs)
        : 0;
    return Math.floor((activeStudySession.accumulatedMs + liveMs) / 1000);
  }, [activeStudySession, timerNowMs]);

  const handleStartStudySession = useCallback(
    (subject: AcademicSubject, moduleTitle: string) => {
      const now = Date.now();
      setPendingSessionSummary(null);
      setTimerNowMs(now);
      setActiveStudySession({
        status: 'running',
        subject,
        moduleTitle,
        accumulatedMs: 0,
        lastStartedAtMs: now,
        startedAtMs: now,
        pauseCount: 0,
        totalPausedMs: 0,
        lastPausedAtMs: null,
      });
    },
    []
  );

  const handlePauseStudySession = useCallback(() => {
    const now = Date.now();
    setTimerNowMs(now);
    setActiveStudySession((prev) => {
      if (!prev || prev.status !== 'running') return prev;
      const deltaMs = prev.lastStartedAtMs ? Math.max(0, now - prev.lastStartedAtMs) : 0;
      return {
        ...prev,
        status: 'paused',
        accumulatedMs: prev.accumulatedMs + deltaMs,
        lastStartedAtMs: null,
        pauseCount: prev.pauseCount + 1,
        lastPausedAtMs: now,
      };
    });
  }, []);

  const handleResumeStudySession = useCallback(() => {
    const now = Date.now();
    setTimerNowMs(now);
    setActiveStudySession((prev) => {
      if (!prev || prev.status !== 'paused') return prev;
      const pauseDeltaMs = prev.lastPausedAtMs ? Math.max(0, now - prev.lastPausedAtMs) : 0;
      return {
        ...prev,
        status: 'running',
        lastStartedAtMs: now,
        totalPausedMs: prev.totalPausedMs + pauseDeltaMs,
        lastPausedAtMs: null,
      };
    });
  }, []);

  const handleFinishStudySession = useCallback(() => {
    if (!activeStudySession) return;
    const now = Date.now();
    setTimerNowMs(now);

    const extraActiveMs =
      activeStudySession.status === 'running' && activeStudySession.lastStartedAtMs
        ? Math.max(0, now - activeStudySession.lastStartedAtMs)
        : 0;
    const extraPausedMs =
      activeStudySession.status === 'paused' && activeStudySession.lastPausedAtMs
        ? Math.max(0, now - activeStudySession.lastPausedAtMs)
        : 0;

    const finalAccumulatedMs = activeStudySession.accumulatedMs + extraActiveMs;
    const finalPausedMs = activeStudySession.totalPausedMs + extraPausedMs;
    const activeSeconds = Math.max(1, Math.floor(finalAccumulatedMs / 1000));
    const pausedSeconds = Math.floor(finalPausedMs / 1000);
    const loggedMinutes = Math.max(1, Math.round(activeSeconds / 60));

    // Freeze timer in paused state so user can still choose "Resume Timer" from the summary modal
    setActiveStudySession({
      ...activeStudySession,
      status: 'paused',
      accumulatedMs: finalAccumulatedMs,
      lastStartedAtMs: null,
      totalPausedMs: finalPausedMs,
      lastPausedAtMs: now,
    });

    setPendingSessionSummary({
      subject: activeStudySession.subject,
      moduleTitle: activeStudySession.moduleTitle,
      activeSeconds,
      pausedSeconds,
      loggedMinutes,
      pauseCount: activeStudySession.pauseCount,
      xpEarned: loggedMinutes * 2,
      participationEarned: 10,
      startedAtMs: activeStudySession.startedAtMs,
      endedAtMs: now,
    });
  }, [activeStudySession]);

  // Notifications
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const [deadlineBanner, setDeadlineBanner] = useState<string | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const notifiedAlertIdsRef = useRef<Set<string>>(new Set());

  const isAdminUser = Boolean(
    profile &&
      profile.email.toLowerCase() === ADMIN_EMAIL &&
      profile.role === 'admin'
  );
  const unreadAlertsCount = isAdminUser
    ? allRegistrationAlerts.filter((a) => !a.read).length
    : 0;

  const monitoredUsers = useMemo<MonitoredUserSummary[]>(() => {
    if (!isAdminUser) return [];
    const byUid = new Map<string, MonitoredUserSummary>();
    const alertJoinedByUid = new Map<string, number>();
    allRegistrationAlerts.forEach((a) => {
      const existing = alertJoinedByUid.get(a.userUid);
      if (!existing || a.createdAtMs < existing) {
        alertJoinedByUid.set(a.userUid, a.createdAtMs);
      }
    });

    allUsers.forEach((u) => {
      const isSingleOwner = u.email.toLowerCase() === ADMIN_EMAIL;
      const safeRole: UserRole = isSingleOwner
        ? 'admin'
        : u.role === 'teacher'
        ? 'teacher'
        : 'student';
      const isCurrent = profile && profile.uid === u.uid;
      byUid.set(u.uid, {
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        role: safeRole,
        source: 'google',
        xp: u.xp,
        streakDays: u.streakDays,
        studyMinutes: u.studyMinutes,
        participationScore: u.participationScore,
        completedTasks: isCurrent ? tasks.filter((t) => t.completed).length : 0,
        totalTasks: isCurrent ? tasks.length : 0,
        sessionsCount: isCurrent ? studyLogs.length : 0,
        joinedAtMs: alertJoinedByUid.get(u.uid),
      });
    });

    const localAccounts = getLocalAccounts();
    Object.values(localAccounts).forEach((acc) => {
      const fallbackRole: UserRole = acc.role === 'teacher' ? 'teacher' : 'student';
      let snapProfile: UserProfile | null = null;
      let snapTasks: TaskItem[] = [];
      let snapLogs: StudyLog[] = [];
      try {
        const raw = localStorage.getItem(`${OFFLINE_USER_PREFIX}${acc.uid}`);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<OfflineSnapshot>;
          snapProfile = parsed.profile || null;
          snapTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
          snapLogs = Array.isArray(parsed.studyLogs) ? parsed.studyLogs : [];
        }
      } catch {
        // ignore corrupt local snapshot
      }
      const isCurrent = Boolean(profile && !profile.isCloudSynced && profile.uid === acc.uid);
      const effectiveTasks = isCurrent ? tasks : snapTasks;
      const effectiveLogs = isCurrent ? studyLogs : snapLogs;
      const effectiveProfile = isCurrent ? profile : snapProfile;
      const safeRole: UserRole =
        effectiveProfile?.role === 'teacher' || fallbackRole === 'teacher' ? 'teacher' : 'student';

      byUid.set(acc.uid, {
        uid: acc.uid,
        displayName: effectiveProfile?.displayName || acc.displayName,
        email: effectiveProfile?.email || `@${acc.username}`,
        role: safeRole,
        source: 'device',
        xp: effectiveProfile?.xp ?? 50,
        streakDays: effectiveProfile?.streakDays ?? 1,
        studyMinutes: effectiveProfile?.studyMinutes ?? 0,
        participationScore: effectiveProfile?.participationScore ?? 10,
        completedTasks: effectiveTasks.filter((t) => t.completed).length,
        totalTasks: effectiveTasks.length,
        sessionsCount: effectiveLogs.length,
        joinedAtMs: acc.createdAtMs,
      });
    });

    allRegistrationAlerts.forEach((a) => {
      if (!byUid.has(a.userUid)) {
        const isSingleOwner = a.email.toLowerCase() === ADMIN_EMAIL;
        byUid.set(a.userUid, {
          uid: a.userUid,
          displayName: a.displayName,
          email: a.email,
          role: isSingleOwner ? 'admin' : a.role === 'teacher' ? 'teacher' : 'student',
          source: a.source,
          xp: 50,
          streakDays: 1,
          studyMinutes: 0,
          participationScore: 10,
          completedTasks: 0,
          totalTasks: 0,
          sessionsCount: 0,
          joinedAtMs: a.createdAtMs,
        });
      }
    });

    return Array.from(byUid.values()).sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return b.xp - a.xp || b.studyMinutes - a.studyMinutes;
    });
  }, [isAdminUser, allUsers, allRegistrationAlerts, accountsVersion, profile, tasks, studyLogs]);

  // Keep non-admin users out of the Admin tab cleanly
  useEffect(() => {
    if (profile && !isAdminUser && activeTab === 'admin') {
      setActiveTab('dashboard');
      setTabHistory(['dashboard']);
    }
  }, [profile, isAdminUser, activeTab]);

  // Persist per-user offline snapshot whenever not in cloud mode
  useEffect(() => {
    if (!profile || profile.isCloudSynced) return;
    try {
      const snap: OfflineSnapshot = {
        profile,
        tasks,
        studyLogs,
        annotations,
        flashcards,
        studyGroups,
        posts: groupPosts,
        announcements,
      };
      localStorage.setItem(`${OFFLINE_USER_PREFIX}${profile.uid}`, JSON.stringify(snap));
    } catch {
      // ignore storage quota errors
    }
  }, [profile, tasks, studyLogs, annotations, flashcards, studyGroups, groupPosts, announcements]);

  // Listen to Firebase Auth state
  useEffect(() => {
    testFirestoreConnection().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          const pending = pendingRoleChoiceRef.current;

          if (!snap.exists()) {
            const isOwnerAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
            const chosenRole: UserRole = isOwnerAdmin
              ? 'admin'
              : pending?.role === 'teacher'
              ? 'teacher'
              : 'student';

            const displayName = (pending?.displayName || user.displayName || 'Hilaac Learner').slice(0, 100);
            const email = (user.email || 'learner@hilaac.edu').slice(0, 160);

            const payload: Record<string, unknown> = {
              uid: user.uid,
              displayName,
              email,
              role: chosenRole,
              xp: 50,
              streakDays: 1,
              studyMinutes: 0,
              participationScore: 10,
              downloadedModules: [],
              favoriteBooks: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            await setDoc(userRef, payload);

            // Notify admin of every newly registered Google Cloud account
            const alertId = makeSafeId('reg');
            await setDoc(doc(db, 'registrationAlerts', alertId), {
              id: alertId,
              userUid: user.uid,
              displayName,
              email,
              role: chosenRole,
              source: 'google',
              read: false,
              createdAt: serverTimestamp(),
            });

            await setDoc(doc(db, 'leaderboard', user.uid), {
              uid: user.uid,
              displayName,
              role: chosenRole,
              xp: 50,
              studyMinutes: 0,
              streakDays: 1,
              updatedAt: serverTimestamp(),
            });

            // Seed starter flashcards for new cloud user
            for (const card of defaultFlashcards) {
              await setDoc(doc(db, 'users', user.uid, 'flashcards', card.id), {
                id: card.id,
                userId: user.uid,
                subject: card.subject,
                front: card.front,
                back: card.back,
                intervalDays: card.intervalDays,
                easeFactor: card.easeFactor,
                repetitions: card.repetitions,
                nextReviewAt: card.nextReviewAt,
                updatedAt: serverTimestamp(),
              });
            }
          } else {
            const data = snap.data();
            const isOwnerAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
            const currentRole = String(data.role || 'student');
            const desiredRole: UserRole = isOwnerAdmin
              ? 'admin'
              : pending
              ? pending.role === 'teacher'
                ? 'teacher'
                : 'student'
              : currentRole === 'admin'
              ? 'teacher'
              : currentRole === 'teacher'
              ? 'teacher'
              : 'student';

            const needsRoleUpdate = desiredRole !== currentRole;
            const needsNameUpdate = Boolean(pending?.displayName);
            if (needsRoleUpdate || needsNameUpdate) {
              const updatePayload: Record<string, unknown> = {
                role: desiredRole,
                updatedAt: serverTimestamp(),
              };
              if (pending?.displayName) {
                updatePayload.displayName = pending.displayName.slice(0, 100);
              }
              await updateDoc(userRef, updatePayload);
            }
          }
          pendingRoleChoiceRef.current = null;
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore listeners when signed in
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (!snap.exists()) return;
          const d = snap.data();
          const email = String(d.email || firebaseUser.email || '');
          const isSingleOwner = email.toLowerCase() === ADMIN_EMAIL;
          const rawRole = String(d.role || 'student');
          const safeRole: UserRole = isSingleOwner
            ? 'admin'
            : rawRole === 'teacher'
            ? 'teacher'
            : 'student';
          setProfile({
            uid: String(d.uid),
            displayName: String(d.displayName || 'Hilaac Learner'),
            email,
            role: safeRole,
            xp: Number(d.xp || 0),
            streakDays: Number(d.streakDays || 1),
            studyMinutes: Number(d.studyMinutes || 0),
            participationScore: Number(d.participationScore || 0),
            downloadedModules: Array.isArray(d.downloadedModules) ? d.downloadedModules : [],
            favoriteBooks: Array.isArray(d.favoriteBooks) ? d.favoriteBooks : [],
            isCloudSynced: true,
          });
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'users', uid, 'tasks'), where('userId', '==', uid)),
        (snap) => {
          const list: TaskItem[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: String(d.id),
              userId: String(d.userId),
              title: String(d.title),
              subject: d.subject as TaskSubject,
              priority: d.priority as 'high' | 'medium' | 'low',
              dueDate: String(d.dueDate || ''),
              completed: Boolean(d.completed),
              notifyEnabled: Boolean(d.notifyEnabled),
              notes: String(d.notes || ''),
              createdAtMs: toMs(d.createdAt),
            };
          });
          list.sort((a, b) => b.createdAtMs - a.createdAtMs);
          setTasks(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/tasks`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'users', uid, 'studyLogs'), where('userId', '==', uid)),
        (snap) => {
          const list: StudyLog[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: String(d.id),
              userId: String(d.userId),
              subject: d.subject as AcademicSubject,
              moduleTitle: String(d.moduleTitle),
              minutesSpent: Number(d.minutesSpent || 0),
              quizScore: Number(d.quizScore || 0),
              participationType: d.participationType as StudyLog['participationType'],
              createdAtMs: toMs(d.createdAt),
            };
          });
          list.sort((a, b) => b.createdAtMs - a.createdAtMs);
          setStudyLogs(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/studyLogs`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'users', uid, 'annotations'), where('userId', '==', uid)),
        (snap) => {
          const list: ReaderAnnotation[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: String(d.id),
              userId: String(d.userId),
              bookId: String(d.bookId),
              pageTitle: String(d.pageTitle),
              highlightText: String(d.highlightText),
              note: String(d.note || ''),
              color: (d.color === 'sky' ? 'navy' : d.color) as ReaderAnnotation['color'],
              createdAtMs: toMs(d.createdAt),
            };
          });
          list.sort((a, b) => b.createdAtMs - a.createdAtMs);
          setAnnotations(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/annotations`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'users', uid, 'flashcards'), where('userId', '==', uid)),
        (snap) => {
          const list: FlashcardItem[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: String(d.id),
              userId: String(d.userId),
              subject: d.subject as FlashcardItem['subject'],
              front: String(d.front),
              back: String(d.back),
              intervalDays: Number(d.intervalDays || 0),
              easeFactor: Number(d.easeFactor || 2.5),
              repetitions: Number(d.repetitions || 0),
              nextReviewAt: String(d.nextReviewAt || new Date().toISOString()),
            };
          });
          setFlashcards(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/flashcards`)
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'studyGroups'), where('memberCount', '>=', 1)),
        (snap) => {
          const cloudGroups: StudyGroup[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: String(d.id),
              name: String(d.name),
              subject: d.subject as StudyGroup['subject'],
              description: String(d.description),
              createdByUid: String(d.createdByUid),
              createdByName: String(d.createdByName),
              memberCount: Number(d.memberCount || 1),
            };
          });
          const merged = new Map<string, StudyGroup>();
          seedStudyGroups.forEach((g) => merged.set(g.id, g));
          cloudGroups.forEach((g) => merged.set(g.id, g));
          setStudyGroups(Array.from(merged.values()));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'studyGroups')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'leaderboard'), where('xp', '>=', 0)),
        (snap) => {
          const cloudEntries: LeaderboardEntry[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              uid: String(d.uid),
              displayName: String(d.displayName),
              role: d.role as UserRole,
              xp: Number(d.xp || 0),
              studyMinutes: Number(d.studyMinutes || 0),
              streakDays: Number(d.streakDays || 1),
            };
          });
          const merged = new Map<string, LeaderboardEntry>();
          seedLeaderboard.forEach((e) => merged.set(e.uid, e));
          cloudEntries.forEach((e) => merged.set(e.uid, e));
          setLeaderboard(Array.from(merged.values()));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'leaderboard')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'announcements'), where('authorUid', '>=', '')),
        (snap) => {
          const list: Announcement[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: String(d.id),
              authorUid: String(d.authorUid),
              authorName: String(d.authorName),
              title: String(d.title),
              subject: d.subject as Announcement['subject'],
              dueDate: String(d.dueDate || ''),
              body: String(d.body),
              createdAtMs: toMs(d.createdAt),
            };
          });
          list.sort((a, b) => b.createdAtMs - a.createdAtMs);
          setAnnouncements(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'announcements')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'books'), where('authorUid', '>=', '')),
        (snap) => {
          const list: HealthBook[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            const rawChapters = Array.isArray(d.chapters) ? d.chapters : [];
            return {
              id: String(d.id),
              authorUid: String(d.authorUid || ''),
              title: String(d.title),
              author: String(d.author),
              subject: d.subject as AcademicSubject,
              edition: String(d.edition || '1st Edition'),
              readMinutes: Number(d.readMinutes || 20),
              summary: String(d.summary || ''),
              coverColor: (d.coverColor as BookCoverColor) || 'navy',
              chapters: rawChapters.map((ch: Record<string, unknown>, idx: number) => ({
                id: String(ch.id || `ch_${idx + 1}`),
                title: String(ch.title || `Chapter ${idx + 1}`),
                paragraphs: Array.isArray(ch.paragraphs)
                  ? ch.paragraphs.map((p) => String(p))
                  : [],
              })),
              isCustom: true,
              createdAtMs: toMs(d.createdAt),
            };
          });
          list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
          setCloudBooks(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'books')
      )
    );

    if (firebaseUser.email?.toLowerCase() === ADMIN_EMAIL) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            const list: UserProfile[] = snap.docs.map((docSnap) => {
              const d = docSnap.data();
              const email = String(d.email || '');
              const isSingleOwner = email.toLowerCase() === ADMIN_EMAIL;
              const rawRole = String(d.role || 'student');
              const safeRole: UserRole = isSingleOwner
                ? 'admin'
                : rawRole === 'teacher'
                ? 'teacher'
                : 'student';
              return {
                uid: String(d.uid),
                displayName: String(d.displayName),
                email,
                role: safeRole,
                xp: Number(d.xp || 0),
                streakDays: Number(d.streakDays || 1),
                studyMinutes: Number(d.studyMinutes || 0),
                participationScore: Number(d.participationScore || 0),
                downloadedModules: Array.isArray(d.downloadedModules) ? d.downloadedModules : [],
                favoriteBooks: Array.isArray(d.favoriteBooks) ? d.favoriteBooks : [],
                isCloudSynced: true,
              };
            });
            setAllUsers(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'registrationAlerts'),
          (snap) => {
            const list: RegistrationAlert[] = snap.docs.map((docSnap) => {
              const d = docSnap.data();
              const rawRole = String(d.role || 'student');
              const safeRole: UserRole =
                rawRole === 'admin' || rawRole === 'teacher' ? rawRole : 'student';
              return {
                id: String(d.id),
                userUid: String(d.userUid),
                displayName: String(d.displayName),
                email: String(d.email),
                role: safeRole,
                source: d.source === 'device' ? 'device' : 'google',
                read: Boolean(d.read),
                createdAtMs: toMs(d.createdAt),
              };
            });
            list.sort((a, b) => b.createdAtMs - a.createdAtMs);
            setCloudRegistrationAlerts(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'registrationAlerts')
        )
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser]);

  // Listen to active group posts when signed in
  useEffect(() => {
    if (!firebaseUser || !activeGroupId) return;
    const unsub = onSnapshot(
      query(
        collection(db, 'studyGroups', activeGroupId, 'posts'),
        where('groupId', '==', activeGroupId)
      ),
      (snap) => {
        const list: StudyGroupPost[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: String(d.id),
            groupId: String(d.groupId),
            authorUid: String(d.authorUid),
            authorName: String(d.authorName),
            authorRole: d.authorRole as UserRole,
            content: String(d.content),
            attachmentTitle: String(d.attachmentTitle || ''),
            attachmentSnippet: String(d.attachmentSnippet || ''),
            createdAtMs: toMs(d.createdAt),
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setGroupPosts((prev) => [
          ...prev.filter((p) => p.groupId !== activeGroupId),
          ...list,
        ]);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `studyGroups/${activeGroupId}/posts`)
    );
    return () => unsub();
  }, [firebaseUser, activeGroupId]);

  // Deadline Push Alert monitor
  useEffect(() => {
    if (!profile) return;
    const checkDeadlines = () => {
      const now = Date.now();
      const soonTasks = tasks.filter((t) => {
        if (t.completed || !t.notifyEnabled || !t.dueDate) return false;
        const diff = new Date(t.dueDate).getTime() - now;
        return diff > -60 * 60 * 1000 && diff <= 24 * 60 * 60 * 1000;
      });

      if (soonTasks.length > 0) {
        const first = soonTasks[0];
        setDeadlineBanner(
          `Upcoming deadline: "${first.title}" (${first.subject}) due ${new Date(
            first.dueDate
          ).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`
        );

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          soonTasks.forEach((t) => {
            if (!notifiedIdsRef.current.has(t.id)) {
              notifiedIdsRef.current.add(t.id);
              try {
                new Notification('Hilaac Deadline Alert', {
                  body: `${t.title} (${t.subject}) is due soon.`,
                  icon: '/pwa-192x192.png',
                });
              } catch {
                // ignore environments disallowing direct Notification constructor
              }
            }
          });
        }
      } else {
        setDeadlineBanner(null);
      }
    };

    checkDeadlines();
    const id = window.setInterval(checkDeadlines, 60000);
    return () => window.clearInterval(id);
  }, [tasks, profile]);

  const awardMetrics = useCallback(
    async (xpDelta: number, minutesDelta: number, participationDelta: number) => {
      if (!profile) return;
      const nextXp = Math.max(0, Math.round(profile.xp + xpDelta));
      const nextMinutes = Math.max(0, Math.round(profile.studyMinutes + minutesDelta));
      const nextPart = Math.max(0, Math.round(profile.participationScore + participationDelta));

      if (firebaseUser && profile.isCloudSynced) {
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            xp: nextXp,
            studyMinutes: nextMinutes,
            participationScore: nextPart,
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, 'leaderboard', firebaseUser.uid), {
            uid: firebaseUser.uid,
            displayName: profile.displayName,
            role: profile.role,
            xp: nextXp,
            studyMinutes: nextMinutes,
            streakDays: profile.streakDays,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                xp: nextXp,
                studyMinutes: nextMinutes,
                participationScore: nextPart,
              }
            : null
        );
      }
    },
    [profile, firebaseUser]
  );

  // Browser Notification for new unread registrations when signed in as Admin
  useEffect(() => {
    if (!isAdminUser) return;
    const unread = allRegistrationAlerts.filter((a) => !a.read);
    if (unread.length === 0) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      unread.forEach((a) => {
        if (!notifiedAlertIdsRef.current.has(a.id)) {
          notifiedAlertIdsRef.current.add(a.id);
          try {
            new Notification('Hilaac New User Registration', {
              body: `${a.displayName} (${a.role}) created a new account.`,
              icon: '/pwa-192x192.png',
            });
          } catch {
            // ignore environments disallowing Notification constructor
          }
        }
      });
    }
  }, [isAdminUser, allRegistrationAlerts]);

  function navigateToTab(nextTab: AppNavTab) {
    if (nextTab === 'admin' && !isAdminUser) return;
    setActiveTab((prev) => {
      if (prev === nextTab) return prev;
      setTabHistory((hist) => [...hist, nextTab]);
      return nextTab;
    });
  }

  function handleGoBack() {
    setTabHistory((hist) => {
      if (hist.length <= 1) {
        setActiveTab('dashboard');
        return ['dashboard'];
      }
      const nextHist = hist.slice(0, -1);
      const previousTab = nextHist[nextHist.length - 1] ?? 'dashboard';
      if (previousTab === 'admin' && !isAdminUser) {
        setActiveTab('dashboard');
        return ['dashboard'];
      }
      setActiveTab(previousTab);
      return nextHist;
    });
  }

  // Auth handlers
  async function handleGoogleLogin(role: 'student' | 'teacher', displayNameInput?: string) {
    setAuthError(null);
    setIsSigningIn(true);
    pendingRoleChoiceRef.current = {
      role,
      displayName: displayNameInput,
    };
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      pendingRoleChoiceRef.current = null;
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleRegisterLocalAccount(input: {
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
  }): Promise<string | null> {
    setAuthError(null);
    const cleanFullName = input.fullName.trim();
    const cleanUsername = input.username.trim();
    const key = cleanUsername.toLowerCase().replace(/\s+/g, '_');

    if (cleanFullName.length < 2) {
      return 'Full name must be at least 2 characters.';
    }
    if (key.length < 2) {
      return 'Username must be at least 2 characters.';
    }
    if (input.password.length < 4) {
      return 'Password must be at least 4 characters.';
    }

    const accounts = getLocalAccounts();
    if (accounts[key]) {
      return 'This username is already registered. Please switch to Sign In or pick another username.';
    }
    if (input.role === 'admin') {
      return language === 'so'
        ? 'Maamulka Admin waxaa leh hal qof oo keliya. Fadlan iska diiwaangeli Arday ama Macallin.'
        : 'Admin access is reserved for the single owner account. Please register as Student or Teacher.';
    }

    const uid = `local_${key.replace(/[^a-z0-9]/g, '_') || 'user'}_${Date.now().toString(36)}`;
    const passwordHash = await hashCredential(key, input.password);
    const safeRole: UserRole = input.role === 'teacher' ? 'teacher' : 'student';

    accounts[key] = {
      uid,
      passwordHash,
      role: safeRole,
      displayName: cleanFullName.slice(0, 100),
      username: cleanUsername.slice(0, 60),
      createdAtMs: Date.now(),
    };

    try {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      // ignore storage quota errors
    }
    setAccountsVersion((v) => v + 1);

    const newProfile: UserProfile = {
      uid,
      displayName: cleanFullName.slice(0, 100),
      email: `@${cleanUsername.slice(0, 60)}`,
      role: safeRole,
      xp: 50,
      streakDays: 1,
      studyMinutes: 0,
      participationScore: 10,
      downloadedModules: [],
      favoriteBooks: [],
      isCloudSynced: false,
    };

    const fresh = createFreshOfflineSnapshot(uid, newProfile);
    try {
      localStorage.setItem(`${OFFLINE_USER_PREFIX}${uid}`, JSON.stringify(fresh));
    } catch {
      // ignore storage quota errors
    }

    // Notify Admin of the new registration
    const regAlert: RegistrationAlert = {
      id: makeSafeId('reg'),
      userUid: uid,
      displayName: cleanFullName.slice(0, 100),
      email: `@${cleanUsername.slice(0, 60)}`,
      role: safeRole,
      source: 'device',
      read: false,
      createdAtMs: Date.now(),
    };
    setLocalRegistrationAlerts((prev) => {
      const next = [regAlert, ...prev];
      saveLocalRegistrationAlerts(next);
      return next;
    });

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Hilaac New User Registration', {
          body: `${cleanFullName} (${safeRole}) created an account.`,
          icon: '/pwa-192x192.png',
        });
      } catch {
        // ignore Notification failure
      }
    }

    setProfile(newProfile);
    setTasks(fresh.tasks);
    setStudyLogs(fresh.studyLogs);
    setAnnotations(fresh.annotations);
    setFlashcards(fresh.flashcards);
    setStudyGroups(fresh.studyGroups);
    setGroupPosts(fresh.posts);
    setAnnouncements(fresh.announcements);
    setActiveTab('dashboard');
    setTabHistory(['dashboard']);
    return null;
  }

  async function handleSignInLocalAccount(
    rawUsername: string,
    password: string
  ): Promise<string | null> {
    setAuthError(null);
    const key = rawUsername.trim().toLowerCase().replace(/\s+/g, '_');
    if (key.length < 2) {
      return 'Please enter your registered username.';
    }
    if (password.length < 4) {
      return 'Password must be at least 4 characters.';
    }

    const accounts = getLocalAccounts();
    const existing = accounts[key];
    if (!existing) {
      return 'Account not found. First-time users must register first under Create Account.';
    }

    const passwordHash = await hashCredential(key, password);
    if (existing.passwordHash !== passwordHash) {
      return 'Incorrect password for this account.';
    }

    const safeRole: UserRole = existing.role === 'teacher' ? 'teacher' : 'student';
    const fallbackProfile: UserProfile = {
      uid: existing.uid,
      displayName: existing.displayName,
      email: `@${existing.username}`,
      role: safeRole,
      xp: 50,
      streakDays: 1,
      studyMinutes: 0,
      participationScore: 10,
      downloadedModules: [],
      favoriteBooks: [],
      isCloudSynced: false,
    };

    const snap = loadUserOfflineSnapshot(existing.uid, fallbackProfile);
    setProfile(snap.profile || fallbackProfile);
    setTasks(snap.tasks);
    setStudyLogs(snap.studyLogs);
    setAnnotations(snap.annotations);
    setFlashcards(snap.flashcards);
    setStudyGroups(snap.studyGroups);
    setGroupPosts(snap.posts);
    setAnnouncements(snap.announcements);
    setActiveTab('dashboard');
    setTabHistory(['dashboard']);
    return null;
  }

  async function handleResetLocalPassword(input: {
    username: string;
    fullName: string;
    newPassword: string;
  }): Promise<string | null> {
    const key = input.username.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanName = input.fullName.trim().toLowerCase();
    if (key.length < 2) {
      return language === 'so'
        ? 'Fadlan geli username-kaaga.'
        : 'Please enter your registered username.';
    }
    if (input.newPassword.length < 4) {
      return language === 'so'
        ? 'Password-ka cusub waa in uu noqdaa ugu yaraan 4 xaraf.'
        : 'New password must be at least 4 characters.';
    }

    const accounts = getLocalAccounts();
    const existing = accounts[key];
    if (!existing) {
      return language === 'so'
        ? 'Akoonkan lama helin. Fadlan hubi username-kaaga.'
        : 'Account not found. Please check your username.';
    }
    if (existing.displayName.trim().toLowerCase() !== cleanName) {
      return language === 'so'
        ? 'Magacaaga buuxa lama mid aha akoonkan.'
        : 'Full name does not match the registered account.';
    }

    const nextHash = await hashCredential(key, input.newPassword);
    accounts[key] = { ...existing, passwordHash: nextHash };
    try {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      // ignore storage quota errors
    }
    setAccountsVersion((v) => v + 1);
    return null;
  }

  async function handleUpdateDisplayName(nextName: string) {
    if (!profile) return;
    const clean = nextName.trim().slice(0, 100);
    if (!clean) return;
    if (firebaseUser && profile.isCloudSynced) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          displayName: clean,
          updatedAt: serverTimestamp(),
        });
        await setDoc(doc(db, 'leaderboard', firebaseUser.uid), {
          uid: firebaseUser.uid,
          displayName: clean,
          role: profile.role,
          xp: profile.xp,
          studyMinutes: profile.studyMinutes,
          streakDays: profile.streakDays,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    } else {
      const accounts = getLocalAccounts();
      const matchingKey = Object.keys(accounts).find((k) => accounts[k].uid === profile.uid);
      if (matchingKey) {
        accounts[matchingKey] = { ...accounts[matchingKey], displayName: clean };
        try {
          localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch {
          // ignore
        }
      }
      setProfile((prev) => (prev ? { ...prev, displayName: clean } : null));
    }
  }

  function handleSaveAdminMeta(nextMeta: AdminOwnerMeta) {
    if (!isAdminUser) return;
    setAdminMeta(nextMeta);
    try {
      localStorage.setItem(ADMIN_META_KEY, JSON.stringify(nextMeta));
    } catch {
      // ignore storage quota errors
    }
  }

  async function handleSignOut() {
    if (firebaseUser) {
      await signOut(auth);
    }
    setProfile(null);
    setTasks([]);
    setStudyLogs([]);
    setAnnotations([]);
    setShowProfileModal(false);
    setActiveTab('dashboard');
    setTabHistory(['dashboard']);
  }

  async function handleMarkAlertRead(alertId: string) {
    if (!isAdminUser) return;
    setLocalRegistrationAlerts((prev) => {
      const next = prev.map((a) => (a.id === alertId ? { ...a, read: true } : a));
      saveLocalRegistrationAlerts(next);
      return next;
    });

    const isCloudAlert = cloudRegistrationAlerts.some((a) => a.id === alertId);
    if (isCloudAlert && firebaseUser && firebaseUser.email === ADMIN_EMAIL) {
      try {
        await updateDoc(doc(db, 'registrationAlerts', alertId), { read: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `registrationAlerts/${alertId}`);
      }
    }
  }

  async function handleMarkAllAlertsRead() {
    if (!isAdminUser) return;
    setLocalRegistrationAlerts((prev) => {
      const next = prev.map((a) => ({ ...a, read: true }));
      saveLocalRegistrationAlerts(next);
      return next;
    });

    if (firebaseUser && firebaseUser.email === ADMIN_EMAIL) {
      const unreadCloud = cloudRegistrationAlerts.filter((a) => !a.read);
      for (const a of unreadCloud) {
        try {
          await updateDoc(doc(db, 'registrationAlerts', a.id), { read: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `registrationAlerts/${a.id}`);
        }
      }
    }
  }

  // Push notifications
  async function handleRequestNotifications() {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
  }

  function handleSendTestNotification() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Hilaac Health Center Alert', {
          body: 'Push alerts are active for your upcoming study deadlines.',
          icon: '/pwa-192x192.png',
        });
      } catch {
        setDeadlineBanner('Test alert triggered: Push alerts are active for upcoming deadlines.');
      }
    }
  }

  // Task CRUD
  async function handleAddTask(input: {
    title: string;
    subject: TaskSubject;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    notifyEnabled: boolean;
    notes: string;
  }) {
    if (!profile) return;
    const taskId = makeSafeId('task');
    const newTask: TaskItem = {
      id: taskId,
      userId: profile.uid,
      title: input.title.slice(0, 200),
      subject: input.subject,
      priority: input.priority,
      dueDate: input.dueDate.slice(0, 40),
      completed: false,
      notifyEnabled: input.notifyEnabled,
      notes: input.notes.slice(0, 1000),
      createdAtMs: Date.now(),
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'tasks', taskId), {
          id: taskId,
          userId: firebaseUser.uid,
          title: newTask.title,
          subject: newTask.subject,
          priority: newTask.priority,
          dueDate: newTask.dueDate,
          completed: false,
          notifyEnabled: newTask.notifyEnabled,
          notes: newTask.notes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}/tasks/${taskId}`);
      }
    } else {
      setTasks((prev) => [newTask, ...prev]);
    }
  }

  async function handleToggleTask(task: TaskItem) {
    if (!profile) return;
    const nextDone = !task.completed;
    if (firebaseUser && profile.isCloudSynced) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid, 'tasks', task.id), {
          completed: nextDone,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}/tasks/${task.id}`);
      }
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: nextDone } : t))
      );
    }
    if (nextDone) {
      await awardMetrics(15, 0, 5);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!profile) return;
    if (firebaseUser && profile.isCloudSynced) {
      try {
        await deleteDoc(doc(db, 'users', firebaseUser.uid, 'tasks', taskId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${firebaseUser.uid}/tasks/${taskId}`);
      }
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  }

  // Study logs & quizzes
  async function handleLogReadingSession(
    subject: AcademicSubject,
    moduleTitle: string,
    minutes: number
  ) {
    if (!profile) return;
    const mins = Math.max(1, Math.min(1440, Math.round(minutes)));
    const logId = makeSafeId('log');
    const newLog: StudyLog = {
      id: logId,
      userId: profile.uid,
      subject,
      moduleTitle: moduleTitle.slice(0, 160),
      minutesSpent: mins,
      quizScore: 0,
      participationType: 'reading',
      createdAtMs: Date.now(),
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'studyLogs', logId), {
          id: logId,
          userId: firebaseUser.uid,
          subject: newLog.subject,
          moduleTitle: newLog.moduleTitle,
          minutesSpent: newLog.minutesSpent,
          quizScore: 0,
          participationType: 'reading',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}/studyLogs/${logId}`);
      }
    } else {
      setStudyLogs((prev) => [newLog, ...prev]);
    }
    await awardMetrics(mins * 2, mins, 10);
  }

  async function handleLogQuizScore(
    subject: AcademicSubject,
    moduleTitle: string,
    scorePct: number,
    type: 'quiz' | 'case_study'
  ) {
    if (!profile) return;
    const safeScore = Math.max(0, Math.min(100, Math.round(scorePct)));
    const logId = makeSafeId('quiz');
    const newLog: StudyLog = {
      id: logId,
      userId: profile.uid,
      subject,
      moduleTitle: moduleTitle.slice(0, 160),
      minutesSpent: 5,
      quizScore: safeScore,
      participationType: type,
      createdAtMs: Date.now(),
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'studyLogs', logId), {
          id: logId,
          userId: firebaseUser.uid,
          subject: newLog.subject,
          moduleTitle: newLog.moduleTitle,
          minutesSpent: 5,
          quizScore: safeScore,
          participationType: type,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}/studyLogs/${logId}`);
      }
    } else {
      setStudyLogs((prev) => [newLog, ...prev]);
    }
    await awardMetrics(Math.max(10, Math.round(safeScore / 2)), 5, 15);
  }

  // Book annotations & offline downloads
  async function handleSaveAnnotation(input: {
    bookId: string;
    pageTitle: string;
    highlightText: string;
    note: string;
    color: ReaderAnnotation['color'];
  }) {
    if (!profile) return;
    const annId = makeSafeId('ann');
    const item: ReaderAnnotation = {
      id: annId,
      userId: profile.uid,
      bookId: input.bookId.slice(0, 128),
      pageTitle: input.pageTitle.slice(0, 160),
      highlightText: input.highlightText.slice(0, 500),
      note: input.note.slice(0, 1000),
      color: input.color,
      createdAtMs: Date.now(),
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'annotations', annId), {
          id: annId,
          userId: firebaseUser.uid,
          bookId: item.bookId,
          pageTitle: item.pageTitle,
          highlightText: item.highlightText,
          note: item.note,
          color: item.color === 'navy' ? 'sky' : item.color,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}/annotations/${annId}`);
      }
    } else {
      setAnnotations((prev) => [item, ...prev]);
    }
    await awardMetrics(10, 0, 5);
  }

  async function handleDeleteAnnotation(annId: string) {
    if (!profile) return;
    if (firebaseUser && profile.isCloudSynced) {
      try {
        await deleteDoc(doc(db, 'users', firebaseUser.uid, 'annotations', annId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${firebaseUser.uid}/annotations/${annId}`);
      }
    } else {
      setAnnotations((prev) => prev.filter((a) => a.id !== annId));
    }
  }

  async function handleToggleDownloadBook(bookId: string) {
    if (!profile) return;
    const exists = profile.downloadedModules.includes(bookId);
    const nextList = exists
      ? profile.downloadedModules.filter((id) => id !== bookId)
      : [...profile.downloadedModules, bookId].slice(0, 20);

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          downloadedModules: nextList,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    } else {
      setProfile((prev) => (prev ? { ...prev, downloadedModules: nextList } : null));
    }
  }

  async function handleToggleFavoriteBook(bookId: string) {
    if (!profile) return;
    const current = profile.favoriteBooks ?? [];
    const exists = current.includes(bookId);
    const nextList = exists
      ? current.filter((id) => id !== bookId)
      : [...current, bookId.slice(0, 128)].slice(0, 50);

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          favoriteBooks: nextList,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    } else {
      setProfile((prev) => (prev ? { ...prev, favoriteBooks: nextList } : null));
    }
  }

  // SM-2 Spaced Repetition Flashcards
  async function handleReviewCard(card: FlashcardItem, quality: 1 | 3 | 4 | 5) {
    if (!profile) return;
    let nextReps = card.repetitions;
    let nextInterval = card.intervalDays;
    let nextEase = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    nextEase = Math.max(1.3, Math.min(5.0, Number(nextEase.toFixed(2))));

    if (quality < 3) {
      nextReps = 0;
      nextInterval = 0;
    } else {
      nextReps += 1;
      if (nextReps === 1) nextInterval = 1;
      else if (nextReps === 2) nextInterval = 6;
      else nextInterval = Math.max(1, Math.round(card.intervalDays * nextEase));
    }

    const nextReviewDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid, 'flashcards', card.id), {
          intervalDays: nextInterval,
          easeFactor: nextEase,
          repetitions: nextReps,
          nextReviewAt: nextReviewDate,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}/flashcards/${card.id}`);
      }
    } else {
      setFlashcards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? {
                ...c,
                intervalDays: nextInterval,
                easeFactor: nextEase,
                repetitions: nextReps,
                nextReviewAt: nextReviewDate,
              }
            : c
        )
      );
    }
    await awardMetrics(10, 1, 5);
  }

  async function handleAddFlashcard(input: {
    subject: 'Pharmacology' | 'Anatomy & Physiology' | 'Microbiology' | 'Biochemistry';
    front: string;
    back: string;
  }) {
    if (!profile) return;
    const cardId = makeSafeId('fc');
    const card: FlashcardItem = {
      id: cardId,
      userId: profile.uid,
      subject: input.subject,
      front: input.front.slice(0, 300),
      back: input.back.slice(0, 800),
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewAt: new Date().toISOString(),
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'flashcards', cardId), {
          id: cardId,
          userId: firebaseUser.uid,
          subject: card.subject,
          front: card.front,
          back: card.back,
          intervalDays: 0,
          easeFactor: 2.5,
          repetitions: 0,
          nextReviewAt: card.nextReviewAt,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}/flashcards/${cardId}`);
      }
    } else {
      setFlashcards((prev) => [card, ...prev]);
    }
    await awardMetrics(10, 0, 5);
  }

  // Study Groups & Community
  async function ensureCloudGroupExists(grp: StudyGroup) {
    if (!firebaseUser) return;
    const grpRef = doc(db, 'studyGroups', grp.id);
    const existing = await getDoc(grpRef);
    if (!existing.exists()) {
      await setDoc(grpRef, {
        id: grp.id,
        name: grp.name,
        subject: grp.subject,
        description: grp.description,
        createdByUid: firebaseUser.uid,
        createdByName: grp.createdByName,
        memberCount: grp.memberCount,
        createdAt: serverTimestamp(),
      });
    }
  }

  async function handleCreateStudyGroup(input: {
    name: string;
    subject: AcademicSubject | 'General';
    description: string;
  }) {
    if (!profile) return;
    const groupId = makeSafeId('grp');
    const grp: StudyGroup = {
      id: groupId,
      name: input.name.slice(0, 120),
      subject: input.subject,
      description: input.description.slice(0, 400),
      createdByUid: profile.uid,
      createdByName: profile.displayName.slice(0, 100),
      memberCount: 1,
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await setDoc(doc(db, 'studyGroups', groupId), {
          ...grp,
          createdByUid: firebaseUser.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `studyGroups/${groupId}`);
      }
    } else {
      setStudyGroups((prev) => [grp, ...prev]);
    }
    setActiveGroupId(groupId);
    await awardMetrics(20, 0, 10);
  }

  async function handleJoinStudyGroup(grp: StudyGroup) {
    if (!profile) return;
    if (firebaseUser && profile.isCloudSynced) {
      try {
        await ensureCloudGroupExists(grp);
        await updateDoc(doc(db, 'studyGroups', grp.id), {
          memberCount: grp.memberCount + 1,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `studyGroups/${grp.id}`);
      }
    } else {
      setStudyGroups((prev) =>
        prev.map((g) => (g.id === grp.id ? { ...g, memberCount: g.memberCount + 1 } : g))
      );
    }
    await awardMetrics(10, 0, 5);
  }

  async function handleCreatePost(input: {
    groupId: string;
    content: string;
    attachmentTitle: string;
    attachmentSnippet: string;
  }) {
    if (!profile) return;
    const postId = makeSafeId('post');
    const post: StudyGroupPost = {
      id: postId,
      groupId: input.groupId,
      authorUid: profile.uid,
      authorName: profile.displayName.slice(0, 100),
      authorRole: profile.role,
      content: input.content.slice(0, 1500),
      attachmentTitle: input.attachmentTitle.slice(0, 160),
      attachmentSnippet: input.attachmentSnippet.slice(0, 600),
      createdAtMs: Date.now(),
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        const grp = studyGroups.find((g) => g.id === input.groupId);
        if (grp) {
          await ensureCloudGroupExists(grp);
        }
        await setDoc(doc(db, 'studyGroups', input.groupId, 'posts', postId), {
          id: postId,
          groupId: input.groupId,
          authorUid: firebaseUser.uid,
          authorName: post.authorName,
          authorRole: post.authorRole,
          content: post.content,
          attachmentTitle: post.attachmentTitle,
          attachmentSnippet: post.attachmentSnippet,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `studyGroups/${input.groupId}/posts/${postId}`
        );
      }
    } else {
      setGroupPosts((prev) => [post, ...prev]);
    }
    await awardMetrics(15, 0, 10);
  }

  // Teacher & Admin actions
  async function handlePublishAnnouncement(input: {
    title: string;
    subject: AcademicSubject | 'All';
    dueDate: string;
    body: string;
  }) {
    if (!profile) return;
    const annId = makeSafeId('ann');
    const item: Announcement = {
      id: annId,
      authorUid: profile.uid,
      authorName: profile.displayName.slice(0, 100),
      title: input.title.slice(0, 160),
      subject: input.subject,
      dueDate: input.dueDate.slice(0, 40),
      body: input.body.slice(0, 1500),
      createdAtMs: Date.now(),
    };

    if (firebaseUser && profile.isCloudSynced) {
      try {
        await setDoc(doc(db, 'announcements', annId), {
          id: annId,
          authorUid: firebaseUser.uid,
          authorName: item.authorName,
          title: item.title,
          subject: item.subject,
          dueDate: item.dueDate,
          body: item.body,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `announcements/${annId}`);
      }
    } else {
      setAnnouncements((prev) => [item, ...prev]);
    }
  }

  async function handleAddBook(input: {
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
  }): Promise<string | null> {
    if (!profile) return null;
    const bookId = makeSafeId('book');
    const paragraphs = input.chapterContent
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim().slice(0, 4000))
      .filter((p) => p.length > 0)
      .slice(0, 30);
    const safeParagraphs = paragraphs.length > 0 ? paragraphs : [input.summary.slice(0, 4000)];

    let savedLocalPdf = false;
    if (input.pdfBytes && input.pdfBytes.byteLength > 0) {
      savedLocalPdf = await savePdfBinary(bookId, input.pdfBytes);
    }

    const newBook: HealthBook = {
      id: bookId,
      authorUid: profile.uid,
      title: input.title.slice(0, 160),
      author: input.author.slice(0, 120),
      subject: input.subject,
      edition: input.edition.slice(0, 60),
      readMinutes: Math.max(1, Math.min(1000, Math.round(input.readMinutes))),
      summary: input.summary.slice(0, 500),
      coverColor: input.coverColor,
      coverImage: input.coverImage,
      pdfUrl: input.pdfUrl,
      hasLocalPdf: savedLocalPdf || Boolean(input.pdfUrl),
      chapters: [
        {
          id: 'ch_1',
          title: input.chapterTitle.slice(0, 160),
          paragraphs: safeParagraphs,
        },
      ],
      isCustom: true,
      createdAtMs: Date.now(),
    };

    // Always persist device/custom books locally so PDFs, cover images, and student device books work offline & immediately
    setDeviceBooks((prev) => {
      const next = [newBook, ...prev];
      saveDeviceBooks(next);
      return next;
    });

    // If cloud-synced as Admin/Teacher, publish metadata to Firestore library
    if (
      firebaseUser &&
      profile.isCloudSynced &&
      (profile.role === 'admin' || profile.role === 'teacher')
    ) {
      const firestoreCoverColor: 'navy' | 'emerald' | 'burgundy' | 'indigo' | 'teal' =
        newBook.coverColor === 'emerald'
          ? 'emerald'
          : newBook.coverColor === 'orange'
          ? 'burgundy'
          : newBook.coverColor === 'slate'
          ? 'indigo'
          : 'navy';
      try {
        await setDoc(doc(db, 'books', bookId), {
          id: bookId,
          authorUid: firebaseUser.uid,
          title: newBook.title,
          author: newBook.author,
          subject: newBook.subject,
          edition: newBook.edition,
          readMinutes: newBook.readMinutes,
          summary: newBook.summary,
          coverColor: firestoreCoverColor,
          chapters: newBook.chapters,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `books/${bookId}`);
      }
    }

    return bookId;
  }

  async function handleDeleteBook(bookId: string) {
    if (!profile) return;
    void deletePdfBinary(bookId);
    setDeviceBooks((prev) => {
      const next = prev.filter((b) => b.id !== bookId);
      saveDeviceBooks(next);
      return next;
    });

    if (
      firebaseUser &&
      profile.isCloudSynced &&
      cloudBooks.some((b) => b.id === bookId) &&
      (profile.role === 'admin' || profile.role === 'teacher')
    ) {
      try {
        await deleteDoc(doc(db, 'books', bookId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `books/${bookId}`);
      }
    }
  }

  async function handleUpdateUserRole(targetUid: string, nextRole: UserRole) {
    if (!isAdminUser) return;
    // Strict Single-Owner Rule: never grant 'admin' role to another user, and never demote the single owner
    if (nextRole === 'admin') return;
    const safeNextRole: 'student' | 'teacher' = nextRole === 'teacher' ? 'teacher' : 'student';

    const cloudMatch = allUsers.find((u) => u.uid === targetUid);
    if (cloudMatch && cloudMatch.email.toLowerCase() === ADMIN_EMAIL) return;
    if (profile && targetUid === profile.uid && profile.email.toLowerCase() === ADMIN_EMAIL) return;

    if (cloudMatch && firebaseUser && firebaseUser.email?.toLowerCase() === ADMIN_EMAIL) {
      try {
        await updateDoc(doc(db, 'users', targetUid), {
          role: safeNextRole,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
      }
      return;
    }

    const accounts = getLocalAccounts();
    const matchingKey = Object.keys(accounts).find((k) => accounts[k].uid === targetUid);
    if (matchingKey) {
      accounts[matchingKey] = { ...accounts[matchingKey], role: safeNextRole };
      try {
        localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
      } catch {
        // ignore storage quota errors
      }
      try {
        const rawSnap = localStorage.getItem(`${OFFLINE_USER_PREFIX}${targetUid}`);
        if (rawSnap) {
          const parsed = JSON.parse(rawSnap) as OfflineSnapshot;
          if (parsed.profile) {
            parsed.profile.role = safeNextRole;
            localStorage.setItem(`${OFFLINE_USER_PREFIX}${targetUid}`, JSON.stringify(parsed));
          }
        }
      } catch {
        // ignore snapshot parse errors
      }
      setAccountsVersion((v) => v + 1);
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F8FAFC] dark:bg-[#070E1D] text-[#10234B] dark:text-slate-300 text-sm font-semibold">
        <HilaacLogo size={44} inverted={isDark} />
        <span>{language === 'so' ? 'Fadlan sug...' : 'Loading Hilaac Healthcare Learning Platform...'}</span>
      </div>
    );
  }

  if (!profile) {
    const localAccounts = getLocalAccounts();
    const accountList = Object.values(localAccounts);
    const hasExistingAccounts = accountsVersion >= 0 && accountList.length > 0;
    const hasLocalAdmin = accountList.some((a) => a.role === 'admin');

    return (
      <LoginView
        hasExistingAccounts={hasExistingAccounts}
        hasLocalAdmin={hasLocalAdmin}
        onRegisterLocalAccount={handleRegisterLocalAccount}
        onSignInLocalAccount={handleSignInLocalAccount}
        onResetLocalPassword={handleResetLocalPassword}
        onGoogleLogin={handleGoogleLogin}
        authError={authError}
        isSigningIn={isSigningIn}
        isDark={isDark}
        onToggleDark={() => setIsDark((d) => !d)}
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'so' : 'en'))}
      />
    );
  }

  const isSo = language === 'so';

  const navItems: {
    key: AppNavTab;
    label: string;
    mobileLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'dashboard',
      label: isSo ? 'Hawlaha & Home' : 'Tasks & Home',
      mobileLabel: isSo ? 'Home' : 'Home',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
    },
    {
      key: 'modules',
      label: isSo ? 'Maadooyinka' : 'Medical Subjects',
      mobileLabel: isSo ? 'Casharro' : 'Subjects',
      icon: <GraduationCap className="w-4 h-4 shrink-0" />,
    },
    {
      key: 'reader',
      label: isSo ? 'Buugaagta Caafimaadka' : 'Health Books',
      mobileLabel: isSo ? 'Buugaag' : 'Books',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
    },
    {
      key: 'flashcards',
      label: isSo ? 'Kaararka Xusuusta' : 'Flashcards',
      mobileLabel: isSo ? 'Kaarar' : 'Cards',
      icon: <Layers className="w-4 h-4 shrink-0" />,
    },
    {
      key: 'community',
      label: isSo ? 'Macallinka AI & Kooxaha' : 'AI Tutor & Groups',
      mobileLabel: isSo ? 'AI Tutor' : 'AI Tutor',
      icon: <Bot className="w-4 h-4 shrink-0" />,
    },
  ];

  const desktopNavItems = isAdminUser
    ? [
        ...navItems,
        {
          key: 'admin' as const,
          label: unreadAlertsCount > 0 ? `Admin (${unreadAlertsCount})` : isSo ? 'Maamulka Admin' : 'Admin Panel',
          mobileLabel: 'Admin',
          icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
        },
      ]
    : navItems;

  const sidebarSubjects: AcademicSubject[] = [
    'Pharmacology',
    'Anatomy & Physiology',
    'Microbiology',
    'Biochemistry',
    'Clinical OPD',
  ];

  const latestUnreadAlert = allRegistrationAlerts.find((a) => !a.read);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#070E1D] text-[#10234B] dark:text-slate-100">
      {/* Desktop Navy Sidebar (lg+) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[258px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[#10234B] text-white border-r border-[#1E2E4D]">
        <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
          <HilaacLogo size={38} />
          <div className="min-w-0">
            <div className="font-display font-extrabold text-sm tracking-tight text-white truncate">
              HILAAC
            </div>
            <div className="text-[11px] font-medium text-slate-300 truncate">
              {isSo ? 'Waxbarashada Caafimaadka' : 'Healthcare Learning Platform'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <nav aria-label="Main Platform Navigation" className="space-y-1">
            {desktopNavItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigateToTab(item.key)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] text-[13px] font-bold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#079B62] text-white shadow-xs'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-90" />}
                </button>
              );
            })}
          </nav>

          {/* Direct Medical Subject Shortcuts */}
          <div className="pt-4 border-t border-white/10 space-y-1.5">
            <div className="px-3 text-[11px] font-bold text-slate-400">
              {isSo ? 'Maadooyinka Caafimaadka' : 'Core Medical Subjects'}
            </div>
            {sidebarSubjects.map((subj) => {
              const isCurrent = activeTab === 'modules' && activeSubject === subj;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => {
                    setActiveSubject(subj);
                    navigateToTab('modules');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-xs font-semibold transition-colors text-left ${
                    isCurrent
                      ? 'bg-white/15 text-[#34D399]'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <SubjectEmblemSvg subject={subj} size={22} />
                  <span className="truncate">{subj}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* User Profile Summary + Sign Out */}
        <div className="p-3 border-t border-white/10 space-y-2 bg-[#091734]/60">
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-[10px] hover:bg-white/10 transition-colors text-left ${
              isAdminUser ? 'border border-[#F59E0B]/40 bg-[#F59E0B]/10' : ''
            }`}
          >
            <div
              className={`w-9 h-9 rounded-[9px] bg-[#079B62] text-white font-display text-sm font-extrabold flex items-center justify-center shrink-0 ${
                isAdminUser ? 'ring-2 ring-[#F59E0B]' : ''
              }`}
            >
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{profile.displayName}</div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1.5 font-mono tabular-nums">
                <span className="capitalize font-sans">
                  {isAdminUser ? (isSo ? 'Maamulaha Guud' : 'Single Admin') : profile.role}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#F59E0B] font-bold">{profile.xp} XP</span>
              </div>
            </div>
          </button>

          <PWAInstallButton variant="sidebar" language={language} />

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[9px] border border-white/15 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>{isSo ? 'Ka Bax Akoonka' : 'Log Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Responsive Top Bar */}
        <header className="sticky top-0 z-30 h-[52px] lg:h-14 bg-white/95 dark:bg-[#0D172B]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E2E4D] px-3.5 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeTab !== 'dashboard' ? (
              <button
                type="button"
                onClick={handleGoBack}
                aria-label={isSo ? 'Dib u noqo' : 'Go back'}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-xs font-bold text-[#10234B] dark:text-white hover:border-[#079B62] transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-[#079B62]" />
                <span className="hidden sm:inline">{isSo ? 'Dib u noqo' : 'Back'}</span>
              </button>
            ) : (
              <div className="lg:hidden flex items-center gap-2 shrink-0">
                <HilaacLogo size={30} inverted={isDark} />
              </div>
            )}

            <div className="min-w-0">
              <span className="font-display font-extrabold text-sm sm:text-base text-[#10234B] dark:text-white truncate block">
                {activeTab === 'dashboard'
                  ? isSo
                    ? 'HILAAC · Bogga Hore'
                    : 'HILAAC · Tasks & Home'
                  : TAB_TITLES[language][activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton variant="compact" language={language} />

            {isAdminUser && (
              <button
                type="button"
                onClick={() => navigateToTab('admin')}
                aria-label="Open Admin Panel"
                className={`lg:hidden min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border text-xs font-bold whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-[#079B62] border-[#079B62] text-white'
                    : 'border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-[#10234B] dark:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
                {unreadAlertsCount > 0 && <span className="font-mono tabular-nums">{unreadAlertsCount}</span>}
              </button>
            )}

            <button
              type="button"
              onClick={() => setLanguage((l) => (l === 'en' ? 'so' : 'en'))}
              aria-label="Switch app language between Somali and English"
              className="min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-xs font-bold text-[#10234B] dark:text-white hover:border-[#079B62] transition-colors whitespace-nowrap"
            >
              <Languages className="w-3.5 h-3.5 text-[#079B62]" />
              <span>{language === 'en' ? 'EN / SO' : 'SO / EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-[#10234B] dark:text-slate-200 hover:border-[#079B62] transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              aria-label={
                isAdminUser
                  ? isSo
                    ? 'Fur Profile-ka Maamulaha'
                    : 'Open Admin Profile'
                  : isSo
                  ? 'Fur Xogta Ardayga'
                  : 'Open Student Profile'
              }
              className={`lg:hidden min-h-[38px] min-w-[38px] rounded-[8px] bg-[#10234B] text-white font-display text-xs font-extrabold flex items-center justify-center ${
                isAdminUser ? 'ring-2 ring-[#F59E0B]' : ''
              }`}
            >
              {profile.displayName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Contextual Status & Admin Banners */}
        {!isOnline && (
          <div className="bg-[#FFFBEB] dark:bg-amber-950/60 border-b border-[#F59E0B]/40 px-4 py-2 text-xs font-bold text-[#B45309] dark:text-amber-200 flex items-center justify-center gap-2 text-center">
            <WifiOff className="w-3.5 h-3.5 shrink-0 text-[#F59E0B]" />
            <span>
              {isSo
                ? 'Offline Mode — Hawlahaaga & buugaagta kaydsan waa diyaar.'
                : 'Offline Mode Active — Tasks, saved Health Books, and Flashcards remain available.'}
            </span>
          </div>
        )}

        {isAdminUser && unreadAlertsCount > 0 && latestUnreadAlert && (
          <div className="bg-[#10234B] border-b border-[#F59E0B]/60 px-4 py-2 text-xs font-bold text-white flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-[#F59E0B]" />
              {isSo ? 'Isticmaale Cusub:' : 'New User Registered:'} {latestUnreadAlert.displayName} ({latestUnreadAlert.role})
              {unreadAlertsCount > 1 ? ` +${unreadAlertsCount - 1}` : ''}
            </span>
            <button
              type="button"
              onClick={() => navigateToTab('admin')}
              className="px-2.5 py-0.5 rounded bg-[#079B62] hover:bg-[#058152] text-white text-[11px] font-bold"
            >
              {isSo ? 'Eeg Admin' : 'View in Admin'}
            </button>
            <button
              type="button"
              onClick={handleMarkAllAlertsRead}
              className="px-2.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold"
            >
              {isSo ? 'Qari' : 'Dismiss'}
            </button>
          </div>
        )}

        {deadlineBanner && (
          <div className="bg-[#FFFBEB] dark:bg-amber-950/40 border-b border-[#F59E0B]/40 px-4 py-2 text-xs font-bold text-[#B45309] dark:text-amber-200 text-center">
            {deadlineBanner}
          </div>
        )}

        {/* Persistent Active Study Session Bar (accurate across navigation & breaks) */}
        {activeStudySession && !pendingSessionSummary && (
          <div className="bg-[#10234B] text-white border-b border-[#079B62]/50 px-3.5 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                  activeStudySession.status === 'running'
                    ? 'bg-[#079B62] text-white'
                    : 'bg-[#F59E0B] text-[#10234B]'
                }`}
              >
                <Clock className="w-3 h-3" />
                {activeStudySession.status === 'running'
                  ? isSo
                    ? 'Socda'
                    : 'Studying'
                  : isSo
                  ? 'Hakis'
                  : 'Paused'}
              </span>
              <span className="font-mono text-sm font-extrabold tabular-nums text-[#FDE68A] shrink-0">
                {String(Math.floor(sessionElapsedSeconds / 60)).padStart(2, '0')}:
                {String(sessionElapsedSeconds % 60).padStart(2, '0')}
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate">
                {activeStudySession.moduleTitle}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {activeStudySession.status === 'running' ? (
                <button
                  type="button"
                  onClick={handlePauseStudySession}
                  className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#F59E0B] hover:bg-[#D97706] text-[#10234B] text-xs font-bold"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {isSo ? 'Haki' : 'Pause'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResumeStudySession}
                  className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isSo ? 'Sii Wad' : 'Resume'}
                </button>
              )}
              <button
                type="button"
                onClick={handleFinishStudySession}
                className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-white/15 hover:bg-white/25 text-white text-xs font-bold"
              >
                <Square className="w-3 h-3" />
                {isSo ? 'Dhammee' : 'Finish'}
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Container (extra bottom padding on mobile for fixed bottom nav) */}
        <main className="flex-1 w-full max-w-[1220px] mx-auto px-3.5 sm:px-6 py-4 sm:py-6 pb-20 lg:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardAndTasksView
              profile={profile}
              books={allBooks}
              tasks={tasks}
              studyLogs={studyLogs}
              flashcards={flashcards}
              announcements={announcements}
              isOnline={isOnline}
              language={language}
              notificationPermission={notificationPermission}
              onRequestNotifications={handleRequestNotifications}
              onSendTestNotification={handleSendTestNotification}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onToggleDownloadBook={handleToggleDownloadBook}
              onOpenModule={(subj) => {
                setActiveSubject(subj);
                navigateToTab('modules');
              }}
              onNavigateTab={navigateToTab}
            />
          )}

          {activeTab === 'modules' && (
            <SubjectModulesView
              activeSubject={activeSubject}
              onSelectSubject={setActiveSubject}
              studyLogs={studyLogs}
              language={language}
              activeStudySession={activeStudySession}
              sessionElapsedSeconds={sessionElapsedSeconds}
              onStartStudySession={handleStartStudySession}
              onPauseStudySession={handlePauseStudySession}
              onResumeStudySession={handleResumeStudySession}
              onFinishStudySession={handleFinishStudySession}
              onLogReadingSession={handleLogReadingSession}
              onLogQuizScore={handleLogQuizScore}
            />
          )}

          {activeTab === 'reader' && (
            <ReaderAndBooksView
              profile={profile}
              books={allBooks}
              annotations={annotations}
              language={language}
              onSaveAnnotation={handleSaveAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onToggleDownloadBook={handleToggleDownloadBook}
              onToggleFavoriteBook={handleToggleFavoriteBook}
              onAddDeviceBook={handleAddBook}
              onDeleteBook={handleDeleteBook}
              activeStudySession={activeStudySession}
              sessionElapsedSeconds={sessionElapsedSeconds}
              onStartStudySession={handleStartStudySession}
              onPauseStudySession={handlePauseStudySession}
              onResumeStudySession={handleResumeStudySession}
              onFinishStudySession={handleFinishStudySession}
            />
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView
              flashcards={flashcards}
              language={language}
              onReviewCard={handleReviewCard}
              onAddFlashcard={handleAddFlashcard}
            />
          )}

          {activeTab === 'community' && (
            <CommunityAndTutorView
              profile={profile}
              studyGroups={studyGroups}
              activeGroupId={activeGroupId}
              onSelectGroup={setActiveGroupId}
              groupPosts={groupPosts}
              leaderboard={leaderboard}
              isOnline={isOnline}
              language={language}
              onCreateStudyGroup={handleCreateStudyGroup}
              onJoinStudyGroup={handleJoinStudyGroup}
              onCreatePost={handleCreatePost}
            />
          )}

          {activeTab === 'admin' && isAdminUser && (
            <AdminTeacherPanelView
              profile={profile}
              allUsers={allUsers}
              monitoredUsers={monitoredUsers}
              adminMeta={adminMeta}
              announcements={announcements}
              books={allBooks}
              tasks={tasks}
              studyLogs={studyLogs}
              registrationAlerts={allRegistrationAlerts}
              language={language}
              onMarkAlertRead={handleMarkAlertRead}
              onMarkAllAlertsRead={handleMarkAllAlertsRead}
              onPublishAnnouncement={handlePublishAnnouncement}
              onAddBook={handleAddBook}
              onDeleteBook={handleDeleteBook}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateDisplayName={handleUpdateDisplayName}
              onUpdateAdminMeta={handleSaveAdminMeta}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (< lg, compact 56px height) */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 pb-safe bg-white/95 dark:bg-[#0D172B]/95 backdrop-blur-md border-t border-[#E2E8F0] dark:border-[#1E2E4D] grid grid-cols-5 items-center"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigateToTab(item.key)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors px-1 ${
                isActive
                  ? 'text-[#079B62]'
                  : 'text-[#475569] dark:text-slate-400 hover:text-[#10234B] dark:hover:text-white'
              }`}
            >
              <span className={isActive ? 'scale-105 transition-transform' : ''}>{item.icon}</span>
              <span className="truncate max-w-full">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Dedicated Admin Owner Profile Modal or Student Profile Modal */}
      {showProfileModal &&
        (isAdminUser ? (
          <AdminProfileModal
            profile={profile}
            adminMeta={adminMeta}
            monitoredUsersCount={monitoredUsers.length}
            unreadAlertsCount={unreadAlertsCount}
            booksCount={allBooks.length}
            announcementsCount={announcements.length}
            language={language}
            onClose={() => setShowProfileModal(false)}
            onUpdateDisplayName={handleUpdateDisplayName}
            onUpdateAdminMeta={handleSaveAdminMeta}
            onOpenAdminPanel={() => navigateToTab('admin')}
            onSignOut={handleSignOut}
          />
        ) : (
          <StudentProfileModal
            profile={profile}
            books={allBooks}
            tasks={tasks}
            studyLogs={studyLogs}
            language={language}
            onClose={() => setShowProfileModal(false)}
            onUpdateDisplayName={handleUpdateDisplayName}
            onSignOut={handleSignOut}
          />
        ))}

      {/* Study Session Summary Modal */}
      {pendingSessionSummary && (
        <StudySessionSummaryModal
          summary={pendingSessionSummary}
          language={language}
          onSaveSession={async (reflectionNote) => {
            const finalTitle = reflectionNote
              ? `${pendingSessionSummary.moduleTitle} — ${reflectionNote}`.slice(0, 160)
              : pendingSessionSummary.moduleTitle;
            await handleLogReadingSession(
              pendingSessionSummary.subject,
              finalTitle,
              pendingSessionSummary.loggedMinutes
            );
            setPendingSessionSummary(null);
            setActiveStudySession(null);
          }}
          onResumeSession={() => {
            setPendingSessionSummary(null);
            handleResumeStudySession();
          }}
          onDiscardSession={() => {
            setPendingSessionSummary(null);
            setActiveStudySession(null);
          }}
        />
      )}
    </div>
  );
}
