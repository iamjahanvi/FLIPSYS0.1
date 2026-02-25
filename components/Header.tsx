import React from 'react';

interface HeaderProps {
  isReady: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  currentPage?: number;
  totalPages?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  isReady, 
  isLoading = false, 
  hasError = false,
  currentPage = 0,
  totalPages = 0
}) => {
  return (
    <header className="h-12 border-b border-panel-border flex items-center justify-between px-4 md:px-6 bg-[#F0F0F0]/80 backdrop-blur-sm z-50">
      {/* Logo - always visible */}
      <a href="/" className={`flex items-center gap-[2px] text-xs font-bold tracking-tight shrink-0 cursor-pointer hover:opacity-70 transition-opacity ${hasError ? 'text-red-600' : 'text-ink-main'}`}>
        <svg width="16" height="16" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-current">
          <path d="M120.001 186.146C127.652 181.729 137.436 184.351 141.854 192.002C146.271 199.653 143.65 209.437 135.999 213.854C128.348 218.272 118.563 215.65 114.146 207.999C109.728 200.348 112.35 190.564 120.001 186.146ZM161.837 42.1484C169.538 37.7125 179.39 40.3518 183.841 48.0439C188.292 55.7361 185.657 65.5678 177.956 70.0039L117.489 104.836L141.75 118.812C147.375 122.052 150.296 128.171 149.728 134.232C149.479 137.987 147.919 141.671 145.043 144.54L122.247 167.284C115.952 173.565 105.746 173.565 99.4512 167.284C93.1567 161.003 93.1565 150.821 99.4512 144.54L107.682 136.328L78.0488 119.258C72.732 116.195 69.83 110.56 70.0078 104.833C69.8323 99.1082 72.7339 93.4758 78.0488 90.4141L161.837 42.1484Z" fill="currentColor"/>
        </svg>
        <span className="hidden sm:inline tracking-wide">FLIP-D</span>
        {/* Mobile: Show FLIP-D // page counter when PDF is loaded */}
        {totalPages > 0 && isReady && !hasError ? (
          <span className="sm:hidden tracking-wide">
            FLIP-D // {`${(currentPage).toString().padStart(2, '0')}-${(totalPages - 1).toString().padStart(2, '0')}`}
          </span>
        ) : (
          <span className="sm:hidden tracking-wide">FLIP-D</span>
        )}
      </a>

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