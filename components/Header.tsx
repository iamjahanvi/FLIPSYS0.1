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
      <a href="/" className={`flex items-center gap-2 text-xs font-bold tracking-tight shrink-0 cursor-pointer hover:opacity-70 transition-opacity ${hasError ? 'text-red-600' : 'text-ink-main'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" className="text-current">
          <g id="Auto-Stories-Alt">
            <path id="Vector" fill="currentColor" d="M16.9121 3.85352c1.0538 -0.10157 2.1404 -0.0816 3.1318 0.12207 0.9845 0.2023 1.9469 0.60135 2.6631 1.31738 0.1874 0.18748 0.293 0.44293 0.293 0.70801V17.751c-0.0003 0.3462 -0.18 0.6685 -0.4746 0.8506 -0.2947 0.1818 -0.6629 0.1978 -0.9727 0.0429 -1.28 -0.6399 -2.908 -0.8486 -4.5605 -0.6611 -1.6506 0.1873 -3.2401 0.7608 -4.419 1.5859 -0.3442 0.2409 -0.8022 0.2409 -1.1464 0 -1.1789 -0.8251 -2.76839 -1.3986 -4.41899 -1.5859 -1.65247 -0.1875 -3.28051 0.0212 -4.56054 0.6611 -0.30977 0.1549 -0.67798 0.1389 -0.97266 -0.0429 -0.29456 -0.1821 -0.47435 -0.5044 -0.47461 -0.8506V6.00098l0.00488 -0.09961c0.02282 -0.22866 0.12421 -0.44445 0.28809 -0.6084C1.77342 4.81264 2.36567 4.47741 3 4.24609V16.2988c1.35474 -0.3857 2.82206 -0.4628 4.2334 -0.3027 1.58849 0.1803 3.1649 0.6663 4.502 1.4111l0.2646 0.1524V5.30762c1.2916 -0.74856 3.1366 -1.28291 4.9121 -1.4541m2.7285 2.08105c-0.7472 -0.15345 -1.6254 -0.17774 -2.5371 -0.08984 -1.1271 0.10868 -2.2213 0.37985 -3.1035 0.72265V16.6299c0.8863 -0.3122 1.8244 -0.5269 2.7666 -0.6338 1.4113 -0.1601 2.8787 -0.083 4.2334 0.3027V6.46582c-0.3372 -0.23161 -0.7908 -0.41444 -1.3594 -0.53125M10 5.5V15l-5 -4.5V0.5z" stroke-width="1"></path>
          </g>
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