import React, { useState } from 'react';
import { Code2, MessageCircle, Phone, Stethoscope } from 'lucide-react';
import type { AppLanguage } from '../types';

interface DeveloperSectionProps {
  language?: AppLanguage;
  compact?: boolean;
}

const DEVELOPER_PHOTO_SRC = '/assets/aistudio/file_00000000147081f48f50d3e7801a34fb_e5c3eb04.png';
const WHATSAPP_NUMBER_DISPLAY = '613378863';
const WHATSAPP_HREF = 'https://wa.me/252613378863';

export const DeveloperSection: React.FC<DeveloperSectionProps> = ({
  language = 'en',
  compact = false,
}) => {
  const isSo = language === 'so';
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section
      aria-labelledby="developer-section-heading"
      className="rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-[0_1px_3px_rgba(16,35,75,0.05)] overflow-hidden"
    >
      <div className="h-1 w-full bg-[#10234B] dark:bg-[#079B62]" />

      <div className={compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              {!imgFailed ? (
                <img
                  src={DEVELOPER_PHOTO_SRC}
                  alt="Dr. Adam Ali Mohamed"
                  onError={() => setImgFailed(true)}
                  className={`${
                    compact ? 'w-20 h-20 sm:w-22 sm:h-22' : 'w-24 h-24 sm:w-28 sm:h-28'
                  } rounded-[14px] object-cover object-top border-2 border-[#079B62] bg-[#F1F5F9] dark:bg-[#13203C] shadow-sm`}
                />
              ) : (
                <div
                  className={`${
                    compact ? 'w-20 h-20 sm:w-22 sm:h-22' : 'w-24 h-24 sm:w-28 sm:h-28'
                  } rounded-[14px] border-2 border-[#079B62] bg-[#10234B] text-white flex items-center justify-center font-display text-2xl font-extrabold`}
                >
                  AA
                </div>
              )}
              <span
                aria-hidden="true"
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-[8px] bg-[#10234B] border-2 border-white dark:border-[#0D172B] text-[#F59E0B] flex items-center justify-center shadow-xs"
              >
                <Code2 className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#079B62]">
                <Stethoscope className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                <span>{isSo ? 'Horumariyaha Madasha' : 'Developer'}</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <span className="text-[#10234B] dark:text-slate-300">Hilaac Health Center</span>
              </div>

              <h2
                id="developer-section-heading"
                className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-[#10234B] dark:text-white"
              >
                Dr. Adam Ali Mohamed
              </h2>

              <p className="text-xs sm:text-[13px] text-[#475569] dark:text-slate-300 leading-relaxed max-w-2xl">
                {isSo
                  ? 'Soo-saaraha iyo horumariyaha madasha waxbarashada caafimaadka ee Hilaac, oo loogu talagalay in lagu caawiyo ardayda caafimaadka iyo xirfadlayaasha.'
                  : 'Creator and developer of the Hilaac Healthcare Learning Platform, built to support medical students and clinicians with structured study tools and clinical references.'}
              </p>

              <div className="pt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#10234B] dark:text-slate-200">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-[#F59E0B]" />
                  WhatsApp: {WHATSAPP_NUMBER_DISPLAY}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[10px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold transition-colors whitespace-nowrap shadow-xs"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>
                {isSo ? 'WhatsApp · 613378863' : 'WhatsApp · 613378863'}
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
