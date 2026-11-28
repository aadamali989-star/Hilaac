export type UserRole = 'student' | 'teacher' | 'admin';

export type AcademicSubject =
  | 'Pharmacology'
  | 'Anatomy & Physiology'
  | 'Microbiology'
  | 'Biochemistry'
  | 'Clinical OPD';

export type TaskSubject = AcademicSubject | 'Personal';

export type BookCoverColor = 'navy' | 'emerald' | 'slate' | 'orange' | 'burgundy' | 'indigo' | 'teal';

export interface HealthBookChapter {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface HealthBook {
  id: string;
  title: string;
  author: string;
  subject: string;
  edition: string;
  readMinutes: number;
  summary: string;
  coverImage?: string;
  pdfUrl?: string;
  hasLocalPdf?: boolean;
  coverColor: BookCoverColor;
  chapters: HealthBookChapter[];
  authorUid?: string;
  isCustom?: boolean;
  createdAtMs?: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  xp: number;
  streakDays: number;
  studyMinutes: number;
  participationScore: number;
  downloadedModules: string[];
  favoriteBooks: string[];
  isCloudSynced: boolean;
}

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  subject: TaskSubject;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  completed: boolean;
  notifyEnabled: boolean;
  notes: string;
  createdAtMs: number;
}

export interface StudyLog {
  id: string;
  userId: string;
  subject: AcademicSubject;
  moduleTitle: string;
  minutesSpent: number;
  quizScore: number;
  participationType: 'reading' | 'quiz' | 'flashcards' | 'case_study' | 'group_share';
  createdAtMs: number;
}

export interface ReaderAnnotation {
  id: string;
  userId: string;
  bookId: string;
  pageTitle: string;
  highlightText: string;
  note: string;
  color: 'amber' | 'emerald' | 'navy' | 'sky' | 'rose';
  createdAtMs: number;
}

export interface FlashcardItem {
  id: string;
  userId: string;
  subject: 'Pharmacology' | 'Anatomy & Physiology' | 'Microbiology' | 'Biochemistry';
  front: string;
  back: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  nextReviewAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  subject: AcademicSubject | 'General';
  description: string;
  createdByUid: string;
  createdByName: string;
  memberCount: number;
}

export interface StudyGroupPost {
  id: string;
  groupId: string;
  authorUid: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  attachmentTitle: string;
  attachmentSnippet: string;
  createdAtMs: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  role: UserRole;
  xp: number;
  studyMinutes: number;
  streakDays: number;
}

export type AppLanguage = 'en' | 'so';

export interface Announcement {
  id: string;
  authorUid: string;
  authorName: string;
  title: string;
  subject: AcademicSubject | 'All';
  dueDate: string;
  body: string;
  createdAtMs: number;
}

export interface RegistrationAlert {
  id: string;
  userUid: string;
  displayName: string;
  email: string;
  role: UserRole;
  source: 'google' | 'device';
  read: boolean;
  createdAtMs: number;
}

export interface MonitoredUserSummary {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  source: 'google' | 'device';
  xp: number;
  streakDays: number;
  studyMinutes: number;
  participationScore: number;
  completedTasks: number;
  totalTasks: number;
  sessionsCount: number;
  joinedAtMs?: number;
}

export interface AdminOwnerMeta {
  adminTitle: string;
  organization: string;
  bio: string;
}

export interface ActiveStudySession {
  status: 'running' | 'paused';
  subject: AcademicSubject;
  moduleTitle: string;
  accumulatedMs: number;
  lastStartedAtMs: number | null;
  startedAtMs: number;
  pauseCount: number;
  totalPausedMs: number;
  lastPausedAtMs: number | null;
}

export interface CompletedStudySessionSummary {
  subject: AcademicSubject;
  moduleTitle: string;
  activeSeconds: number;
  pausedSeconds: number;
  loggedMinutes: number;
  pauseCount: number;
  xpEarned: number;
  participationEarned: number;
  startedAtMs: number;
  endedAtMs: number;
}

export type AppNavTab =
  | 'dashboard'
  | 'modules'
  | 'reader'
  | 'flashcards'
  | 'community'
  | 'admin';
