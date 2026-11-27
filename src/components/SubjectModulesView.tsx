import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  Pause,
  Pill,
  Play,
  Search,
  Square,
  Stethoscope,
} from 'lucide-react';
import { academicModulesData } from '../data/academicData';
import {
  caseStudies,
  opdEntries,
  quizQuestions,
  symptomSystems,
  top209Medications,
  treatmentProtocols,
  visualPharmacologyModules,
} from '../data/clinicalData';
import type { AcademicSubject, ActiveStudySession, AppLanguage, StudyLog } from '../types';
import { MedSvgIcon, OrganSvgIcon, SubjectEmblemSvg } from './ClinicalSvgs';
import { EmptyStateBox, SectionCard } from './UiPrimitives';
import thumbPharm from '../assets/images/thumb_pharmacology_kit_1795767006640.jpg';
import thumbStudy from '../assets/images/thumb_clinical_study_1795767004787.jpg';

interface SubjectModulesViewProps {
  activeSubject: AcademicSubject;
  onSelectSubject: (subject: AcademicSubject) => void;
  studyLogs: StudyLog[];
  language?: AppLanguage;
  activeStudySession: ActiveStudySession | null;
  sessionElapsedSeconds: number;
  onStartStudySession: (subject: AcademicSubject, moduleTitle: string) => void;
  onPauseStudySession: () => void;
  onResumeStudySession: () => void;
  onFinishStudySession: () => void;
  onLogReadingSession: (subject: AcademicSubject, moduleTitle: string, minutes: number) => Promise<void>;
  onLogQuizScore: (
    subject: AcademicSubject,
    moduleTitle: string,
    scorePct: number,
    type: 'quiz' | 'case_study'
  ) => Promise<void>;
}

const SUBJECT_BANNERS: Record<
  AcademicSubject,
  { enTitle: string; soTitle: string; enDesc: string; soDesc: string }
> = {
  Pharmacology: {
    enTitle: 'Pharmacology — Medications & Drug Classes',
    soTitle: 'Farmashiyaha — Daawooyinka & Qaybaha Daawooyinka',
    enDesc:
      'Medications, drug classes, mechanisms of action, target organs, safety/antidotes, lecture notes, and the #1–#209 formulary.',
    soDesc:
      'Daawooyinka, habka ay u shaqeeyaan (MOA), xubnaha ay saameeyaan, badbaadada/lidka sunta, casharro, iyo liiska #1–#209.',
  },
  'Anatomy & Physiology': {
    enTitle: 'Anatomy & Physiology — Systems & Hemodynamics',
    soTitle: 'Anatomy & Physiology — Hab-dhisyada Jidhka',
    enDesc:
      'Lecture notes, organ transport mechanisms, cardiac & renal physiology, and self-assessment quizzes.',
    soDesc:
      'Casharro faahfaahsan, shaqada wadnaha iyo kelyaha, gaadiidka unugyada, iyo imtixaanno tijaabo ah.',
  },
  Microbiology: {
    enTitle: 'Microbiology — Pathogens & Antimicrobials',
    soTitle: 'Microbiology — Jeermiska & Daawooyinka Jeermiska',
    enDesc:
      'Bacteriology, Mycobacteria (TB), Malaria, Dengue, enteric viruses, diagnostic pearls, and quizzes.',
    soDesc:
      'Bakteeriyada, Qaaxada (TB), Duumada, fayrasyada, baaritaannada muhiimka ah, iyo imtixaanno.',
  },
  Biochemistry: {
    enTitle: 'Biochemistry — Bioenergetics & Clinical Panels',
    soTitle: 'Biochemistry — Tamarta Unugga & Kiimikada Caafimaadka',
    enDesc:
      'Glycolysis, TCA cycle, enzyme kinetics, glutathione detoxification, ABG balance, and quizzes.',
    soDesc:
      'Glycolysis, wareegga TCA, enzymes, nadiifinta sunta beerka, dheelitirka ABG, iyo imtixaanno.',
  },
  'Clinical OPD': {
    enTitle: 'Clinical OPD — Protocols, 49 Diseases & #01–#100 Guide',
    soTitle: 'Clinical OPD — Habraacyada, 49 Cudur & Tilmaamaha #01–#100',
    enDesc:
      'Clinical protocols, 7 organ systems, #01–#100 OPD quick-diagnosis clues with Self-Test mode, and cases.',
    soDesc:
      '8 habraac daaweyn, 7 hab-dhis (49 cudur), #01–#100 tilmaamaha degdegga ah ee OPD oo leh Self-Test, iyo kiisas.',
  },
};

