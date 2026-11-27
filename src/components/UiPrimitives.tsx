import React, { useState } from 'react';
import {
  Award,
  BellRing,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  Megaphone,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import type {
  AdminOwnerMeta,
  AppLanguage,
  HealthBook,
  StudyLog,
  TaskItem,
  UserProfile,
} from '../types';

export const SectionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <section
    className={`rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-[0_1px_3px_rgba(16,35,75,0.05)] ${className}`}
  >
    {children}
  </section>
);

export const PageHeroHeader: React.FC<{
  thumbSrc: string;
  thumbAlt: string;
  kicker?: string;
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
}> = ({ thumbSrc, thumbAlt, kicker, title, subtitle, rightSlot }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <SectionCard className="px-4 sm:px-6 py-4 sm:py-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {!imgErr ? (
            <img
              src={thumbSrc}
              alt={thumbAlt}
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] object-cover border border-[#E2E8F0] dark:border-[#1E2E4D] shrink-0"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] bg-[#10234B] text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#079B62]" />
            </div>
          )}
          <div className="min-w-0">
            {kicker && (
              <div className="text-[11px] font-bold text-[#079B62] truncate">
                {kicker}
              </div>
            )}
            <h1 className="font-display text-lg sm:text-[22px] font-extrabold tracking-tight text-[#10234B] dark:text-white text-balance">
              {title}
            </h1>
            <p className="mt-0.5 text-xs sm:text-[13px] text-[#475569] dark:text-slate-400 leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </SectionCard>
  );
};

export const EmptyStateBox: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="py-10 px-4 text-center space-y-2.5">
    {icon && (
      <div className="w-10 h-10 rounded-[10px] bg-[#F1F5F9] dark:bg-[#13203C] text-[#079B62] flex items-center justify-center mx-auto">
        {icon}
      </div>
    )}
    <h3 className="font-display text-sm font-bold text-[#10234B] dark:text-white">
      {title}
    </h3>
    <p className="text-xs text-[#475569] dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-1 inline-flex items-center justify-center px-3.5 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#13203C] text-xs font-bold text-[#10234B] dark:text-white hover:border-[#079B62] transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

