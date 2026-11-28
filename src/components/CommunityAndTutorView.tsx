import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Bot,
  Check,
  Copy,
  FileText,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  AcademicSubject,
  AppLanguage,
  LeaderboardEntry,
  StudyGroup,
  StudyGroupPost,
  UserProfile,
} from '../types';
import { EmptyStateBox, PageHeroHeader, SectionCard } from './UiPrimitives';
import thumbStudy from '../assets/images/thumb_clinical_study_1795767004787.jpg';

interface CommunityAndTutorViewProps {
  profile: UserProfile;
  studyGroups: StudyGroup[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
  groupPosts: StudyGroupPost[];
  leaderboard: LeaderboardEntry[];
  isOnline: boolean;
  language?: AppLanguage;
  onCreateStudyGroup: (group: {
    name: string;
    subject: AcademicSubject | 'General';
    description: string;
  }) => Promise<void>;
  onJoinStudyGroup: (group: StudyGroup) => Promise<void>;
  onCreatePost: (post: {
    groupId: string;
    content: string;
    attachmentTitle: string;
    attachmentSnippet: string;
  }) => Promise<void>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
  subject?: AcademicSubject;
}

const TUTOR_SUBJECTS: AcademicSubject[] = [
  'Pharmacology',
  'Anatomy & Physiology',
  'Microbiology',
  'Biochemistry',
  'Clinical OPD',
];

const SUBJECT_QUICK_PROMPTS: Record<AcademicSubject, { en: string; so: string }[]> = {
  Pharmacology: [
    {
      en: 'Compare Heparin vs Warfarin monitoring and antidotes',
      so: 'Isbarbardhig Heparin iyo Warfarin: kormeerka shaybaadhka iyo lidka sunta',
    },
    {
      en: 'Explain Beta-1 vs Beta-2 adrenergic receptor drug effects',
      so: 'Sharax farqiga Beta-1 iyo Beta-2 adrenergic receptors ee daawooyinka',
    },
    {
      en: 'How does N-acetylcysteine prevent acetaminophen hepatotoxicity?',
      so: 'Sidee N-acetylcysteine uga hortagtaa sunta Paracetamol ee beerka?',
    },
    {
      en: 'Summarize first-line antihypertensives and key side effects',
      so: 'Soo koob daawooyinka ugu horreeya ee dhiig-karka iyo saameyntooda',
    },
  ],
  'Anatomy & Physiology': [
    {
      en: 'Explain Frank-Starling law and preload vs afterload',
      so: 'Sharax sharciga Frank-Starling iyo preload vs afterload',
    },
    {
      en: 'Trace blood flow through the heart valves and pulmonary circuit',
      so: 'Raac socodka dhiigga ee waaxyaha wadnaha iyo sambabada',
    },
    {
      en: 'How does the nephron regulate sodium and water balance?',
      so: 'Sidee nephron-ka kelyuhu u maamulaa soodiyamka iyo biyaha?',
    },
    {
      en: 'Compare sympathetic vs parasympathetic autonomic pathways',
      so: 'Isbarbardhig hab-dhiska sympathetic iyo parasympathetic',
    },
  ],
  Microbiology: [
    {
      en: 'Compare Gram-positive vs Gram-negative cell wall structure',
      so: 'Isbarbardhig qaab-dhismeedka Gram-positive iyo Gram-negative',
    },
    {
      en: 'Outline key antibiotics covering MRSA vs Pseudomonas',
      so: 'Sheeg antibiotics-ka lagu daaweeyo MRSA iyo Pseudomonas',
    },
    {
      en: 'Explain how latent TB reactivates and diagnostic tests used',
      so: 'Sharax sida Qaaxada qarsoon (latent TB) u kacdo iyo baaritaannadeeda',
    },
    {
      en: 'Summarize viral replication steps for RNA vs DNA viruses',
      so: 'Soo koob taran-ka fayrasyada RNA iyo DNA',
    },
  ],
  Biochemistry: [
    {
      en: 'List the rate-limiting enzymes of Glycolysis and Citric Acid Cycle',
      so: 'Liis garee enzymes-ka xaddida xawaaraha Glycolysis iyo TCA cycle',
    },
    {
      en: 'Explain insulin vs glucagon regulation during fasting and fed states',
      so: 'Sharax shaqada insulin iyo glucagon xilliga soonka iyo cunista kadib',
    },
    {
      en: 'How does the urea cycle detoxify ammonia?',
      so: 'Sidee wareegga Urea uga saaraa sunta ammonia jidhka?',
    },
    {
      en: 'Compare competitive vs non-competitive enzyme inhibition',
      so: 'Isbarbardhig competitive iyo non-competitive enzyme inhibition',
    },
  ],
  'Clinical OPD': [
    {
      en: 'Outline the Sepsis 1-Hour Bundle steps and qSOFA criteria',
      so: 'Sharax tallaabooyinka Sepsis 1-Hour Bundle iyo qSOFA',
    },
    {
      en: 'Walk through acute chest pain triage and red-flag ECG signs',
      so: 'Sharax kala-saarista xanuunka laabta degdegga ah iyo calaamadaha ECG',
    },
    {
      en: 'Summarize oral rehydration and IV fluid choices in dehydration',
      so: 'Soo koob ORS iyo faleebooyinka fuuq-baxa (IV fluids)',
    },
    {
      en: 'How do you interpret metabolic vs respiratory acid-base ABGs?',
      so: 'Sidee loo akhriyaa natiijada ABG: metabolic vs respiratory acidosis?',
    },
  ],
};

const STUDY_ACTION_CHIPS = [
  {
    id: 'simple',
    enLabel: 'Explain Simply',
    soLabel: 'Si Fudud u Sharax',
    instruction: 'Explain step-by-step in simple, beginner-friendly terms',
  },
  {
    id: 'mnemonic',
    enLabel: 'Memory Mnemonic',
    soLabel: 'Xusuus Fudud',
    instruction: 'Give me a memorable clinical mnemonic and high-yield exam pearls',
  },
  {
    id: 'quiz',
    enLabel: '3-Question Quiz',
    soLabel: '3 Su’aalood',
    instruction: 'Give me 3 short multiple-choice practice questions (with answers hidden at the bottom)',
  },
  {
    id: 'compare',
    enLabel: 'Compare & Contrast',
    soLabel: 'Isbarbardhig',
    instruction: 'Create a clear side-by-side comparison of the top 2 concepts students confuse',
  },
] as const;

function renderInlineFormatting(line: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-[#10234B] dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-[#0D172B] font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const FormattedTutorText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (keyBase: number) => {
    if (!listItems) return;
    if (listItems.type === 'ul') {
      blocks.push(
        <ul key={`ul-${keyBase}`} className="list-disc pl-5 space-y-1.5 my-1.5">
          {listItems.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${keyBase}`} className="list-decimal pl-5 space-y-1.5 my-1.5">
          {listItems.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
    }
    listItems = null;
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(idx);
      return;
    }

    const headingMatch = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      flushList(idx);
      blocks.push(
        <h4
          key={`h-${idx}`}
          className="font-display text-[13px] font-extrabold uppercase tracking-wide text-[#079B62] pt-2 first:pt-0"
        >
          {renderInlineFormatting(headingMatch[1])}
        </h4>
      );
      return;
    }

    const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      if (!listItems || listItems.type !== 'ul') {
        flushList(idx);
        listItems = { type: 'ul', items: [] };
      }
      listItems.items.push(ulMatch[1]);
      return;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (!listItems || listItems.type !== 'ol') {
        flushList(idx);
        listItems = { type: 'ol', items: [] };
      }
      listItems.items.push(olMatch[1]);
      return;
    }

    flushList(idx);
    blocks.push(
      <p key={`p-${idx}`} className="leading-relaxed">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList(lines.length + 1);

  return <div className="space-y-2 text-[13.5px]">{blocks}</div>;
};

function makeTimeStamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const CommunityAndTutorView: React.FC<CommunityAndTutorViewProps> = ({
  profile,
  studyGroups,
  activeGroupId,
  onSelectGroup,
  groupPosts,
  leaderboard,
  isOnline,
  language = 'en',
  onCreateStudyGroup,
  onJoinStudyGroup,
  onCreatePost,
}) => {
  const isSo = language === 'so';
  const [subTab, setSubTab] = useState<'tutor' | 'groups' | 'leaderboard'>('tutor');

  const [tutorSubject, setTutorSubject] = useState<AcademicSubject>('Pharmacology');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      createdAt: makeTimeStamp(),
      text: isSo
        ? `### Soo dhowow, ${profile.displayName}\nWeydii su’aal kasta oo ku saabsan **Pharmacology**, **Anatomy & Physiology**, **Microbiology**, **Biochemistry**, ama **Clinical OPD** adigoo adeegsanaya Soomaali ama Ingiriisi.\n- Dooro **Maadada** kor ku xusan si aad u hesho sharaxaad ku habboon.\n- Guji su’aalaha diyaarka ah si aad u bilowdo.`
        : `### Welcome, ${profile.displayName}\nAsk any **Pharmacology**, **Anatomy & Physiology**, **Microbiology**, **Biochemistry**, or **Clinical OPD** question in Somali or English.\n- Choose your **Focus** subject above for tailored notes.\n- Tap any quick prompt or study mode chip below to begin.`,
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState<AcademicSubject | 'General'>('Pharmacology');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [postContent, setPostContent] = useState('');
  const [attachmentTitle, setAttachmentTitle] = useState('');
  const [attachmentSnippet, setAttachmentSnippet] = useState('');
  const [joinedGroupIds, setJoinedGroupIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isSendingChat]);

  const activeGroup = useMemo(
    () => studyGroups.find((g) => g.id === activeGroupId) ?? studyGroups[0] ?? null,
    [studyGroups, activeGroupId]
  );

  const activeGroupPosts = useMemo(
    () => (activeGroup ? groupPosts.filter((p) => p.groupId === activeGroup.id) : []),
    [groupPosts, activeGroup]
  );

  const sortedLeaderboard = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    leaderboard.forEach((entry) => map.set(entry.uid, entry));
    map.set(profile.uid, {
      uid: profile.uid,
      displayName: profile.displayName,
      role: profile.role,
      xp: profile.xp,
      studyMinutes: profile.studyMinutes,
      streakDays: profile.streakDays,
    });
    return Array.from(map.values()).sort((a, b) => b.xp - a.xp);
  }, [leaderboard, profile]);

  async function sendTutorPrompt(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || isSendingChat) return;
    setChatError(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      createdAt: makeTimeStamp(),
      subject: tutorSubject,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setChatInput('');

    if (!isOnline) {
      setChatError(
        isSo
          ? 'Hadda khadka ma tihid. Ku xirnow internetka si aad u weydiiso Macallinka AI.'
          : 'You are currently offline. Connect to the internet to query the AI Study Assistant.'
      );
      return;
    }

    setIsSendingChat(true);
    try {
      const resp = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          subject: tutorSubject,
          role: profile.role,
          history: nextMessages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });
      const rawText = await resp.text();
      let data: { reply?: string; error?: string } = {};
      try {
        data = JSON.parse(rawText) as { reply?: string; error?: string };
      } catch {
        data = {};
      }
      if (!resp.ok || !data.reply) {
        if (data.error && data.error.includes('GEMINI_API_KEY')) {
          throw new Error(
            isSo
              ? 'Macallinka AI weli looma dhigin GEMINI_API_KEY gudaha Vercel (Settings → Environment Variables).'
              : 'AI Tutor needs GEMINI_API_KEY added in Vercel (Settings → Environment Variables) and redeployed.'
          );
        }
        throw new Error(
          data.error ||
            (isSo
              ? 'Macallinka AI ma dhammaystiri karin codsigan.'
              : 'AI Study Assistant could not complete this request.')
        );
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: data.reply!,
          createdAt: makeTimeStamp(),
          subject: tutorSubject,
        },
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error
          ? err.message
          : isSo
          ? 'Lama gaari karo Macallinka AI.'
          : 'Unable to reach AI Study Assistant.'
      );
    } finally {
      setIsSendingChat(false);
    }
  }

  function handleChipClick(instruction: string) {
    const topic = chatInput.trim();
    const langCue = isSo ? ' (Respond concisely in Somali with key medical terms)' : '';
    if (topic) {
      sendTutorPrompt(`${instruction}: ${topic}${langCue}`);
    } else {
      sendTutorPrompt(`For ${tutorSubject}, ${instruction.toLowerCase()}.${langCue}`);
    }
  }

  function handleClearChat() {
    setChatError(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        createdAt: makeTimeStamp(),
        text: isSo
          ? `### Kulan Cusub (${tutorSubject})\nDiyaar ayaan kuu ahay, **${profile.displayName}**. Qor su’aashaada hoos ama guji su’aalaha diyaarka ah.`
          : `### New ${tutorSubject} Session\nReady whenever you are, **${profile.displayName}**. Ask a question below or pick a study prompt.`,
      },
    ]);
  }

  async function handleCopyReply(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
    } catch {
      // clipboard blocked in restricted context
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;
    await onCreateStudyGroup({
      name: newGroupName.trim(),
      subject: newGroupSubject,
      description: newGroupDesc.trim(),
    });
    setNewGroupName('');
    setNewGroupDesc('');
  }

  async function handleSharePost(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGroup || !postContent.trim()) return;
    await onCreatePost({
      groupId: activeGroup.id,
      content: postContent.trim(),
      attachmentTitle: attachmentTitle.trim(),
      attachmentSnippet: attachmentSnippet.trim(),
    });
    setPostContent('');
    setAttachmentTitle('');
    setAttachmentSnippet('');
  }

  const subjectPrompts = SUBJECT_QUICK_PROMPTS[tutorSubject] ?? SUBJECT_QUICK_PROMPTS.Pharmacology;

  return (
    <div className="space-y-5">
      <PageHeroHeader
        thumbSrc={thumbStudy}
        thumbAlt="Hilaac AI Study Tutor"
        kicker={isSo ? 'Kaaliyaha Waxbarashada' : 'AI Tutor & Peer Learning'}
        title={isSo ? 'Macallinka AI & Kooxaha Waxbarashada' : 'AI Study Tutor & Study Groups'}
        subtitle={
          isSo
            ? 'Sharaxaad Soomaali iyo Ingiriisi ah, kooxaha ardayda, iyo kala-horreynta dhibcaha XP.'
            : 'Structured medical help in Somali & English, peer study cohorts, and XP rankings.'
        }
        rightSlot={
          <div className="flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#13203C] border border-[#E2E8F0] dark:border-[#1E2E4D] p-1 rounded-[10px] overflow-x-auto no-scrollbar max-w-full">
            {(
              [
                { id: 'tutor', label: isSo ? 'Macallinka AI' : 'AI Tutor' },
                { id: 'groups', label: isSo ? 'Kooxaha' : 'Study Groups' },
                { id: 'leaderboard', label: isSo ? 'Kala-horreynta' : 'Leaderboard' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`min-h-[34px] px-3 py-1.5 rounded-[7px] text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  subTab === t.id
                    ? 'bg-[#079B62] text-white'
                    : 'text-[#10234B] dark:text-slate-300 hover:bg-white dark:hover:bg-[#0D172B]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {/* AI STUDY TUTOR */}
      {subTab === 'tutor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <SectionCard className="lg:col-span-8 flex flex-col min-h-[480px] h-[calc(100vh-230px)] sm:h-[600px] max-h-[680px] overflow-hidden">
            {/* Tutor Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#10234B] text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] bg-[#079B62] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-display text-sm font-extrabold text-white">
                    {isSo ? 'Kaaliyaha AI ee Hilaac' : 'Hilaac AI Study Assistant'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {tutorSubject} · {isSo ? 'Soomaali & Ingiriisi' : 'Somali & English'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={tutorSubject}
                  onChange={(e) => setTutorSubject(e.target.value as AcademicSubject)}
                  aria-label={isSo ? 'Dooro maadada' : 'Tutor Subject Focus'}
                  className="rounded-[8px] border border-white/20 bg-[#091734] px-2.5 py-1.5 text-xs font-bold text-white"
                >
                  {TUTOR_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {isSo ? `Maadada: ${s}` : `Focus: ${s}`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleClearChat}
                  aria-label={isSo ? 'Nadiifi wada-hadalka' : 'Reset conversation'}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-white/20 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isSo ? 'Nadiifi' : 'Clear'}</span>
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-[14px] px-4 py-3 text-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#10234B] dark:bg-[#079B62] text-white'
                        : 'border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-[#10234B] dark:text-slate-100'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">{msg.text}</p>
                    ) : (
                      <FormattedTutorText text={msg.text} />
                    )}
                  </div>

                  <div className="mt-1 px-1 flex items-center gap-2 text-[11px] text-[#475569] dark:text-slate-400">
                    <span className="font-mono tabular-nums">{msg.createdAt}</span>
                    {msg.subject && <span>· {msg.subject}</span>}
                    {msg.sender === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => handleCopyReply(msg.id, msg.text)}
                        className="inline-flex items-center gap-1 font-bold text-[#079B62] hover:underline"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            {isSo ? 'La koobiyay' : 'Copied'}
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            {isSo ? 'Koobi' : 'Copy'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isSendingChat && (
                <div className="inline-flex items-center gap-2 rounded-[12px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3.5 py-2 text-xs font-semibold text-[#10234B] dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  {isSo
                    ? `Diyaarinaya sharaxaadda ${tutorSubject}...`
                    : `Preparing structured study notes for ${tutorSubject}...`}
                </div>
              )}
            </div>

            {chatError && (
              <div className="mx-4 mb-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {chatError}
              </div>
            )}

            {/* Quick Study Mode Chips + Multiline Composer */}
            <div className="p-3.5 sm:p-4 border-t border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#0D172B] space-y-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {STUDY_ACTION_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={isSendingChat}
                    onClick={() => handleChipClick(chip.instruction)}
                    className="min-h-[32px] px-2.5 py-1 rounded-[7px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#13203C] text-[11px] font-bold text-[#10234B] dark:text-slate-200 hover:border-[#079B62] hover:text-[#079B62] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {isSo ? chip.soLabel : chip.enLabel}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendTutorPrompt(chatInput);
                }}
                className="flex flex-col sm:flex-row sm:items-end gap-2"
              >
                <textarea
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendTutorPrompt(chatInput);
                    }
                  }}
                  placeholder={
                    isSo
                      ? `Weydii su’aal ku saabsan ${tutorSubject} (Soomaali ama Ingiriisi)...`
                      : `Ask a ${tutorSubject} question (English or Somali)...`
                  }
                  className="flex-1 resize-none rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#13203C] px-3.5 py-2 text-sm text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold disabled:opacity-50 shrink-0 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSo ? 'Dir Su’aasha' : 'Ask Tutor'}
                </button>
              </form>
            </div>
          </SectionCard>

          <SectionCard className="lg:col-span-4 p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                {tutorSubject} {isSo ? 'Su’aalo Diyaar ah' : 'Quick Prompts'}
              </h2>
              <p className="text-xs text-[#475569] dark:text-slate-400 mt-0.5">
                {isSo ? 'Guji mowduuc si aad u bilowdo sharaxaad.' : 'Tap any clinical topic below.'}
              </p>
            </div>
            <div className="space-y-2">
              {subjectPrompts.map((q) => {
                const label = isSo ? q.so : q.en;
                return (
                  <button
                    key={q.en}
                    type="button"
                    disabled={isSendingChat}
                    onClick={() => sendTutorPrompt(label)}
                    className="w-full text-left p-3 rounded-[10px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-xs font-semibold text-[#10234B] dark:text-slate-200 hover:border-[#079B62] transition-colors disabled:opacity-50"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#475569] dark:text-slate-400 leading-relaxed pt-2 border-t border-[#E2E8F0]/70 dark:border-[#1E2E4D]">
              {isSo
                ? 'Ogeysiis waxbarasho: Kaaliyahani wuxuu taageeraa akhriska ardayda mana beddelo kormeerka dhakhtarka.'
                : 'Educational notice: Supports study revision and does not replace licensed clinical supervision.'}
            </p>
          </SectionCard>
        </div>
      )}

      {/* SOCIAL STUDY GROUPS */}
      {subTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-5 space-y-4">
            <SectionCard className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#079B62]" />
                <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
                  {isSo ? 'Kooxaha Waxbarashada' : 'Peer Study Groups'}
                </h2>
              </div>
              <div className="space-y-2.5">
                {studyGroups.map((grp) => {
                  const selected = activeGroup?.id === grp.id;
                  const joined = joinedGroupIds[grp.id];
                  return (
                    <div
                      key={grp.id}
                      onClick={() => onSelectGroup(grp.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onSelectGroup(grp.id);
                      }}
                      className={`p-3.5 rounded-[11px] border cursor-pointer transition-colors ${
                        selected
                          ? 'border-[#079B62] bg-[#ECFDF5]/60 dark:bg-[#13203C]'
                          : 'border-[#E2E8F0] dark:border-[#1E2E4D] hover:border-[#079B62]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#10234B] dark:text-white">
                            {grp.name}
                          </div>
                          <div className="text-xs text-[#475569] dark:text-slate-400">
                            {grp.subject} · <span className="font-mono tabular-nums">{grp.memberCount}</span>{' '}
                            {isSo ? 'xubnood' : 'members'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!joined) {
                              setJoinedGroupIds((prev) => ({ ...prev, [grp.id]: true }));
                              onJoinStudyGroup(grp);
                            }
                          }}
                          className={`min-h-[32px] px-2.5 py-1 rounded-[7px] text-xs font-bold shrink-0 ${
                            joined
                              ? 'bg-[#079B62] text-white'
                              : 'border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-200 hover:border-[#079B62]'
                          }`}
                        >
                          {joined ? (isSo ? 'Ku Biirtay' : 'Joined') : isSo ? 'Ku Biir' : 'Join'}
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-[#475569] dark:text-slate-300">
                        {grp.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <form
              onSubmit={handleCreateGroup}
              className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] p-4 sm:p-5 space-y-3 shadow-[0_1px_3px_rgba(16,35,75,0.05)]"
            >
              <h3 className="font-display text-sm font-extrabold text-[#10234B] dark:text-white">
                {isSo ? 'Samee Koox Waxbarasho' : 'Create Study Group'}
              </h3>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={
                  isSo
                    ? 'Magaca kooxda (tusaale: Kooxda Farmashiyaha)'
                    : 'Group name (e.g., Biochemistry Exam Sprint)'
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />
              <select
                value={newGroupSubject}
                onChange={(e) => setNewGroupSubject(e.target.value as AcademicSubject | 'General')}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-semibold text-[#10234B] dark:text-white"
              >
                <option value="General">{isSo ? 'Guud' : 'General'}</option>
                {TUTOR_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder={isSo ? 'Ujeeddada kooxda oo kooban...' : 'Brief study focus...'}
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 py-2.5 rounded-[9px] bg-[#10234B] dark:bg-[#079B62] text-white text-xs font-bold hover:opacity-95"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSo ? 'Abuur Kooxda' : 'Launch Group'}
              </button>
            </form>
          </section>

          <SectionCard className="lg:col-span-7 p-4 sm:p-5 space-y-5">
            {activeGroup ? (
              <>
                <div className="border-b border-[#E2E8F0] dark:border-[#1E2E4D] pb-3">
                  <div className="text-xs font-bold text-[#079B62]">
                    {activeGroup.subject} · {isSo ? 'Hogaamiye:' : 'Led by'} {activeGroup.createdByName}
                  </div>
                  <h2 className="font-display text-lg font-extrabold text-[#10234B] dark:text-white">
                    {activeGroup.name}
                  </h2>
                </div>

                <form
                  onSubmit={handleSharePost}
                  className="space-y-2.5 bg-[#F8FAFC] dark:bg-[#13203C] p-4 rounded-[12px] border border-[#E2E8F0] dark:border-[#1E2E4D]"
                >
                  <textarea
                    rows={2}
                    required
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder={
                      isSo
                        ? 'La wadaag kooxdaada qodob muhiim ah ama su’aal...'
                        : 'Share a clinical takeaway, question, or mnemonic with your study group...'
                    }
                    className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] px-3 py-2 text-xs text-[#10234B] dark:text-white"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={attachmentTitle}
                      onChange={(e) => setAttachmentTitle(e.target.value)}
                      placeholder={isSo ? 'Cinwaan qoraal (ikhtiyaari)...' : 'Optional shared note title...'}
                      className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] px-3 py-1.5 text-xs text-[#10234B] dark:text-white"
                    />
                    <input
                      type="text"
                      value={attachmentSnippet}
                      onChange={(e) => setAttachmentSnippet(e.target.value)}
                      placeholder={isSo ? 'Soo koobid (ikhtiyaari)...' : 'Optional summary snippet...'}
                      className="rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] px-3 py-1.5 text-xs text-[#10234B] dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {isSo ? 'Ku Qor Kooxda' : 'Post to Group'}
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  {activeGroupPosts.length === 0 ? (
                    <EmptyStateBox
                      icon={<MessageSquare className="w-5 h-5" />}
                      title={isSo ? 'Weli qoraal laguma darin' : 'No study posts yet'}
                      description={
                        isSo
                          ? 'Noqo qofka ugu horreeya ee la wadaaga qodob waxbarasho kooxdan.'
                          : 'Share the first clinical note or study question above.'
                      }
                    />
                  ) : (
                    activeGroupPosts.map((post) => (
                      <article
                        key={post.id}
                        className="rounded-[11px] border border-[#E2E8F0] dark:border-[#1E2E4D] p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs text-[#475569] dark:text-slate-400">
                          <span className="font-bold text-[#10234B] dark:text-white">
                            {post.authorName} · {post.authorRole}
                          </span>
                          <span className="font-mono tabular-nums">
                            {new Date(post.createdAtMs).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-[#10234B] dark:text-slate-200">{post.content}</p>
                        {post.attachmentTitle && (
                          <div className="rounded-[9px] bg-[#F8FAFC] dark:bg-[#13203C] p-3 text-xs space-y-1 border border-[#E2E8F0] dark:border-[#1E2E4D]">
                            <div className="flex items-center gap-1.5 font-bold text-[#079B62]">
                              <FileText className="w-3.5 h-3.5" />
                              {post.attachmentTitle}
                            </div>
                            {post.attachmentSnippet && (
                              <p className="text-[#475569] dark:text-slate-300">{post.attachmentSnippet}</p>
                            )}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </>
            ) : (
              <EmptyStateBox
                icon={<Users className="w-5 h-5" />}
                title={isSo ? 'Dooro koox waxbarasho' : 'Select a study group'}
                description={
                  isSo
                    ? 'Guji mid ka mid ah kooxaha bidix si aad u aragto doodaha.'
                    : 'Choose a study group on the left to view or post clinical notes.'
                }
              />
            )}
          </SectionCard>
        </div>
      )}

      {/* GLOBAL LEADERBOARD */}
      {subTab === 'leaderboard' && (
        <SectionCard className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#F59E0B]" />
            <div>
              <h2 className="font-display text-lg font-extrabold text-[#10234B] dark:text-white">
                {isSo ? 'Kala-horreynta Ardayda & Dhibcaha XP' : 'Global Study & Participation Leaderboard'}
              </h2>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                {isSo
                  ? 'Ku kasbo XP dhammaystirka hawlaha, akhriska buugaagta, iyo kaararka xusuusta.'
                  : 'Earn XP by completing tasks, reading modules, reviewing flashcards, and sharing study notes.'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#1E2E4D] text-xs text-[#475569] dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-bold">{isSo ? 'Darajo' : 'Rank'}</th>
                  <th className="py-2.5 pr-4 font-bold">{isSo ? 'Ardayga' : 'Learner'}</th>
                  <th className="py-2.5 pr-4 font-bold">{isSo ? 'Doorka' : 'Role'}</th>
                  <th className="py-2.5 pr-4 font-bold">{isSo ? 'Waqtiga' : 'Study Time'}</th>
                  <th className="py-2.5 pr-4 font-bold">{isSo ? 'Taxane' : 'Streak'}</th>
                  <th className="py-2.5 font-bold text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/70 dark:divide-[#1E2E4D]">
                {sortedLeaderboard.map((entry, idx) => {
                  const isMe = entry.uid === profile.uid;
                  return (
                    <tr
                      key={entry.uid}
                      className={isMe ? 'bg-[#ECFDF5] dark:bg-emerald-950/30 font-semibold' : ''}
                    >
                      <td className="py-3 pr-4 font-mono font-bold tabular-nums text-[#10234B] dark:text-slate-300">
                        {idx < 3 ? (
                          <span className="text-[#B45309] dark:text-[#F59E0B]">#{idx + 1}</span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>
                      <td className="py-3 pr-4 font-bold text-[#10234B] dark:text-white">
                        {entry.displayName} {isMe ? (isSo ? '(Adiga)' : '(You)') : ''}
                      </td>
                      <td className="py-3 pr-4 text-xs capitalize text-[#475569] dark:text-slate-400">
                        {entry.role}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums text-[#10234B] dark:text-slate-300">
                        {entry.studyMinutes} {isSo ? 'daq' : 'min'}
                      </td>
                      <td className="py-3 pr-4 font-mono tabular-nums text-[#079B62] font-bold">
                        {entry.streakDays}d
                      </td>
                      <td className="py-3 font-mono tabular-nums text-right text-[#B45309] dark:text-[#F59E0B] font-extrabold">
                        {entry.xp} XP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
};
