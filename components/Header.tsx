import React from 'react';

interface HeaderProps {
  isReady: boolean;
  isLoading?: boolean;
  hasError?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isReady, isLoading = false, hasError = false }) => {
  return (
    <header className="h-12 border-b border-panel-border flex items-center justify-between px-4 md:px-6 bg-[#E6E6E6]/80 backdrop-blur-sm z-50">
      {/* Logo - always visible */}
      <div className="flex items-center gap-2 md:gap-3 text-xs font-bold tracking-tight shrink-0">
        <div className={`w-2 h-2 rounded-full ${hasError ? 'bg-red-600' : 'bg-ink-main'}`}></div>
        <span className="hidden sm:inline">NPM-FLIP // SYS.01</span>
        <span className="sm:hidden">NPM-FLIP</span>
      </div>
      
      {/* Status indicators - responsive */}
      <div className="flex gap-3 md:gap-6">
        {hasError ? (
          <>
            <div className="flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
              <div className="w-1 h-1 rounded-full bg-red-600 shadow-[0_0_4px_#D93025]"></div>
              <span className="hidden sm:inline">PROCESS_HALTED</span>
              <span className="sm:hidden">HALTED</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
              <div className="w-1 h-1 rounded-full bg-red-600 shadow-[0_0_4px_#D93025]"></div>
              CRITICAL_EXCEPTION
            </div>
          </>
        ) : isLoading ? (
          <>
            <div className="flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
              <div className="w-1 h-1 rounded-full bg-yellow-400 shadow-[0_0_4px_#FFCC00] animate-pulse"></div>
              <span className="hidden sm:inline">CONVERTING_STREAM</span>
              <span className="sm:hidden">CONVERTING</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
              <div className="w-1 h-1 rounded-full bg-sys-accent shadow-[0_0_4px_#00FF00]"></div>
              GPU_ACCEL
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
              <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isReady ? 'bg-sys-accent shadow-[0_0_4px_#00FF00]' : 'bg-ink-dim'}`}></div>
              <span className="hidden sm:inline">ENGINE READY</span>
              <span className="sm:hidden">READY</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
              <div className="w-1 h-1 rounded-full bg-ink-dim animate-pulse"></div>
              SYNC
            </div>
          </>
        )}
      </div>
    </header>
  );
};