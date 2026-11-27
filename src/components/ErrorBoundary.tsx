import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && typeof parsed.error === 'string') {
          friendlyMessage = `${parsed.error} (Operation: ${parsed.operationType || 'unknown'})`;
        }
      } catch {
        // plain error string
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#070E1D] p-6">
          <div className="max-w-lg w-full rounded-[16px] border border-[#E2E8F0] dark:border-[#1E2E4D] bg-white dark:bg-[#0D172B] p-6 shadow-[0_4px_20px_rgba(16,35,75,0.06)]">
            <div className="text-xs font-bold text-[#079B62]">HILAAC Healthcare Learning Platform</div>
            <h2 className="mt-1 font-display text-lg font-bold text-[#10234B] dark:text-white">
              Unable to complete this action
            </h2>
            <p className="mt-2 text-sm text-[#475569] dark:text-slate-300 break-words leading-relaxed">
              {friendlyMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-4 py-2.5 rounded-[10px] bg-[#079B62] hover:bg-[#058152] text-white text-sm font-bold transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
