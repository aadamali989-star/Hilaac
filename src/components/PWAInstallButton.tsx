import React, { useState } from 'react';
import { Download, MoreVertical, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { AppLanguage } from '../types';

interface PWAInstallButtonProps {
  language?: AppLanguage;
  variant?: 'compact' | 'sidebar' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language = 'en',
  variant = 'compact',
}) => {
  const isSo = language === 'so';
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Hide automatically when already launched as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  async function handleClick() {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
      return;
    }
    setShowGuideModal(true);
  }

  return (
    <>
      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleClick}
          aria-label={isSo ? 'Ku shubo shaashadda hore' : 'Install app to home screen'}
          className="min-h-[38px] inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[8px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">
            {isSo ? 'Ku Shubo App' : 'Install App'}
          </span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-xs font-bold text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>{isSo ? 'Ku Dar Shaashadda Hore' : 'Add to Home Screen'}</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          type="button"
          onClick={handleClick}
          className="w-full min-h-[40px] py-2 px-4 rounded-[9px] bg-[#079B62] hover:bg-[#058152] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>
            {isInstallable
              ? isSo
                ? 'Ku Rakib App-ka Shaashadda (Offline)'
                : 'Install Hilaac App to Home Screen'
              : isSo
              ? 'Sida Loogu Daro Shaashadda Hore'
              : 'Add Hilaac to Home Screen'}
          </span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-[#091734]/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[18px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#10234B] text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-[9px] bg-[#079B62] flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="pwa-install-guide-title"
                    className="font-display text-sm sm:text-base font-extrabold text-white truncate"
                  >
                    {isSo ? 'Ku Dar Shaashadda Hore (Home Screen)' : 'Add Hilaac to Home Screen'}
                  </h2>
                  <p className="text-[11px] text-slate-300 truncate">
                    {isSo
                      ? 'U isticmaal sida app caadi ah oo offline shaqeeya'
                      : 'Launch like a native app with offline support'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label={isSo ? 'Xir' : 'Close'}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-[#10234B] dark:text-slate-200">
              {isIOS ? (
                <div className="rounded-[12px] border border-[#079B62]/30 bg-[#ECFDF5]/60 dark:bg-emerald-950/30 p-3.5 space-y-2">
                  <div className="font-extrabold text-[#079B62] flex items-center gap-1.5">
                    <Share className="w-4 h-4" />
                    <span>{isSo ? 'iPhone / iPad (Safari)' : 'iPhone / iPad (Safari)'}</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                    <li>
                      {isSo
                        ? 'Ku fur boggan browser-ka Safari (haddii aad app kale ku jirto).'
                        : 'Open this page in Safari.'}
                    </li>
                    <li>
                      {isSo
                        ? 'Taabo badhanka Share (sanduuqa falaarta kore leh) ee hoose ama sare.'
                        : 'Tap the Share button in the Safari toolbar.'}
                    </li>
                    <li>
                      {isSo
                        ? 'Hoos u dhaadhac kadib dooro "Add to Home Screen" oo taabo Add.'
                        : 'Scroll down, tap "Add to Home Screen", then tap Add.'}
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-[12px] border border-[#079B62]/30 bg-[#ECFDF5]/60 dark:bg-emerald-950/30 p-3.5 space-y-2">
                    <div className="font-extrabold text-[#079B62] flex items-center gap-1.5">
                      <MoreVertical className="w-4 h-4" />
                      <span>{isSo ? 'Android (Chrome / Edge)' : 'Android (Chrome / Edge)'}</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                      <li>
                        {isSo
                          ? 'Taabo saddexda dhibcood (⋮) ee geeska sare ee midig.'
                          : 'Tap the browser menu (⋮) in the top-right corner.'}
                      </li>
                      <li>
                        {isSo
                          ? 'Dooro "Install app" ama "Add to Home screen".'
                          : 'Tap "Install app" or "Add to Home screen".'}
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-[#F8FAFC] dark:bg-[#13203C] p-3.5 space-y-1.5">
                    <div className="font-extrabold text-[#10234B] dark:text-white flex items-center gap-1.5">
                      <Share className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>{isSo ? 'iPhone / Desktop' : 'iPhone / Desktop Browser'}</span>
                    </div>
                    <p className="text-[#475569] dark:text-slate-300 leading-relaxed">
                      {isSo
                        ? 'iPhone (Safari): Taabo Share → Add to Home Screen. Kombiyuutarka (Chrome/Edge): guji astaanta Install ee baarka cinwaanka.'
                        : 'On iPhone Safari: Share → Add to Home Screen. On Desktop Chrome/Edge: click the Install icon in the address bar.'}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full min-h-[40px] rounded-[9px] bg-[#10234B] hover:bg-[#193366] text-white text-xs font-bold transition-colors"
              >
                {isSo ? 'Fahmay' : 'Got It'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
