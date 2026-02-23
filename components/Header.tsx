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
      <div className="flex items-center gap-1 text-xs font-bold tracking-tight shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" className={hasError ? 'text-red-600' : 'text-ink-main'}>
          <g id="devices-fold">
            <path id="Union" fill="currentColor" d="M4 22.0002c-1.10448 0 -1.99986 -0.8955 -2 -2h2zm4 0H6v-2h2zm6.9189 -20.49996c0.9635 -0.41065 2.0809 0.28999 2.0811 1.38282v1.11718h3c1.1046 0 2 0.89543 2 2V20.0002c-0.0002 1.1045 -0.8955 2 -2 2h-9c-0.0383 0 -0.0761 -0.0026 -0.1133 -0.0068 -0.0075 -0.0008 -0.0149 -0.0029 -0.0224 -0.0039 -0.0335 -0.0045 -0.0663 -0.0108 -0.0987 -0.0186 -0.0081 -0.0019 -0.0163 -0.0037 -0.0244 -0.0058 -0.0367 -0.0098 -0.0725 -0.0214 -0.1074 -0.0352 -0.003 -0.0011 -0.0059 -0.0027 -0.0088 -0.0039 -0.0376 -0.0152 -0.0742 -0.0322 -0.1094 -0.0517 -0.0027 -0.0016 -0.006 -0.0024 -0.0088 -0.0039l-0.0937 -0.0625c-0.0111 -0.0081 -0.0225 -0.016 -0.0332 -0.0245 -0.0604 -0.0479 -0.1152 -0.1026 -0.1631 -0.163 -0.0075 -0.0095 -0.0144 -0.0196 -0.0215 -0.0293 -0.0147 -0.02 -0.0288 -0.0405 -0.042 -0.0616 -0.0089 -0.0142 -0.0182 -0.0283 -0.0263 -0.0429 -0.0372 -0.0666 -0.0667 -0.1381 -0.0879 -0.2129 -0.0031 -0.0106 -0.0061 -0.0215 -0.0088 -0.0322 -0.0033 -0.0133 -0.007 -0.0267 -0.0098 -0.0401l-0.0117 -0.0674c-0.0007 -0.005 -0.0004 -0.0105 -0.001 -0.0156 -0.0045 -0.0387 -0.0078 -0.0782 -0.0078 -0.1182V5.56665c0 -0.70232 0.3686 -1.35333 0.9707 -1.71484l3.7578 -2.25489zM17 17.4338c-0.0001 0.7023 -0.3686 1.3534 -0.9707 1.7149l-1.4189 0.8515H20V6.00024h-3zM12 5.56665V19.2336l3 -1.7998V3.76587zM4 18.0002H2v-2h2zm0 -4H2v-2h2zm0 -4H2V8.00024h2zm0 -3.99996H2c0 -1.10457 0.89543 -2 2 -2zm4 0H6v-2h2z" stroke-width="1"></path>
          </g>
        </svg>
        <a href="/" className="hidden sm:inline cursor-pointer hover:opacity-70 transition-opacity tracking-wide">NPM-FLIP</a>
        {/* Mobile: Show NPM-FLIP // page counter when PDF is loaded */}
        {totalPages > 0 && isReady && !hasError ? (
          <a href="/" className="sm:hidden cursor-pointer hover:opacity-70 transition-opacity tracking-wide">
            NPM-FLIP // {`${(currentPage).toString().padStart(2, '0')}-${(totalPages - 1).toString().padStart(2, '0')}`}
          </a>
        ) : (
          <a href="/" className="sm:hidden cursor-pointer hover:opacity-70 transition-opacity tracking-wide">NPM-FLIP</a>
        )}
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