import React from 'react';

interface HeaderProps {
  isReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isReady }) => {
  return (
    <header className="h-12 border-b border-panel-border flex items-center justify-between px-6 bg-[#E6E6E6]/80 backdrop-blur-sm z-50">
      <div className="flex items-center gap-3 text-xs font-bold tracking-tight">
        <div className="w-2 h-2 rounded-full bg-ink-main"></div>
        PDF2FLIP // SYS.01
      </div>
      
      <div className="flex gap-6">
        <div className="flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
          <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isReady ? 'bg-sys-accent shadow-[0_0_4px_#00FF00]' : 'bg-ink-dim'}`}></div>
          ENGINE READY
        </div>
        <div className="flex items-center gap-2 text-[10px] text-ink-dim font-bold tracking-wider">
          <div className="w-1 h-1 rounded-full bg-ink-dim animate-pulse"></div>
          SYNC
        </div>
      </div>
    </header>
  );
};