import React, { useState } from 'react';
import { Award, CheckCircle2, Clock, PauseCircle, Play, Sparkles, Trash2, X } from 'lucide-react';
import type { AppLanguage, CompletedStudySessionSummary } from '../types';

interface StudySessionSummaryModalProps {
  summary: CompletedStudySessionSummary;
  language?: AppLanguage;
  onSaveSession: (reflectionNote: string) => Promise<void>;
  onResumeSession: () => void;
  onDiscardSession: () => void;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export const StudySessionSummaryModal: React.FC<StudySessionSummaryModalProps> = ({
  summary,
  language = 'en',
  onSaveSession,
  onResumeSession,
  onDiscardSession,
}) => {
  const isSo = language === 'so';
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleConfirmSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSession(reflection.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#091734]/75 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-summary-title"
    >
      <div className="w-full max-w-md rounded-[18px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-2xl overflow-hidden">
        {/* Navy + Green + Orange Brand Header */}
        <div className="bg-[#10234B] text-white px-5 py-4 border-b border-[#1E2E4D] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[12px] bg-[#079B62] border-2 border-[#F59E0B] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#FDE68A]">
                <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                <span>{isSo ? 'Warbixinta Waxbarashada' : 'Study Session Complete'}</span>
              </div>
              <h2
                id="session-summary-title"
                className="font-display text-lg font-extrabold text-white truncate"
              >
                {summary.subject}
              </h2>
              <p className="text-xs text-slate-300 truncate">{summary.moduleTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResumeSession}
            aria-label={isSo ? 'Sii wad saacadda' : 'Resume timer'}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirmSave} className="p-5 space-y-4">
          {/* Accurate Duration & Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[12px] border border-[#079B62]/30 bg-[#ECFDF5]/60 dark:bg-emerald-950/30 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#079B62]">
                <Clock className="w-3.5 h-3.5" />
                <span>{isSo ? 'Waqtiga Waxbarashada' : 'Active Study Time'}</span>
              </div>
              <div className="mt-1 font-mono text-lg font-extrabold text-[#10234B] dark:text-white tabular-nums">
                {formatDuration(summary.activeSeconds)}
              </div>
              <div className="text-[11px] text-[#475569] dark:text-slate-400 font-semibold">
                {summary.loggedMinutes} {isSo ? 'daqiiqo la kaydinayo' : 'min to be logged'}
              </div>
            </div>

            <div className="rounded-[12px] border border-[#F59E0B]/40 bg-[#FFFBEB]/70 dark:bg-amber-950/30 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B45309] dark:text-[#F59E0B]">
                <Award className="w-3.5 h-3.5" />
                <span>{isSo ? 'Abaalmarinta XP' : 'Rewards Earned'}</span>
              </div>
              <div className="mt-1 font-mono text-lg font-extrabold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
                +{summary.xpEarned} XP
              </div>
              <div className="text-[11px] text-[#475569] dark:text-slate-400 font-semibold">
                +{summary.participationEarned} {isSo ? 'ka-qaybgal' : 'participation'}
              </div>
            </div>
          </div>

          {/* Break & Timestamp Accuracy Strip */}
          <div className="rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#475569] dark:text-slate-300">
              <PauseCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>
                {isSo ? 'Nasashooyinka:' : 'Breaks taken:'}{' '}
                <strong className="text-[#10234B] dark:text-white font-mono">
                  {summary.pauseCount}
                </strong>
                {summary.pausedSeconds > 0
                  ? ` (${formatDuration(summary.pausedSeconds)})`
                  : ''}
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#475569] dark:text-slate-400 tabular-nums">
              {new Date(summary.startedAtMs).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              →{' '}
              {new Date(summary.endedAtMs).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* Optional Study Note */}
          <div>
            <label
              htmlFor="study-session-reflection"
              className="block text-xs font-bold text-[#10234B] dark:text-slate-200 mb-1"
            >
              {isSo
                ? 'Qoraal Kooban oo Xusuus ah (Ikhtiyaari)'
                : 'Session Takeaway / Note (Optional)'}
            </label>
            <input
              id="study-session-reflection"
              type="text"
              maxLength={100}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={
                isSo
                  ? 'Tusaale: Dib u eegis Beta-blockers iyo lidka sunta...'
                  : 'e.g., Reviewed beta-blockers and antidotes...'
              }
              className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
            />
          </div>

          {/* Actions */}
          <div className="pt-1 flex flex-col gap-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#079B62] hover:bg-[#058152] text-white text-xs sm:text-sm font-bold disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving
                ? isSo
                  ? 'Kaydinaya...'
                  : 'Saving Session...'
                : isSo
                ? `Kaydi Casharka (+${summary.xpEarned} XP)`
                : `Save Session (+${summary.xpEarned} XP)`}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onResumeSession}
                className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62]"
              >
                <Play className="w-3.5 h-3.5 text-[#079B62]" />
                {isSo ? 'Sii Wad' : 'Resume Timer'}
              </button>
              <button
                type="button"
                onClick={onDiscardSession}
                className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-[#FECACA] dark:border-red-900 bg-[#FEF2F2] dark:bg-red-950/30 text-xs font-bold text-[#B91C1C] dark:text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isSo ? 'Tuur' : 'Discard'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