export const SubjectModulesView: React.FC<SubjectModulesViewProps> = ({
  activeSubject,
  onSelectSubject,
  studyLogs,
  language = 'en',
  activeStudySession,
  sessionElapsedSeconds,
  onStartStudySession,
  onPauseStudySession,
  onResumeStudySession,
  onFinishStudySession,
  onLogReadingSession,
  onLogQuizScore,
}) => {
  const isSo = language === 'so';
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const [pharmSubView, setPharmSubView] = useState<'visual_30' | 'top_209' | 'lectures' | 'quiz'>('visual_30');
  const [moduleSubView, setModuleSubView] = useState<'lectures' | 'quiz'>('lectures');

  const [drugSearch, setDrugSearch] = useState('');
  const [drugClassFilter, setDrugClassFilter] = useState('All');
  const [safetyFilter, setSafetyFilter] = useState<'ALL' | 'ANTIDOTE' | 'HIGH_ALERT' | 'MONITORING'>('ALL');
  const [med209Search, setMed209Search] = useState('');

  const [opdSubView, setOpdSubView] = useState<'protocols' | 'systems' | 'opd100' | 'quiz' | 'cases'>('protocols');
  const [opdSearch, setOpdSearch] = useState('');
  const [opdCatFilter, setOpdCatFilter] = useState('All');
  const [selfTestMode, setSelfTestMode] = useState(false);
  const [revealedOpd, setRevealedOpd] = useState<Record<string, boolean>>({});

  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [caseAnswers, setCaseAnswers] = useState<Record<number, number>>({});

  const currentAcademicSpec = useMemo(
    () => academicModulesData.find((m) => m.id === activeSubject) ?? null,
    [activeSubject]
  );

  const subjectMinutesMap = useMemo(() => {
    const map: Record<string, number> = {};
    studyLogs.forEach((l) => {
      map[l.subject] = (map[l.subject] ?? 0) + l.minutesSpent;
    });
    return map;
  }, [studyLogs]);

  const subjectMinutes = subjectMinutesMap[activeSubject] ?? 0;

  const drugClasses = useMemo(
    () => ['All', ...Array.from(new Set(visualPharmacologyModules.map((m) => m.drugClass)))],
    []
  );

  const filteredVisualPharm = useMemo(() => {
    const q = drugSearch.trim().toLowerCase();
    return visualPharmacologyModules.filter((m) => {
      const matchClass = drugClassFilter === 'All' || m.drugClass === drugClassFilter;
      const matchSafety = safetyFilter === 'ALL' || m.tags.includes(safetyFilter);
      const matchText =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.moaFlow.toLowerCase().includes(q) ||
        m.examples.some((ex) => ex.toLowerCase().includes(q)) ||
        m.safety.some((s) => s.toLowerCase().includes(q));
      return matchClass && matchSafety && matchText;
    });
  }, [drugSearch, drugClassFilter, safetyFilter]);

  const filteredTop209 = useMemo(() => {
    const q = med209Search.trim().toLowerCase();
    if (!q) return top209Medications;
    return top209Medications.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.cond.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q) ||
        String(m.num).includes(q)
    );
  }, [med209Search]);

  const opdCategories = useMemo(
    () => ['All', ...Array.from(new Set(opdEntries.map((e) => e.cat)))],
    []
  );

  const filteredOpd100 = useMemo(() => {
    const q = opdSearch.trim().toLowerCase();
    return opdEntries.filter((entry) => {
      const matchCat = opdCatFilter === 'All' || entry.cat === opdCatFilter;
      const matchQuery =
        !q ||
        entry.num.includes(q) ||
        entry.clues.toLowerCase().includes(q) ||
        entry.dx.toLowerCase().includes(q) ||
        entry.cat.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [opdSearch, opdCatFilter]);

  const banner = SUBJECT_BANNERS[activeSubject];
  const displaySeconds = activeStudySession ? sessionElapsedSeconds : 0;
  const mm = String(Math.floor(displaySeconds / 60)).padStart(2, '0');
  const ss = String(displaySeconds % 60).padStart(2, '0');

  async function handleQuickLog(minutes: number) {
    await onLogReadingSession(activeSubject, `${activeSubject} Focused Cycle`, minutes);
    setStatusNote(
      isSo
        ? `Waxaa la kaydiyay ${minutes} daqiiqo oo wareeg waxbarasho ah (${activeSubject}).`
        : `Logged ${minutes} min retention cycle to ${activeSubject}.`
    );
    setTimeout(() => setStatusNote(null), 3000);
  }

  async function submitSubjectQuiz(
    questions: { q: string; opts: string[]; ans: number; why: string }[],
    prefix: string
  ) {
    let correctCount = 0;
    questions.forEach((item, idx) => {
      if (quizAnswers[`${prefix}-${idx}`] === item.ans) {
        correctCount += 1;
      }
    });
    const pct = Math.round((correctCount / Math.max(1, questions.length)) * 100);
    await onLogQuizScore(activeSubject, `${activeSubject} Module Assessment`, pct, 'quiz');
    setStatusNote(
      isSo
        ? `Natiijada imtixaanka waa la kaydiyay: ${correctCount}/${questions.length} (${pct}%).`
        : `Quiz score recorded: ${correctCount}/${questions.length} (${pct}%).`
    );
    setTimeout(() => setStatusNote(null), 3500);
  }

  const subjectCards: { id: AcademicSubject; enHint: string; soHint: string }[] = [
    { id: 'Pharmacology', enHint: '30 Visual · 209 Meds', soHint: '30 Muuqaal · 209 Daawo' },
    { id: 'Anatomy & Physiology', enHint: 'Lectures & Quiz', soHint: 'Casharro & Imtixaan' },
    { id: 'Microbiology', enHint: 'Pathogens & Quiz', soHint: 'Jeermis & Imtixaan' },
    { id: 'Biochemistry', enHint: 'Metabolism & Quiz', soHint: 'Kiimiko & Imtixaan' },
    { id: 'Clinical OPD', enHint: 'Protocols & 100 OPD', soHint: 'Habraacyo & 100 OPD' },
  ];

  return (
    <div className="space-y-5">
      {/* 5-Subject Switcher with Medical Emblems & Progress */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {subjectCards.map((sc) => {
          const isCurrent = activeSubject === sc.id;
          const spec = academicModulesData.find((m) => m.id === sc.id);
          const mins = subjectMinutesMap[sc.id] ?? 0;
          const target = spec?.targetMinutes ?? 45;
          const pct = Math.min(100, Math.round((mins / target) * 100));

          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => onSelectSubject(sc.id)}
              className={`text-left p-3 rounded-[12px] border transition-colors flex flex-col justify-between gap-2 min-h-[86px] ${
                isCurrent
                  ? 'bg-[#10234B] border-[#10234B] dark:bg-[#079B62] dark:border-[#079B62] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0D172B] border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-white hover:border-[#079B62]'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <SubjectEmblemSvg subject={sc.id} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold leading-tight truncate">{sc.id}</div>
                  <div
                    className={`text-[11px] mt-0.5 truncate ${
                      isCurrent ? 'text-[#FDE68A] dark:text-emerald-100' : 'text-[#475569] dark:text-slate-400'
                    }`}
                  >
                    {isSo ? sc.soHint : sc.enHint}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div
                  className={`flex items-center justify-between text-[10px] font-mono tabular-nums ${
                    isCurrent ? 'text-slate-200' : 'text-[#475569] dark:text-slate-400'
                  }`}
                >
                  <span>{mins}/{target}m</span>
                  <span>{pct}%</span>
                </div>
                <div
                  className={`h-1.5 w-full rounded-full overflow-hidden ${
                    isCurrent ? 'bg-white/20' : 'bg-[#E2E8F0] dark:bg-[#13203C]'
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${isCurrent ? 'bg-[#F59E0B]' : 'bg-[#079B62]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Section Banner Card + Reading Timer */}
      <SectionCard className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={activeSubject === 'Pharmacology' ? thumbPharm : thumbStudy}
              alt={activeSubject}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] object-cover border border-[#E2E8F0] dark:border-[#1E2E4D] shrink-0"
            />
            <div className="space-y-0.5 min-w-0">
              <div className="text-[11px] font-bold text-[#079B62]">
                {isSo ? 'Maadada Caafimaadka' : 'Clinical Curriculum'}
              </div>
              <h1 className="font-display text-lg sm:text-[22px] font-extrabold text-[#10234B] dark:text-white tracking-tight text-balance">
                {isSo ? banner.soTitle : banner.enTitle}
              </h1>
              <p className="text-xs sm:text-[13px] text-[#475569] dark:text-slate-400">
                {isSo ? banner.soDesc : banner.enDesc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-[#079B62]" />
              <span className="font-mono font-bold text-[#10234B] dark:text-white tabular-nums">
                {subjectMinutes}m
              </span>
            </div>
            <span className="text-[#E2E8F0] dark:text-[#1E2E4D]" aria-hidden="true">
              |
            </span>
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
                onClick={() => onStartStudySession(activeSubject, `${activeSubject} Study Session`)}
                className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold whitespace-nowrap"
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
                    className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#F59E0B] hover:bg-[#D97706] text-[#10234B] text-xs font-bold whitespace-nowrap"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    {isSo ? 'Haki' : 'Pause'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onResumeStudySession}
                    className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isSo ? 'Sii Wad' : 'Resume'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onFinishStudySession}
                  className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#10234B] hover:bg-[#091734] text-white text-xs font-bold whitespace-nowrap"
                >
                  <Square className="w-3.5 h-3.5" />
                  {isSo ? 'Dhammee' : 'Finish'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => handleQuickLog(15)}
              className="min-h-[34px] px-2.5 py-1 rounded-[7px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200 bg-white dark:bg-[#0D172B] text-xs font-bold hover:border-[#079B62] whitespace-nowrap"
            >
              +15m
            </button>
          </div>
        </div>
      </SectionCard>

      {statusNote && (
        <div
          role="status"
          className="rounded-[10px] border border-[#079B62]/40 bg-[#ECFDF5] dark:bg-emerald-950/50 px-4 py-2.5 text-xs font-bold text-[#079B62] dark:text-emerald-300"
        >
          {statusNote}
        </div>
      )}

      {/* PHARMACOLOGY */}
      {activeSubject === 'Pharmacology' && currentAcademicSpec && (
        <div className="space-y-5">
          <SectionCard className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              {(
                [
                  {
                    id: 'visual_30',
                    label: isSo ? '30 Qaybood oo Muuqaal ah' : '30 Visual Drug Modules',
                  },
                  {
                    id: 'top_209',
                    label: isSo ? '#1–#209 Daawooyinka Muhiimka ah' : '#1–#209 Top Medications',
                  },
                  {
                    id: 'lectures',
                    label: isSo ? 'Casharrada Qoraalka' : 'Lecture Notes',
                  },
                  {
                    id: 'quiz',
                    label: isSo ? 'Imtixaanka Farmashiyaha' : 'Pharmacology Quiz',
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPharmSubView(tab.id)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    pharmSubView === tab.id
                      ? 'bg-[#079B62] text-white'
                      : 'bg-[#F8FAFC] dark:bg-[#13203C] border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200 hover:border-[#079B62]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-[#475569] dark:text-slate-400 tabular-nums shrink-0">
              {isSo ? '30 Kaar Muuqaal · 209 Daawo' : '30 Visual Cards · 209 Entries'}
            </span>
          </SectionCard>

          {pharmSubView === 'visual_30' && (
            <div className="space-y-5">
              <SectionCard className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={drugSearch}
                      onChange={(e) => setDrugSearch(e.target.value)}
                      placeholder={
                        isSo
                          ? 'Raadi daawo, koox daawo, MOA, ama lidka sunta...'
                          : 'Search medication, drug class, MOA, or antidote...'
                      }
                      className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-9 pr-3 py-2 text-[13px] text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
                    />
                  </div>
                  <select
                    value={safetyFilter}
                    onChange={(e) =>
                      setSafetyFilter(e.target.value as 'ALL' | 'ANTIDOTE' | 'HIGH_ALERT' | 'MONITORING')
                    }
                    aria-label={isSo ? 'Shaandhada badbaadada' : 'Filter by safety tag'}
                    className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-bold text-[#10234B] dark:text-white"
                  >
                    <option value="ALL">{isSo ? 'Dhammaan Badbaadada' : 'All Safety Filters'}</option>
                    <option value="ANTIDOTE">{isSo ? 'Lidka Sunta (Antidotes)' : 'Antidotes'}</option>
                    <option value="HIGH_ALERT">{isSo ? 'Digniin Sare (High-Alert)' : 'High-Alert Drugs'}</option>
                    <option value="MONITORING">{isSo ? 'La Socodka Shaybaadhka' : 'Lab / Vital Monitoring'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <span className="text-xs font-extrabold text-[#10234B] dark:text-slate-300 mr-1 shrink-0">
                    {isSo ? 'Kooxda:' : 'Drug Class:'}
                  </span>
                  {drugClasses.map((dc) => (
                    <button
                      key={dc}
                      type="button"
                      onClick={() => setDrugClassFilter(dc)}
                      className={`min-h-[34px] px-3 py-1 rounded-[7px] text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                        drugClassFilter === dc
                          ? 'bg-[#10234B] border-[#10234B] dark:bg-[#079B62] dark:border-[#079B62] text-white'
                          : 'bg-[#F8FAFC] dark:bg-[#13203C] border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-300 hover:border-[#079B62]'
                      }`}
                    >
                      {dc === 'All' && isSo ? 'Dhammaan' : dc}
                    </button>
                  ))}
                </div>
              </SectionCard>

              <div className="flex items-center justify-between border-b-2 border-[#E2E8F0] dark:border-[#1E2E4D] pb-2">
                <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                  {isSo ? 'Kaararka Muuqaalka Farmashiyaha' : 'Visual Pharmacology Modules'}
                </h2>
                <span className="text-xs font-bold text-[#475569] dark:text-slate-400 tabular-nums">
                  {filteredVisualPharm.length} / {visualPharmacologyModules.length}{' '}
                  {isSo ? 'qaybood' : 'modules'}
                </span>
              </div>

              {filteredVisualPharm.length === 0 ? (
                <SectionCard>
                  <EmptyStateBox
                    icon={<Pill className="w-5 h-5" />}
                    title={isSo ? 'Daawo lagama helin raadintan' : 'No pharmacology modules matched'}
                    description={
                      isSo
                        ? 'Nadiifi ereyga raadinta ama dib u celi shaandhada kooxda daawada.'
                        : 'Try clearing your search text or resetting the drug class and safety filters.'
                    }
                    actionLabel={isSo ? 'Nadiifi Shaandhada' : 'Reset Filters'}
                    onAction={() => {
                      setDrugSearch('');
                      setDrugClassFilter('All');
                      setSafetyFilter('ALL');
                    }}
                  />
                </SectionCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVisualPharm.map((mod) => (
                    <article
                      key={mod.id}
                      className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)] flex flex-col"
                    >
                      <div className="bg-[#10234B] text-white px-4 py-3 text-center">
                        <h3 className="font-display text-[17px] font-extrabold tracking-tight">
                          {mod.title}
                        </h3>
                        <div className="text-[11px] font-bold text-[#34D399] mt-0.5">
                          {mod.subtitle}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2" aria-hidden="true">
                          <span className="h-[2px] w-16 bg-[#F59E0B]" />
                          <span className="text-[10px] font-bold text-[#F59E0B]">MOA</span>
                          <span className="h-[2px] w-16 bg-[#F59E0B]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#13203C] border-b border-[#E2E8F0] dark:border-[#1E2E4D]">
                        <div className="flex flex-col items-center text-center gap-1">
                          <MedSvgIcon type={mod.medSvg} />
                          <span className="text-[10px] font-extrabold text-[#10234B] dark:text-slate-200">
                            {mod.drugClass}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#079B62]" />
                        <div className="flex flex-col items-center text-center gap-1">
                          <OrganSvgIcon organ={mod.organSvg} />
                          <span className="text-[10px] font-extrabold text-[#10234B] dark:text-slate-200">
                            {mod.organLabel}
                          </span>
                        </div>
                      </div>

                      <div className="mx-3.5 mt-3 mb-1 rounded-[8px] border border-[#10234B]/20 dark:border-[#1E2E4D] bg-[#F1F5F9] dark:bg-[#13203C] px-3 py-2 text-xs font-bold text-[#10234B] dark:text-slate-100">
                        {mod.moaFlow}
                      </div>

                      <div className="p-3.5 space-y-2 flex-1 text-xs">
                        <div className="rounded-[8px] border border-[#10234B]/20 dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2">
                          <div className="text-[11px] font-extrabold text-[#10234B] dark:text-slate-200 mb-1">
                            {isSo ? 'Tusaalooyinka Daawooyinka' : 'Examples'}
                          </div>
                          <ul className="list-disc pl-4 space-y-0.5 text-[#0F172A] dark:text-slate-200">
                            {mod.examples.map((ex, i) => (
                              <li key={i}>{ex}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-[8px] border border-[#079B62]/30 dark:border-emerald-900/60 bg-[#ECFDF5] dark:bg-emerald-950/30 px-3 py-2">
                          <div className="text-[11px] font-extrabold text-[#079B62] dark:text-emerald-300 mb-1">
                            {isSo ? 'Saameynta Caafimaad' : 'Clinical Effects'}
                          </div>
                          <ul className="list-disc pl-4 space-y-0.5 text-[#0F172A] dark:text-slate-200">
                            {mod.effects.map((ef, i) => (
                              <li key={i}>{ef}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-[8px] border border-[#F59E0B]/40 dark:border-amber-900/60 bg-[#FFFBEB] dark:bg-amber-950/30 px-3 py-2">
                          <div className="text-[11px] font-extrabold text-[#B45309] dark:text-[#F59E0B] mb-1">
                            {isSo ? 'La Socodka Shaybaadhka & Kalkaaliyaha' : 'Nursing & Lab Monitoring'}
                          </div>
                          <ul className="list-disc pl-4 space-y-0.5 text-[#0F172A] dark:text-slate-200">
                            {mod.monitoring.map((mn, i) => (
                              <li key={i}>{mn}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-[8px] border border-[#FECACA] dark:border-red-900/60 bg-[#FEF2F2] dark:bg-red-950/30 px-3 py-2">
                          <div className="text-[11px] font-extrabold text-[#B91C1C] dark:text-red-300 mb-1">
                            {isSo ? 'Badbaadada & Lidka Sunta' : 'Safety & Antidote'}
                          </div>
                          <ul className="list-disc pl-4 space-y-0.5 text-[#0F172A] dark:text-slate-200">
                            {mod.safety.map((sf, i) => (
                              <li key={i}>{sf}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {pharmSubView === 'top_209' && (
            <div className="space-y-4">
              <SectionCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                    {isSo
                      ? 'Liiska #1–#209 Daawooyinka Muhiimka ah'
                      : 'Top #1–#209 Essential Medications Formulary'}
                  </h2>
                  <p className="text-xs text-[#475569] dark:text-slate-400">
                    {isSo
                      ? 'Ka raadi magaca daawada, xaaladda lagu qaato, ama digniinaha.'
                      : 'Search generic drug names, conditions, or key clinical precautions.'}
                  </p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={med209Search}
                    onChange={(e) => setMed209Search(e.target.value)}
                    placeholder={isSo ? 'Shaandhee daawooyinka #1–#209...' : 'Filter #1–#209 medications...'}
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-9 pr-3 py-2 text-xs text-[#10234B] dark:text-white"
                  />
                </div>
              </SectionCard>

              {filteredTop209.length === 0 ? (
                <SectionCard>
                  <EmptyStateBox
                    icon={<Pill className="w-5 h-5" />}
                    title={isSo ? 'Daawo lagama helin' : 'No medications matched'}
                    description={
                      isSo
                        ? 'Raadi magac kale ama nadiifi sanduuqa raadinta.'
                        : 'Try another generic name, condition, or clear the search input.'
                    }
                    actionLabel={isSo ? 'Muuji Dhammaan' : 'Show All 209'}
                    onAction={() => setMed209Search('')}
                  />
                </SectionCard>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {filteredTop209.map((med) => (
                    <article
                      key={med.num}
                      className="rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] p-3 shadow-[0_1px_2px_rgba(16,35,75,0.04)]"
                    >
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-[#079B62]">
                        <span className="font-mono tabular-nums text-[#B45309] dark:text-[#F59E0B]">
                          #{med.num}
                        </span>
                        <span className="text-[#475569] dark:text-slate-400 truncate max-w-[140px]">
                          {med.cond}
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-extrabold text-[#10234B] dark:text-white">
                        {med.name}
                      </h3>
                      <p className="mt-1 text-[11px] text-[#475569] dark:text-slate-400 leading-snug">
                        {med.note}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {pharmSubView === 'lectures' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {currentAcademicSpec.lectureNotes.map((lec) => (
                <article
                  key={lec.id}
                  className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)]"
                >
                  <div className="bg-[#10234B] text-white px-5 py-3">
                    <h3 className="font-display text-base font-extrabold">{lec.title}</h3>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="rounded-[9px] border border-[#079B62]/30 bg-[#ECFDF5] dark:bg-emerald-950/30 p-3 text-xs font-bold text-[#079B62] dark:text-emerald-300">
                      {isSo ? 'Qodobka Muhiimka ah:' : 'Key Takeaway:'} {lec.keyTakeaway}
                    </div>
                    <ul className="space-y-2 text-sm text-[#10234B] dark:text-slate-300 list-disc pl-5">
                      {lec.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                    <div className="rounded-[9px] border border-[#F59E0B]/40 bg-[#FFFBEB] dark:bg-amber-950/30 p-3 text-xs text-[#92400E] dark:text-amber-200">
                      <strong className="text-[#B45309] dark:text-[#F59E0B]">
                        {isSo ? 'Talo Caafimaad:' : 'Clinical Pearl:'}
                      </strong>{' '}
                      {lec.clinicalPearl}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {pharmSubView === 'quiz' && (
            <QuizBlock
              title={isSo ? 'Imtixaanka Farmashiyaha' : 'Pharmacology Module Assessment'}
              questions={currentAcademicSpec.quiz}
              prefix="pharm"
              language={language}
              answers={quizAnswers}
              onSelect={(idx, optIdx) =>
                setQuizAnswers((prev) => ({ ...prev, [`pharm-${idx}`]: optIdx }))
              }
              onSubmit={() => submitSubjectQuiz(currentAcademicSpec.quiz, 'pharm')}
            />
          )}
        </div>
      )}

      {/* ANATOMY & PHYSIOLOGY, MICROBIOLOGY, BIOCHEMISTRY */}
      {activeSubject !== 'Pharmacology' && activeSubject !== 'Clinical OPD' && currentAcademicSpec && (
        <div className="space-y-5">
          <SectionCard className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setModuleSubView('lectures')}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-colors ${
                  moduleSubView === 'lectures'
                    ? 'bg-[#079B62] text-white'
                    : 'bg-[#F8FAFC] dark:bg-[#13203C] border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200'
                }`}
              >
                {isSo ? 'Casharrada Qoraalka' : 'Lecture Notes'}
              </button>
              <button
                type="button"
                onClick={() => setModuleSubView('quiz')}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-colors ${
                  moduleSubView === 'quiz'
                    ? 'bg-[#079B62] text-white'
                    : 'bg-[#F8FAFC] dark:bg-[#13203C] border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200'
                }`}
              >
                {isSo ? 'Imtixaanka Maadada' : 'Module Quiz'}
              </button>
            </div>
            <span className="text-xs font-semibold text-[#475569] dark:text-slate-400">
              {currentAcademicSpec.lectureNotes.length} {isSo ? 'Cashar' : 'Lectures'} ·{' '}
              {currentAcademicSpec.quiz.length} {isSo ? 'Su’aalood' : 'Quiz Questions'}
            </span>
          </SectionCard>

          {moduleSubView === 'lectures' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {currentAcademicSpec.lectureNotes.map((lec) => (
                <article
                  key={lec.id}
                  className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)]"
                >
                  <div className="bg-[#10234B] text-white px-5 py-3">
                    <h3 className="font-display text-base font-extrabold">{lec.title}</h3>
                  </div>
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="rounded-[9px] border border-[#079B62]/30 bg-[#ECFDF5] dark:bg-emerald-950/30 p-3 text-xs font-bold text-[#079B62] dark:text-emerald-300">
                      {isSo ? 'Qodobka Muhiimka ah:' : 'Key Takeaway:'} {lec.keyTakeaway}
                    </div>
                    <ul className="space-y-2 text-sm text-[#10234B] dark:text-slate-300 list-disc pl-5">
                      {lec.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                    <div className="rounded-[9px] border border-[#F59E0B]/40 bg-[#FFFBEB] dark:bg-amber-950/30 p-3 text-xs text-[#92400E] dark:text-amber-200">
                      <strong className="text-[#B45309] dark:text-[#F59E0B]">
                        {isSo ? 'Talo Caafimaad:' : 'Clinical Pearl:'}
                      </strong>{' '}
                      {lec.clinicalPearl}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <QuizBlock
              title={
                isSo
                  ? `Imtixaanka ${currentAcademicSpec.id}`
                  : `${currentAcademicSpec.id} Assessment`
              }
              questions={currentAcademicSpec.quiz}
              prefix={currentAcademicSpec.id}
              language={language}
              answers={quizAnswers}
              onSelect={(idx, optIdx) =>
                setQuizAnswers((prev) => ({ ...prev, [`${currentAcademicSpec.id}-${idx}`]: optIdx }))
              }
              onSubmit={() => submitSubjectQuiz(currentAcademicSpec.quiz, currentAcademicSpec.id)}
            />
          )}
        </div>
      )}

      {/* CLINICAL OPD */}
      {activeSubject === 'Clinical OPD' && (
        <div className="space-y-5">
          <SectionCard className="p-3.5 sm:p-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'protocols', label: isSo ? '8 Habraac Daaweyn' : '8 Treatment Protocols' },
                { id: 'systems', label: isSo ? '7 Hab-dhis (49 Cudur)' : '7 Organ Systems (49 Diseases)' },
                { id: 'opd100', label: isSo ? '#01–#100 Tilmaamaha OPD' : '#01–#100 OPD Guide' },
                { id: 'quiz', label: isSo ? 'Imtixaanka OPD' : 'Clinical Quiz' },
                { id: 'cases', label: isSo ? 'Kiisaska Bukaanada' : 'Case Studies' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOpdSubView(tab.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-[8px] text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  opdSubView === tab.id
                    ? 'bg-[#079B62] text-white'
                    : 'bg-[#F8FAFC] dark:bg-[#13203C] border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </SectionCard>

          {opdSubView === 'protocols' && (
            <div className="grid grid-cols-1 gap-5">
              {treatmentProtocols.map((prot, idx) => (
                <article
                  key={idx}
                  className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)]"
                >
                  <div className="bg-[#10234B] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-base font-extrabold">{prot.title}</h3>
                    <span className="text-xs font-bold text-[#F59E0B]">{prot.badge}</span>
                  </div>
                  <div className="p-4 sm:p-5 space-y-4">
                    <p className="text-sm text-[#10234B] dark:text-slate-300">{prot.summary}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {prot.sections.map((sec, sIdx) => (
                        <div
                          key={sIdx}
                          className="rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] p-3.5"
                        >
                          <div className="font-extrabold text-[#10234B] dark:text-white mb-1.5">
                            {sec.heading}
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[#0F172A] dark:text-slate-300">
                            {sec.items.map((it, i) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {prot.table.rows.length > 0 && (
                      <div className="overflow-x-auto rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D]">
                        <table className="w-full text-left border-collapse text-xs min-w-[420px]">
                          <thead className="bg-[#F1F5F9] dark:bg-[#13203C] text-[#10234B] dark:text-slate-200">
                            <tr>
                              {prot.table.headers.map((h, i) => (
                                <th key={i} className="py-2 px-3 font-extrabold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E2E4D]">
                            {prot.table.rows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="py-2 px-3 text-[#10234B] dark:text-slate-300">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="rounded-[9px] border border-[#FECACA] dark:border-red-900 bg-[#FEF2F2] dark:bg-red-950/40 p-3 text-xs text-[#B91C1C] dark:text-red-300">
                      <strong>{isSo ? 'Calaamadaha Khatarta:' : 'Red Flags & Escalation:'}</strong>{' '}
                      {prot.redFlags}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {opdSubView === 'systems' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {symptomSystems.map((sys, idx) => (
                <article
                  key={idx}
                  className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)]"
                >
                  <div className="bg-[#10234B] text-white px-5 py-3 flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-extrabold">{sys.system}</h3>
                    <div className="bg-white rounded-md p-1">
                      <OrganSvgIcon organ={sys.organ} />
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 space-y-2 text-xs">
                    {sys.diseases.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        className="border-b border-[#E2E8F0]/70 dark:border-[#1E2E4D] pb-2 last:border-b-0 last:pb-0"
                      >
                        <span className="font-extrabold text-[#10234B] dark:text-[#34D399]">
                          {d.name}:{' '}
                        </span>
                        <span className="text-[#475569] dark:text-slate-300">{d.line}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {opdSubView === 'opd100' && (
            <SectionCard className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#475569] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={opdSearch}
                    onChange={(e) => setOpdSearch(e.target.value)}
                    placeholder={
                      isSo
                        ? 'Raadi #01–#100 calaamadaha ama cudurka...'
                        : 'Search #01–#100 clues, symptoms, or diagnosis...'
                    }
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] pl-9 pr-3 py-2 text-xs text-[#10234B] dark:text-white"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={opdCatFilter}
                    onChange={(e) => setOpdCatFilter(e.target.value)}
                    aria-label={isSo ? 'Shaandhee qaybta OPD' : 'Filter OPD category'}
                    className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-bold text-[#10234B] dark:text-white"
                  >
                    {opdCategories.map((c) => (
                      <option key={c} value={c}>
                        {c === 'All' && isSo ? 'Dhammaan' : c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfTestMode(!selfTestMode);
                      setRevealedOpd({});
                    }}
                    className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-xs font-bold border transition-colors ${
                      selfTestMode
                        ? 'bg-[#079B62] text-white border-[#079B62]'
                        : 'border-[#10234B] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200'
                    }`}
                  >
                    {selfTestMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {selfTestMode
                      ? isSo
                        ? 'Self-Test Wuu Shidan Yahay'
                        : 'Self-Test Active'
                      : isSo
                      ? 'Shid Self-Test'
                      : 'Enable Self-Test'}
                  </button>
                </div>
              </div>

              {filteredOpd100.length === 0 ? (
                <EmptyStateBox
                  icon={<Stethoscope className="w-5 h-5" />}
                  title={isSo ? 'Qodob OPD ah lagama helin' : 'No OPD entries matched'}
                  description={
                    isSo
                      ? 'Nadiifi raadinta ama dooro Dhammaan qaybaha.'
                      : 'Clear your search query or select All categories.'
                  }
                  actionLabel={isSo ? 'Muuji Dhammaan' : 'Show All Entries'}
                  onAction={() => {
                    setOpdSearch('');
                    setOpdCatFilter('All');
                  }}
                />
              ) : (
                <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E2E4D]">
                  {filteredOpd100.map((item) => {
                    const hidden = selfTestMode && !revealedOpd[item.num];
                    return (
                      <div
                        key={item.num}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="text-[#475569] dark:text-slate-400">
                            <span className="font-mono font-extrabold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
                              #{item.num}
                            </span>{' '}
                            · {item.cat}
                          </div>
                          <div className="text-[#10234B] dark:text-slate-200">{item.clues}</div>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          {hidden ? (
                            <button
                              type="button"
                              onClick={() => setRevealedOpd((prev) => ({ ...prev, [item.num]: true }))}
                              className="min-h-[34px] px-2.5 py-1 rounded-[7px] border border-[#10234B] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200 font-bold hover:border-[#079B62]"
                            >
                              {isSo ? 'Muuji Cudurkan' : 'Reveal Diagnosis'}
                            </button>
                          ) : (
                            <span className="font-extrabold text-[#079B62]">{item.dx}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          )}

          {opdSubView === 'quiz' && (
            <QuizBlock
              title={isSo ? 'Imtixaanka Aqoonta OPD' : 'Clinical Knowledge Assessment'}
              questions={quizQuestions}
              prefix="opd"
              language={language}
              answers={quizAnswers}
              onSelect={(idx, optIdx) =>
                setQuizAnswers((prev) => ({ ...prev, [`opd-${idx}`]: optIdx }))
              }
              onSubmit={() => submitSubjectQuiz(quizQuestions, 'opd')}
            />
          )}

          {opdSubView === 'cases' && (
            <div className="space-y-5">
              {caseStudies.map((cs, idx) => {
                const chosen = caseAnswers[idx];
                const answered = chosen !== undefined;
                return (
                  <article
                    key={idx}
                    className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)]"
                  >
                    <div className="bg-[#10234B] text-white px-5 py-3">
                      <h3 className="font-display text-base font-extrabold">{cs.title}</h3>
                    </div>
                    <div className="p-4 sm:p-5 space-y-3">
                      <p className="text-sm text-[#10234B] dark:text-slate-300 leading-relaxed">
                        {cs.vignette}
                      </p>
                      <p className="text-xs font-extrabold text-[#079B62]">{cs.prompt}</p>
                      <div className="space-y-2">
                        {cs.choices.map((choice, cIdx) => {
                          const isCorrect = cIdx === cs.correct;
                          const isPicked = chosen === cIdx;
                          return (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={async () => {
                                setCaseAnswers((prev) => ({ ...prev, [idx]: cIdx }));
                                await onLogQuizScore(
                                  'Clinical OPD',
                                  cs.title,
                                  isCorrect ? 100 : 50,
                                  'case_study'
                                );
                              }}
                              className={`w-full min-h-[40px] text-left px-3.5 py-2.5 rounded-[9px] border text-xs font-bold transition-colors ${
                                !answered
                                  ? 'border-[#E2E8F0] dark:border-[#1E2E4D] hover:border-[#079B62] text-[#10234B] dark:text-slate-200'
                                  : isCorrect
                                  ? 'border-[#079B62] bg-[#ECFDF5] dark:bg-emerald-950/50 text-[#079B62] dark:text-emerald-300'
                                  : isPicked
                                  ? 'border-[#B91C1C] bg-[#FEF2F2] dark:bg-red-950/50 text-[#B91C1C] dark:text-red-300'
                                  : 'border-[#E2E8F0] dark:border-[#1E2E4D] text-[#475569]'
                              }`}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                      {answered && (
                        <div className="rounded-[9px] border border-[#F59E0B]/40 bg-[#FFFBEB] dark:bg-amber-950/30 p-3 text-xs text-[#92400E] dark:text-amber-200">
                          <strong className="text-[#B45309] dark:text-[#F59E0B]">
                            {isSo ? 'Sababta Caafimaad:' : 'Clinical Rationale:'}
                          </strong>{' '}
                          {cs.rationale}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface QuizBlockProps {
  title: string;
  questions: { q: string; opts: string[]; ans: number; why: string }[];
  prefix: string;
  language: AppLanguage;
  answers: Record<string, number>;
  onSelect: (qIdx: number, optIdx: number) => void;
  onSubmit: () => Promise<void>;
}

const QuizBlock: React.FC<QuizBlockProps> = ({
  title,
  questions,
  prefix,
  language,
  answers,
  onSelect,
  onSubmit,
}) => {
  const isSo = language === 'so';
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] overflow-hidden shadow-[0_1px_3px_rgba(16,35,75,0.05)]">
      <div className="bg-[#10234B] text-white px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#F59E0B]" />
          <h3 className="font-display text-base font-extrabold">{title}</h3>
        </div>
        <button
          type="button"
          onClick={async () => {
            setSubmitted(true);
            await onSubmit();
          }}
          className="min-h-[36px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isSo ? 'Sax & Kaydi Dhibcaha' : 'Grade & Save Score'}
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {questions.map((item, qIdx) => {
          const picked = answers[`${prefix}-${qIdx}`];
          return (
            <div key={qIdx} className="space-y-2.5">
              <p className="text-sm font-bold text-[#10234B] dark:text-white">
                {qIdx + 1}. {item.q}
              </p>
              <div className="space-y-1.5">
                {item.opts.map((opt, optIdx) => {
                  const isSelected = picked === optIdx;
                  const isCorrect = optIdx === item.ans;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => onSelect(qIdx, optIdx)}
                      className={`w-full min-h-[40px] text-left px-3.5 py-2 rounded-[9px] border text-xs font-semibold transition-colors ${
                        submitted
                          ? isCorrect
                            ? 'border-[#079B62] bg-[#ECFDF5] dark:bg-emerald-950/50 text-[#079B62] dark:text-emerald-300'
                            : isSelected
                            ? 'border-[#B91C1C] bg-[#FEF2F2] dark:bg-red-950/50 text-[#B91C1C] dark:text-red-300'
                            : 'border-[#E2E8F0] dark:border-[#1E2E4D] text-[#475569]'
                          : isSelected
                          ? 'border-[#10234B] dark:border-[#079B62] bg-[#F1F5F9] dark:bg-[#13203C] text-[#10234B] dark:text-white'
                          : 'border-[#E2E8F0] dark:border-[#1E2E4D] hover:border-[#079B62] text-[#10234B] dark:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="text-xs text-[#475569] dark:text-slate-400">
                  <strong className="text-[#10234B] dark:text-slate-200">
                    {isSo ? 'Sharaxaad:' : 'Explanation:'}
                  </strong>{' '}
                  {item.why}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