interface StudentProfileModalProps {
  profile: UserProfile;
  books: HealthBook[];
  tasks: TaskItem[];
  studyLogs: StudyLog[];
  language: AppLanguage;
  onClose: () => void;
  onUpdateDisplayName: (nextName: string) => Promise<void>;
  onSignOut?: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  profile,
  books,
  tasks,
  studyLogs,
  language,
  onClose,
  onUpdateDisplayName,
  onSignOut,
}) => {
  const isSo = language === 'so';
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalMinutes = studyLogs.reduce((acc, l) => acc + l.minutesSpent, 0);
  const favCount = (profile.favoriteBooks ?? []).length;
  const offlineCount = (profile.downloadedModules ?? []).length;
  const favoriteBookItems = books.filter((b) => (profile.favoriteBooks ?? []).includes(b.id));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim() || nameInput.trim() === profile.displayName) return;
    setSaving(true);
    try {
      await onUpdateDisplayName(nameInput.trim());
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#091734]/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-profile-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[18px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-2xl p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[12px] bg-[#10234B] text-white flex items-center justify-center font-display text-lg font-extrabold shrink-0">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#079B62]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="capitalize">{profile.role}</span>
                <span aria-hidden="true">·</span>
                <span>{profile.isCloudSynced ? (isSo ? 'Cloud Sync' : 'Cloud Synced') : isSo ? 'Qalabka' : 'Device Account'}</span>
              </div>
              <h2
                id="student-profile-title"
                className="font-display text-lg font-extrabold text-[#10234B] dark:text-white truncate"
              >
                {profile.displayName}
              </h2>
              <p className="text-xs text-[#475569] dark:text-slate-400 truncate">
                {profile.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isSo ? 'Xir' : 'Close profile'}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-[#10234B] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5 border-y border-[#E2E8F0] dark:border-[#1E2E4D]">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
              XP
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
              {profile.xp}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              <Flame className="w-3.5 h-3.5 text-[#079B62]" />
              {isSo ? 'Taxane' : 'Streak'}
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold text-[#079B62] tabular-nums">
              {profile.streakDays}d
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-[#10234B] dark:text-slate-300" />
              {isSo ? 'Waqti' : 'Study'}
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold text-[#10234B] dark:text-white tabular-nums">
              {totalMinutes}m
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#079B62]" />
              {isSo ? 'Hawlo' : 'Tasks'}
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold text-[#10234B] dark:text-white tabular-nums">
              {completedTasks}/{tasks.length}
            </div>
          </div>
        </div>

        {/* Update Display Name */}
        <form onSubmit={handleSave} className="space-y-2.5">
          <label
            htmlFor="profile-display-name"
            className="block text-xs font-bold text-[#10234B] dark:text-slate-200"
          >
            {isSo ? 'Magaca Muuqda' : 'Display Name'}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="profile-display-name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-9 pr-3 py-2 text-sm text-[#10234B] dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !nameInput.trim() || nameInput.trim() === profile.displayName}
              className="px-4 py-2 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {saving ? (isSo ? 'Kaydinaya...' : 'Saving...') : isSo ? 'Cusboonaysii' : 'Save Name'}
            </button>
          </div>
          {savedNotice && (
            <p className="text-xs font-semibold text-[#079B62]">
              {isSo ? 'Magaca waa la cusboonaysiiyay.' : 'Display name updated.'}
            </p>
          )}
        </form>

        {/* Saved Books Snapshot */}
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E2E4D]">
          <div className="flex items-center justify-between text-xs font-bold text-[#10234B] dark:text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#F59E0B]" />
              {isSo ? 'Buugaagtaada La Jecel Yahay' : 'Favorite & Offline Library'}
            </span>
            <span className="font-mono text-[#475569] dark:text-slate-400 tabular-nums">
              {favCount} {isSo ? 'jecel' : 'fav'} · {offlineCount} offline
            </span>
          </div>
          {favoriteBookItems.length === 0 ? (
            <p className="text-xs text-[#475569] dark:text-slate-400">
              {isSo
                ? 'Weli buug ma calaamadeysan. Fur Buugaagta si aad u calaamadeyso.'
                : 'No favorite textbooks marked yet. Tap the heart icon in Health Books.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {favoriteBookItems.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between text-xs py-1 border-b border-[#E2E8F0]/60 dark:border-[#1E2E4D] last:border-b-0"
                >
                  <span className="font-semibold text-[#10234B] dark:text-slate-200 truncate">
                    {b.title}
                  </span>
                  <span className="text-[11px] text-[#079B62] shrink-0 ml-2">{b.subject}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {onSignOut && (
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E4D] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#475569] dark:text-slate-300"
            >
              {isSo ? 'Xir' : 'Close'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="px-4 py-2 rounded-[9px] border border-[#FECACA] dark:border-red-900 bg-[#FEF2F2] dark:bg-red-950/40 text-xs font-bold text-[#B91C1C] dark:text-red-300"
            >
              {isSo ? 'Ka Bax Akoonka' : 'Log Out'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface AdminProfileModalProps {
  profile: UserProfile;
  adminMeta: AdminOwnerMeta;
  monitoredUsersCount: number;
  unreadAlertsCount: number;
  booksCount: number;
  announcementsCount: number;
  language: AppLanguage;
  onClose: () => void;
  onUpdateDisplayName: (nextName: string) => Promise<void>;
  onUpdateAdminMeta: (nextMeta: AdminOwnerMeta) => void;
  onOpenAdminPanel?: () => void;
  onSignOut?: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  profile,
  adminMeta,
  monitoredUsersCount,
  unreadAlertsCount,
  booksCount,
  announcementsCount,
  language,
  onClose,
  onUpdateDisplayName,
  onUpdateAdminMeta,
  onOpenAdminPanel,
  onSignOut,
}) => {
  const isSo = language === 'so';
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [titleInput, setTitleInput] = useState(adminMeta.adminTitle);
  const [orgInput, setOrgInput] = useState(adminMeta.organization);
  const [bioInput, setBioInput] = useState(adminMeta.bio);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  async function handleSaveAdminProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (nameInput.trim() && nameInput.trim() !== profile.displayName) {
        await onUpdateDisplayName(nameInput.trim());
      }
      onUpdateAdminMeta({
        adminTitle: titleInput.trim() || 'Platform Administrator',
        organization: orgInput.trim() || 'Hilaac Health Center',
        bio: bioInput.trim(),
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#091734]/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-profile-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[18px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dedicated Navy + Green + Gold Single-Owner Header */}
        <div className="bg-[#10234B] text-white px-5 py-4 border-b border-[#1E2E4D] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[12px] bg-[#079B62] border-2 border-[#F59E0B] text-white flex items-center justify-center font-display text-lg font-extrabold shrink-0">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#F59E0B]/20 border border-[#F59E0B]/50 text-[10px] font-extrabold uppercase tracking-wider text-[#FDE68A]">
                <ShieldCheck className="w-3 h-3 text-[#F59E0B]" />
                <span>{isSo ? 'Maamulka Sare · Admin' : 'Platform Administration'}</span>
              </div>
              <h2
                id="admin-profile-title"
                className="mt-1 font-display text-lg font-extrabold text-white truncate"
              >
                {profile.displayName}
              </h2>
              <p className="text-xs text-slate-300 truncate">
                {adminMeta.adminTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isSo ? 'Xir' : 'Close admin profile'}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Admin Oversight Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-[#E2E8F0] dark:border-[#1E2E4D]">
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
                <Users className="w-3.5 h-3.5 text-[#079B62]" />
                {isSo ? 'Isticmaalayaal' : 'Users'}
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-[#10234B] dark:text-white tabular-nums">
                {monitoredUsersCount}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
                <BellRing className="w-3.5 h-3.5 text-[#F59E0B]" />
                {isSo ? 'Ogeysiis Cusub' : 'Alerts'}
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
                {unreadAlertsCount}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
                <BookOpen className="w-3.5 h-3.5 text-[#079B62]" />
                {isSo ? 'Buugaag' : 'Books'}
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-[#079B62] tabular-nums">
                {booksCount}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#475569] dark:text-slate-400">
                <Megaphone className="w-3.5 h-3.5 text-[#10234B] dark:text-slate-300" />
                {isSo ? 'Fariimo' : 'Notices'}
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-[#10234B] dark:text-white tabular-nums">
                {announcementsCount}
              </div>
            </div>
          </div>

          {/* Dedicated Editable Admin Profile Form */}
          <form onSubmit={handleSaveAdminProfile} className="space-y-3">
            <div>
              <label
                htmlFor="admin-display-name"
                className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
              >
                {isSo ? 'Magaca Maamulaha' : 'Administrator Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-display-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-9 pr-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="admin-role-title"
                  className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
                >
                  {isSo ? 'Xilka Gaarka ah' : 'Official Admin Title'}
                </label>
                <input
                  id="admin-role-title"
                  type="text"
                  maxLength={80}
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-org"
                  className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
                >
                  {isSo ? 'Xarunta / Machadka' : 'Organization'}
                </label>
                <input
                  id="admin-org"
                  type="text"
                  maxLength={80}
                  value={orgInput}
                  onChange={(e) => setOrgInput(e.target.value)}
                  className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-bio"
                className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
              >
                {isSo ? 'Faahfaahinta Maamulaha' : 'Admin Bio / Responsibilities'}
              </label>
              <textarea
                id="admin-bio"
                rows={2}
                maxLength={240}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {savedNotice ? (
                <span className="text-xs font-semibold text-[#079B62]">
                  {isSo ? 'Profile-ka Maamulaha waa la kaydiyay.' : 'Admin profile updated.'}
                </span>
              ) : (
                <span className="text-[11px] text-[#475569] dark:text-slate-400">
                  {isSo ? 'Hal qof oo keliya ayaa maamula' : 'Exclusive single-admin access'}
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="min-h-[38px] px-4 py-2 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold disabled:opacity-50 transition-colors"
              >
                {saving
                  ? isSo
                    ? 'Kaydinaya...'
                    : 'Saving...'
                  : isSo
                  ? 'Kaydi Profile-ka Admin'
                  : 'Save Admin Profile'}
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2E4D] flex flex-wrap items-center justify-between gap-2">
            {onOpenAdminPanel ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminPanel();
                }}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-[#10234B] hover:bg-[#193366] text-white text-xs font-bold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
                {isSo ? 'Fur Maamulka Admin' : 'Open Admin Panel'}
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[38px] px-3.5 py-2 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#475569] dark:text-slate-300"
              >
                {isSo ? 'Xir' : 'Close'}
              </button>
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="min-h-[38px] px-3.5 py-2 rounded-[9px] border border-[#FECACA] dark:border-red-900 bg-[#FEF2F2] dark:bg-red-950/40 text-xs font-bold text-[#B91C1C] dark:text-red-300"
                >
                  {isSo ? 'Ka Bax Akoonka' : 'Log Out'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
