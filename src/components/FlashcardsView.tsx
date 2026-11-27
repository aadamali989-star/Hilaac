import React, { useMemo, useState } from 'react';
import { Brain, Plus, RotateCcw, Sparkles } from 'lucide-react';
import type { AppLanguage, FlashcardItem } from '../types';
import { EmptyStateBox, PageHeroHeader, SectionCard } from './UiPrimitives';
import thumbNotes from '../assets/images/thumb_ai_notes_1795767030204.jpg';

interface FlashcardsViewProps {
  flashcards: FlashcardItem[];
  language?: AppLanguage;
  onReviewCard: (card: FlashcardItem, quality: 1 | 3 | 4 | 5) => Promise<void>;
  onAddFlashcard: (card: {
    subject: 'Pharmacology' | 'Anatomy & Physiology' | 'Microbiology' | 'Biochemistry';
    front: string;
    back: string;
  }) => Promise<void>;
}

const SUBJECTS: ('All' | 'Pharmacology' | 'Anatomy & Physiology' | 'Microbiology' | 'Biochemistry')[] = [
  'All',
  'Pharmacology',
  'Anatomy & Physiology',
  'Microbiology',
  'Biochemistry',
];

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards,
  language = 'en',
  onReviewCard,
  onAddFlashcard,
}) => {
  const isSo = language === 'so';
  const [selectedSubject, setSelectedSubject] = useState<(typeof SUBJECTS)[number]>('All');
  const [flipped, setFlipped] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [showAllMode, setShowAllMode] = useState(false);

  const [newSubject, setNewSubject] = useState<
    'Pharmacology' | 'Anatomy & Physiology' | 'Microbiology' | 'Biochemistry'
  >('Pharmacology');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const nowIso = new Date().toISOString();

  const filteredCards = useMemo(() => {
    const bySubj =
      selectedSubject === 'All'
        ? flashcards
        : flashcards.filter((c) => c.subject === selectedSubject);
    if (showAllMode) return bySubj;
    const due = bySubj.filter((c) => c.nextReviewAt <= nowIso);
    return due.length > 0 ? due : bySubj;
  }, [flashcards, selectedSubject, showAllMode, nowIso]);

  const currentCard = filteredCards[cardIndex % Math.max(1, filteredCards.length)];
  const dueCount = flashcards.filter((c) => c.nextReviewAt <= nowIso).length;

  async function handleGrade(quality: 1 | 3 | 4 | 5) {
    if (!currentCard) return;
    await onReviewCard(currentCard, quality);
    setFlipped(false);
    setAiHint(null);
    setCardIndex((prev) => prev + 1);
  }

  async function handleFetchHint() {
    if (!currentCard) return;
    setLoadingHint(true);
    setAiHint(null);
    try {
      const resp = await fetch('/api/tutor/flashcard-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentCard.subject,
          front: currentCard.front,
          back: currentCard.back,
        }),
      });
      const data = (await resp.json()) as { hint?: string; error?: string };
      if (!resp.ok) throw new Error(data.error || 'Hint unavailable');
      setAiHint(data.hint || null);
    } catch {
      setAiHint(
        isSo
          ? 'Fiiri receptor-ka, dariiqa kiimikaad, ama calaamadda sunta ee la xiriirta mowduucan.'
          : 'Focus on the receptor, pathway, or key toxicity marker associated with this topic.'
      );
    } finally {
      setLoadingHint(false);
    }
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    await onAddFlashcard({
      subject: newSubject,
      front: newFront.trim(),
      back: newBack.trim(),
    });
    setNewFront('');
    setNewBack('');
  }

  return (
    <div className="space-y-5">
      <PageHeroHeader
        thumbSrc={thumbNotes}
        thumbAlt="Flashcard review deck"
        kicker={isSo ? 'Xusuus Celinta Caafimaadka' : 'Active Recall · SM-2'}
        title={isSo ? 'Kaararka Xusuusta (Flashcards)' : 'Spaced-Repetition Flashcards (SM-2)'}
        subtitle={
          isSo
            ? 'Ku celceli su’aalaha caafimaadka si aad u xoojiso xusuustaada muddada dheer.'
            : 'Reinforce medical concepts using adaptive intervals based on your recall confidence.'
        }
        rightSlot={
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-mono font-bold text-[#B45309] dark:text-[#F59E0B] tabular-nums">
              {dueCount} {isSo ? 'sugaya' : 'due'} · {flashcards.length} {isSo ? 'wadar' : 'total'}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowAllMode(!showAllMode);
                setCardIndex(0);
                setFlipped(false);
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-[9px] border border-[#10234B] dark:border-[#1E2E4D] font-bold text-[#10234B] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-[#13203C] whitespace-nowrap"
            >
              {showAllMode
                ? isSo
                  ? 'Muuji Kuwa Sugaya'
                  : 'Show Due Only'
                : isSo
                ? 'Ku Celceli Dhammaan'
                : 'Practice All Cards'}
            </button>
          </div>
        }
      />

      {/* Subject Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSelectedSubject(s);
              setCardIndex(0);
              setFlipped(false);
              setAiHint(null);
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-[9px] text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
              selectedSubject === s
                ? 'bg-[#079B62] text-white'
                : 'bg-white dark:bg-[#0D172B] border border-[#E2E8F0] dark:border-[#1E2E4D] text-[#10234B] dark:text-slate-300 hover:border-[#079B62]'
            }`}
          >
            {s === 'All' && isSo ? 'Dhammaan' : s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Active Flashcard Deck */}
        <SectionCard className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between min-h-[330px]">
          {currentCard ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569] dark:text-slate-400">
                <span className="font-semibold">
                  <span className="text-[#10234B] dark:text-white font-bold">{currentCard.subject}</span> ·{' '}
                  <span className="font-mono tabular-nums">{currentCard.intervalDays}d</span> ·{' '}
                  {isSo ? 'Fududeyn' : 'Ease'}{' '}
                  <span className="font-mono tabular-nums">{currentCard.easeFactor.toFixed(2)}</span>
                </span>
                <span className="font-mono font-bold text-[#10234B] dark:text-slate-300 tabular-nums">
                  {(cardIndex % filteredCards.length) + 1} / {filteredCards.length}
                </span>
              </div>

              <div
                onClick={() => setFlipped(!flipped)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFlipped(!flipped);
                  }
                }}
                className="my-5 py-8 px-4 sm:px-6 rounded-[14px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] text-center cursor-pointer hover:border-[#079B62] transition-colors"
              >
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#079B62] mb-2">
                  {flipped
                    ? isSo
                      ? 'Jawaabta & Sharaxaadda'
                      : 'Answer & Rationale'
                    : isSo
                    ? 'Su’aasha (Guji si aad u rogto)'
                    : 'Prompt (Tap to Flip)'}
                </div>
                <p className="font-display text-base sm:text-lg font-bold text-[#10234B] dark:text-white leading-relaxed">
                  {flipped ? currentCard.back : currentCard.front}
                </p>
              </div>

              {aiHint && (
                <div className="mb-4 rounded-[10px] border border-[#F59E0B]/50 bg-[#FFFBEB] dark:bg-amber-950/30 p-3 text-xs text-[#92400E] dark:text-amber-200">
                  <strong className="text-[#B45309] dark:text-[#F59E0B]">
                    {isSo ? 'Talo Xusuus:' : 'Memory Hook:'}
                  </strong>{' '}
                  {aiHint}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleFetchHint}
                  disabled={loadingHint}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] text-xs font-bold text-[#10234B] dark:text-slate-200 hover:border-[#F59E0B]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  {loadingHint
                    ? isSo
                      ? 'Fekeraya...'
                      : 'Thinking...'
                    : isSo
                    ? 'Talo AI'
                    : 'AI Memory Hint'}
                </button>

                {!flipped ? (
                  <button
                    type="button"
                    onClick={() => setFlipped(true)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] bg-[#10234B] dark:bg-[#079B62] text-white text-xs font-bold hover:opacity-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {isSo ? 'Muuji Jawaabta' : 'Reveal Answer'}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleGrade(1)}
                      className="min-h-[38px] px-3 py-1.5 rounded-[8px] border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-[#B91C1C] dark:text-red-300 text-xs font-bold"
                    >
                      {isSo ? 'Mar Kale (Maanta)' : 'Again (Today)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrade(3)}
                      className="min-h-[38px] px-3 py-1.5 rounded-[8px] border border-[#F59E0B]/50 bg-[#FFFBEB] dark:bg-amber-950/40 text-[#B45309] dark:text-[#F59E0B] text-xs font-bold"
                    >
                      {isSo ? 'Adag (1m)' : 'Hard (1d)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrade(4)}
                      className="min-h-[38px] px-3 py-1.5 rounded-[8px] border border-[#079B62]/40 bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#079B62] dark:text-emerald-300 text-xs font-bold"
                    >
                      {isSo ? 'Fiican' : 'Good'} (
                      {Math.max(
                        1,
                        currentCard.intervalDays === 0
                          ? 1
                          : Math.round(currentCard.intervalDays * currentCard.easeFactor)
                      )}
                      d)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGrade(5)}
                      className="min-h-[38px] px-3 py-1.5 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold"
                    >
                      {isSo ? 'Fudud' : 'Easy'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyStateBox
              icon={<Brain className="w-5 h-5" />}
              title={isSo ? 'Kaarar lagama helin qaybtan' : 'No flashcards in this filter'}
              description={
                isSo
                  ? 'Dooro maado kale ama ku dar kaar cusub dhinaca midig.'
                  : 'Switch subject filter or create a new flashcard.'
              }
              actionLabel={selectedSubject !== 'All' ? (isSo ? 'Muuji Dhammaan' : 'Show All') : undefined}
              onAction={selectedSubject !== 'All' ? () => setSelectedSubject('All') : undefined}
            />
          )}
        </SectionCard>

        {/* Create Custom Spaced Repetition Flashcard */}
        <SectionCard className="lg:col-span-5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-[#079B62]" />
            <h2 className="font-display text-base font-extrabold text-[#10234B] dark:text-white">
              {isSo ? 'Ku Dar Kaar Cusub' : 'Add Custom Flashcard'}
            </h2>
          </div>

          <form onSubmit={handleCreateCard} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#10234B] dark:text-slate-300 mb-1">
                {isSo ? 'Maadada' : 'Subject'}
              </label>
              <select
                value={newSubject}
                onChange={(e) =>
                  setNewSubject(
                    e.target.value as 'Pharmacology' | 'Anatomy & Physiology' | 'Microbiology' | 'Biochemistry'
                  )
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs font-semibold text-[#10234B] dark:text-white"
              >
                <option value="Pharmacology">Pharmacology</option>
                <option value="Anatomy & Physiology">Anatomy &amp; Physiology</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Biochemistry">Biochemistry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#10234B] dark:text-slate-300 mb-1">
                {isSo ? 'Su’aasha / Hore' : 'Question / Front'}
              </label>
              <textarea
                rows={2}
                required
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder={
                  isSo
                    ? 'Tusaale: Waa maxay lidka (antidote) Benzodiazepine?'
                    : 'e.g., What is the antidote for Benzodiazepine overdose?'
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#10234B] dark:text-slate-300 mb-1">
                {isSo ? 'Jawaabta / Dambe' : 'Answer / Back'}
              </label>
              <textarea
                rows={3}
                required
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder={
                  isSo
                    ? 'Tusaale: Flumazenil (GABA-A competitive antagonist)'
                    : 'e.g., Flumazenil (GABA-A competitive antagonist)'
                }
                className="w-full rounded-[9px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] px-3 py-2 text-xs text-[#10234B] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#079B62]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isSo ? 'Kaydi Kaarka' : 'Save Flashcard to Deck'}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
};
