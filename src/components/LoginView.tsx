import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Lock,
  Moon,
  Sun,
  User,
  UserPlus,
} from 'lucide-react';
import type { AppLanguage, UserRole } from '../types';
import { HilaacLogo } from './ClinicalSvgs';
import { DeveloperSection } from './DeveloperSection';
import { PWAInstallButton } from './PWAInstallButton';
import welcomeHeroImg from '../assets/images/welcome_health_hero_1795714670970.jpg';
import thumbStudy from '../assets/images/thumb_clinical_study_1795767004787.jpg';
import thumbBooks from '../assets/images/thumb_medical_books_1795767006210.jpg';
import thumbNotes from '../assets/images/thumb_ai_notes_1795767030204.jpg';

interface LoginViewProps {
  hasExistingAccounts: boolean;
  hasLocalAdmin: boolean;
  onRegisterLocalAccount: (input: {
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
  }) => Promise<string | null>;
  onSignInLocalAccount: (username: string, password: string) => Promise<string | null>;
  onResetLocalPassword: (input: {
    username: string;
    fullName: string;
    newPassword: string;
  }) => Promise<string | null>;
  onGoogleLogin: (role: 'student' | 'teacher', displayNameInput?: string) => Promise<void>;
  authError: string | null;
  isSigningIn: boolean;
  isDark: boolean;
  onToggleDark: () => void;
  language: AppLanguage;
  onToggleLanguage: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  hasExistingAccounts,
  hasLocalAdmin,
  onRegisterLocalAccount,
  onSignInLocalAccount,
  onResetLocalPassword,
  onGoogleLogin,
  authError,
  isSigningIn,
  isDark,
  onToggleDark,
  language,
  onToggleLanguage,
}) => {
  const isSo = language === 'so';
  const [authMode, setAuthMode] = useState<'register' | 'signin' | 'forgot'>(
    hasExistingAccounts ? 'signin' : 'register'
  );
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const registerRoles: { id: UserRole; label: string }[] = [
    { id: 'student', label: isSo ? 'Arday' : 'Student' },
    { id: 'teacher', label: isSo ? 'Macallin' : 'Teacher' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setSuccessNote(null);

    if (authMode === 'register') {
      if (password !== confirmPassword) {
        setLocalError(isSo ? 'Labada password isma laha.' : 'Passwords do not match.');
        return;
      }
      const err = await onRegisterLocalAccount({
        fullName,
        username,
        password,
        role: selectedRole,
      });
      if (err) {
        setLocalError(err);
      }
      return;
    }

    if (authMode === 'forgot') {
      if (password !== confirmPassword) {
        setLocalError(isSo ? 'Labada password isma laha.' : 'Passwords do not match.');
        return;
      }
      const err = await onResetLocalPassword({
        username,
        fullName,
        newPassword: password,
      });
      if (err) {
        setLocalError(err);
      } else {
        setSuccessNote(
          isSo
            ? 'Password-kaaga waa la cusboonaysiiyay. Hadda waad soo geli kartaa.'
            : 'Password updated. You can now sign in with your new password.'
        );
        setPassword('');
        setConfirmPassword('');
        setAuthMode('signin');
      }
      return;
    }

    const err = await onSignInLocalAccount(username, password);
    if (err) {
      setLocalError(err);
    }
  }

  const displayedError = localError || authError;

  const miniThumbs = [
    { img: thumbStudy, label: isSo ? 'Hawlaha & OPD' : 'Tasks & OPD' },
    { img: thumbBooks, label: isSo ? 'Buugaagta' : 'Health Books' },
    { img: thumbNotes, label: isSo ? 'Kaararka & AI' : 'Cards & AI' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#070E1D] text-[#10234B] dark:text-slate-100">
      {/* Clean 3-zone Top Header */}
      <header className="w-full bg-white dark:bg-[#0D172B] border-b border-[#E2E8F0] dark:border-[#1E2E4D]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <HilaacLogo size={34} />
            <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-[#10234B] dark:text-white whitespace-nowrap truncate">
              HILAAC
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton variant="compact" language={language} />
            <button
              type="button"
              onClick={onToggleLanguage}
              aria-label="Switch language between Somali and English"
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-xs font-bold text-[#10234B] dark:text-white hover:border-[#079B62] transition-colors whitespace-nowrap"
            >
              <Languages className="w-3.5 h-3.5 text-[#079B62]" />
              <span>{isSo ? 'SO / EN' : 'EN / SO'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62] transition-colors whitespace-nowrap"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-[#F59E0B]" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {isDark ? (isSo ? 'Iftiin' : 'Light') : isSo ? 'Madow' : 'Dark'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-3 sm:p-6">
        <div className="w-full max-w-5xl rounded-[18px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-[0_8px_30px_rgba(16,35,75,0.07)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Welcome Medical Hero Panel */}
          <section className="lg:col-span-6 bg-[#10234B] text-white p-5 sm:p-7 flex flex-col justify-between gap-5 border-b lg:border-b-0 lg:border-r border-[#1E2E4D]">
            <div className="space-y-4">
              <div className="aspect-[16/9] sm:aspect-[16/10] w-full overflow-hidden rounded-[12px] border border-white/15 bg-[#091734]">
                {!imgFailed ? (
                  <img
                    src={welcomeHeroImg}
                    alt={isSo ? 'Ardayda caafimaadka Hilaac' : 'Medical student studying at Hilaac Health Center'}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-[#091734]">
                    <HilaacLogo size={52} inverted />
                    <p className="mt-3 font-display text-sm font-bold text-white">
                      HILAAC · Healthcare Learning Platform
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F59E0B]">
                  {isSo ? 'Madasha Waxbarashada Caafimaadka' : 'Healthcare Learning Platform'}
                </div>
                <h1 className="font-display text-xl sm:text-[26px] font-extrabold leading-tight text-white text-balance">
                  {isSo ? 'Ku Soo Dhowow Hilaac Health Center' : 'Welcome to Hilaac Health Center'}
                </h1>
                <p className="text-xs sm:text-[13.5px] text-slate-200 leading-relaxed">
                  {isSo
                    ? 'Maamul hawlahaaga waxbarasho, casharrada daawooyinka, buugaagta caafimaadka, iyo Macallinka AI.'
                    : 'Organize your daily study tasks, clinical pharmacology, medical textbooks, and AI-guided revision in one place.'}
                </p>
                <p className="pt-1 text-xs font-bold text-[#34D399]">
                  {isSo
                    ? '“Baro Caafimaadka. Dhis Aqoonta. Badbaadi Nolosha.”'
                    : '“Learn Healthcare. Build Knowledge. Save Lives.”'}
                </p>
              </div>
            </div>

            {/* Clean Feature Thumbnails */}
            <div className="grid grid-cols-3 gap-2">
              {miniThumbs.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[10px] border border-white/15 bg-[#091734]/85 p-2 flex items-center gap-2"
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-[7px] object-cover shrink-0 border border-white/15"
                  />
                  <span className="text-[11px] font-bold text-slate-100 leading-tight">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Compact Authentication Form Panel */}
          <section className="lg:col-span-6 p-5 sm:p-7 flex flex-col justify-center">
            {authMode !== 'forgot' ? (
              <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-[#F1F5F9] dark:bg-[#13203C] mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLocalError(null);
                    setSuccessNote(null);
                  }}
                  className={`flex-1 min-h-[38px] py-2 px-3 rounded-[8px] text-xs font-bold transition-colors whitespace-nowrap ${
                    authMode === 'register'
                      ? 'bg-[#079B62] text-white shadow-xs'
                      : 'text-[#475569] dark:text-slate-300 hover:text-[#10234B] dark:hover:text-white'
                  }`}
                >
                  {isSo ? 'Is Diiwaan Geli' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setLocalError(null);
                    setSuccessNote(null);
                  }}
                  className={`flex-1 min-h-[38px] py-2 px-3 rounded-[8px] text-xs font-bold transition-colors whitespace-nowrap ${
                    authMode === 'signin'
                      ? 'bg-[#10234B] dark:bg-[#079B62] text-white shadow-xs'
                      : 'text-[#475569] dark:text-slate-300 hover:text-[#10234B] dark:hover:text-white'
                  }`}
                >
                  {isSo ? 'Soo Gal' : 'Sign In'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setLocalError(null);
                  setSuccessNote(null);
                }}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#10234B] dark:text-slate-200 hover:text-[#079B62] self-start"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#079B62]" />
                {isSo ? 'Ku Noqo Soo Galitaanka' : 'Back to Sign In'}
              </button>
            )}

            <div>
              <h2 className="font-display text-lg font-extrabold text-[#10234B] dark:text-white">
                {authMode === 'register'
                  ? isSo
                    ? 'Sameyso Akoon Cusub'
                    : 'Create Your Personal Account'
                  : authMode === 'forgot'
                  ? isSo
                    ? 'Dib u Deji Password-ka'
                    : 'Reset Account Password'
                  : isSo
                  ? 'Soo Gal Akoonkaaga'
                  : 'Sign In to Your Workspace'}
              </h2>
              <p className="mt-0.5 text-xs text-[#475569] dark:text-slate-400">
                {authMode === 'register'
                  ? isSo
                    ? 'Qof walba marka hore waa in uu is diiwaan geliyo.'
                    : 'First-time learners must register. Admin is notified of new accounts.'
                  : authMode === 'forgot'
                  ? isSo
                    ? 'Geli username-kaaga iyo magacaaga buuxa si aad password cusub u samaysato.'
                    : 'Verify your username and full name to set a new password.'
                  : isSo
                  ? 'Geli username-kaaga iyo password-ka.'
                  : 'Enter your registered username and password.'}
              </p>
            </div>

            {successNote && (
              <div className="mt-3 rounded-[9px] border border-[#079B62]/40 bg-[#ECFDF5] dark:bg-emerald-950/40 p-2.5 text-xs font-semibold text-[#079B62] dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successNote}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {authMode === 'register' && (
                <div>
                  <span className="block text-[11px] font-bold text-[#475569] dark:text-slate-400 mb-1">
                    {isSo ? 'Doorka Akoonka' : 'Account Role'}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[9px] bg-[#F1F5F9] dark:bg-[#13203C]">
                    {registerRoles.map((role) => {
                      const active = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.id)}
                          className={`py-1.5 px-2 rounded-[7px] text-xs font-bold transition-colors ${
                            active
                              ? 'bg-[#10234B] dark:bg-[#079B62] text-white'
                              : 'text-[#475569] dark:text-slate-300 hover:text-[#10234B] dark:hover:text-white'
                          }`}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#475569] dark:text-slate-400">
                    {isSo
                      ? 'Akoonkaaga waxaa loo diiwaangelinayaa Arday ama Macallin.'
                      : 'Register as a Student or Teacher to access your learning workspace.'}
                  </p>
                </div>
              )}

              {(authMode === 'register' || authMode === 'forgot') && (
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
                  >
                    {isSo ? 'Magacaaga Buuxa' : 'Full Name'}
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isSo ? 'Tusaale: Amina Warsame' : 'e.g., Amina Warsame'}
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-sm text-[#10234B] dark:text-white"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
                >
                  {isSo ? 'Magaca Isticmaalaha (Username)' : 'Username'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., amina_warsame"
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-9 pr-3 py-2 text-sm text-[#10234B] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-[#10234B] dark:text-slate-200"
                  >
                    {authMode === 'forgot'
                      ? isSo
                        ? 'Password Cusub'
                        : 'New Password'
                      : isSo
                      ? 'Password (Erayga Sirta ah)'
                      : 'Password'}
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setLocalError(null);
                        setSuccessNote(null);
                      }}
                      className="text-[11px] font-bold text-[#079B62] hover:underline"
                    >
                      {isSo ? 'Ma ilowday password-ka?' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSo ? 'Ugu yaraan 4 xaraf' : 'At least 4 characters'}
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-9 pr-11 py-2 text-sm text-[#10234B] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-[#10234B] dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {(authMode === 'register' || authMode === 'forgot') && (
                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
                  >
                    {isSo ? 'Ku Celi Password-ka' : 'Confirm Password'}
                  </label>
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={isSo ? 'Ku celi password-ka' : 'Repeat password'}
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-sm text-[#10234B] dark:text-white"
                  />
                </div>
              )}

              {authMode === 'forgot' && (
                <p className="text-[11px] text-[#475569] dark:text-slate-400 leading-relaxed">
                  {isSo
                    ? 'Haddii aad isticmaasho Google Sign-In, password-ka waxaa lagu maamulaa akoonkaaga Google.'
                    : 'Note: Google Cloud Sync accounts manage passwords directly through Google Account recovery.'}
                </p>
              )}

              {displayedError && (
                <div className="rounded-[9px] border border-[#FECACA] dark:border-red-900 bg-[#FEF2F2] dark:bg-red-950/50 p-2.5 text-xs font-medium text-[#B91C1C] dark:text-red-300">
                  {displayedError}
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-sm font-bold transition-colors"
              >
                {authMode === 'register' && <UserPlus className="w-4 h-4" />}
                {authMode === 'forgot' && <KeyRound className="w-4 h-4" />}
                {authMode === 'register'
                  ? isSo
                    ? 'Sameyso Akoonkaaga'
                    : 'Create Personal Account'
                  : authMode === 'forgot'
                  ? isSo
                    ? 'Cusboonaysii Password-ka'
                    : 'Update Password'
                  : isSo
                  ? 'Soo Gal'
                  : 'Sign In'}
              </button>
            </form>

            {authMode !== 'forgot' && (
              <>
                <div className="my-3.5 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                  <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#1E2E4D]" />
                  <span>{isSo ? 'AMA' : 'OR'}</span>
                  <div className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#1E2E4D]" />
                </div>

                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() =>
                    onGoogleLogin(
                      selectedRole === 'teacher' ? 'teacher' : 'student',
                      fullName.trim() || username.trim()
                    )
                  }
                  className="w-full min-h-[42px] py-2 px-4 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] hover:border-[#10234B] dark:hover:border-[#079B62] text-xs font-bold text-[#10234B] dark:text-slate-200 disabled:opacity-60 transition-colors"
                >
                  {isSigningIn
                    ? isSo
                      ? 'Waa la furayaa...'
                      : 'Signing in...'
                    : isSo
                    ? 'Ku Sii Wad Google (Cloud Sync)'
                    : 'Continue with Google (Cloud Sync)'}
                </button>
              </>
            )}
          </section>
        </div>

        <div className="w-full max-w-5xl">
          <DeveloperSection language={language} compact />
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] px-5 py-2.5 text-center text-xs text-[#475569] dark:text-slate-400">
        HILAAC HEALTH CENTER ·{' '}
        {isSo
          ? 'Baro Caafimaadka. Dhis Aqoonta. Badbaadi Nolosha.'
          : 'Learn Healthcare. Build Knowledge. Save Lives.'}
      </footer>
    </div>
  );
};
