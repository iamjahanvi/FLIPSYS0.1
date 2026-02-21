import React, { useEffect, useState, useRef } from 'react';

interface LoadingStateProps {
  fileName: string;
  fileSize?: number;
  totalPages: number;
  currentProcessingPage: number;
  onAbort: () => void;
  incidentLogs: string[];
  hasInitialized?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  fileName,
  fileSize,
  totalPages,
  currentProcessingPage,
  onAbort,
  incidentLogs,
  hasInitialized = false,
}) => {
  const [cpuUsage, setCpuUsage] = useState(42);
  const [vramUsage, setVramUsage] = useState(30);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [processingStatus, setProcessingStatus] = useState<'IDLE' | 'SYNCING' | 'ACTIVE'>('SYNCING');
  const incidentLogRef = useRef<HTMLDivElement>(null);

  const calculatedProgress = totalPages > 0 ? (currentProcessingPage / totalPages) * 100 : 0;
  const progress = Math.max(calculatedProgress, 5); // Show at least 5% progress initially
  
  // Simulate elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate resource fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 30) + 35);
      setVramUsage(Math.floor(Math.random() * 20) + 25);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update processing status based on progress
  useEffect(() => {
    if (currentProcessingPage === 0) {
      setProcessingStatus('SYNCING');
    } else if (currentProcessingPage >= (totalPages || 1)) {
      setProcessingStatus('IDLE');
    } else {
      setProcessingStatus('ACTIVE');
    }
  }, [currentProcessingPage, totalPages]);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (incidentLogRef.current) {
      incidentLogRef.current.scrollTop = incidentLogRef.current.scrollHeight;
    }
  }, [incidentLogs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const estimatedRemaining = totalPages > 0 && currentProcessingPage > 0 
    ? Math.ceil((totalPages - currentProcessingPage) * (elapsedTime / currentProcessingPage))
    : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stage Area - Processing Card */}
      <section className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 pb-32 md:pb-10 overflow-y-auto">
        <div 
          className="w-full max-w-[500px] bg-white p-6 sm:p-8 border border-gray-300 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)]"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
          }}
        >
          {/* Header Row */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest uppercase">CONVERTING ASSETS</span>
            <span className="text-sm font-bold text-ink-main">{progress.toFixed(1)}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200 w-full mb-6 relative overflow-hidden">
            <div 
              className="h-full bg-ink-main relative transition-all duration-300"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[slide_1.5s_infinite]"></div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4 sm:gap-0">
            <div>
              <span className="text-[10px] font-bold text-ink-dim tracking-widest uppercase block mb-1">CURRENT_NODE</span>
              <span className="text-sm font-bold text-ink-main">PAGE_{currentProcessingPage}.RENDER</span>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest uppercase block mb-1">EST_REMAINING</span>
              <span className="text-sm font-bold text-ink-main">{formatTime(estimatedRemaining)}</span>
            </div>
          </div>

          {/* Abort Button */}
          <button
            onClick={onAbort}
            className="w-full py-2.5 bg-transparent border border-gray-300 text-ink-dim text-[9px] font-bold tracking-widest uppercase hover:bg-gray-100 hover:text-ink-main hover:border-ink-main transition-all"
          >
            ABORT_PROCESS
          </button>
        </div>
      </section>

      {/* Bottom Toolbar - Processing Stats - Responsive accordion on mobile */}
      <section className={`bg-[#F0F0F0]/95 border-t border-panel-border backdrop-blur-md shrink-0 overflow-x-hidden md:h-48 pb-[env(safe-area-inset-bottom,0px)] ${hasInitialized ? 'transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] translate-y-0 opacity-100' : ''}`}>
        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex h-full px-6 py-4 gap-6">
          {/* Section 01: Incident Log */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 border-r border-panel-border pr-6">
            <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">01 INCIDENT_LOG</span>
            </div>
            <div className="text-[9px] text-ink-dim leading-relaxed overflow-hidden flex-1">
              {incidentLogs.length === 0 && (
                <div className="border-l-2 border-ink-light pl-2 mb-1">[--:--:--] Initializing...</div>
              )}
              {incidentLogs.map((log, index) => {
                const isError = log.includes('FATAL:') || log.includes('PARSER:');
                const isLast = index === incidentLogs.length - 1;
                return (
                  <div 
                    key={index} 
                    className={`border-l-2 pl-2 mb-1 ${isError ? 'border-red-600 text-red-600 bg-red-50' : isLast ? 'border-ink-main text-ink-main font-bold' : 'border-ink-light'}`}
                  >
                    {log}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 02: System Resources */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 border-r border-panel-border pr-6">
            <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">02 SYS_RESOURCES</span>
            </div>
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-ink-dim">CPU_USAGE</span>
                  <span className="text-ink-main font-bold">{cpuUsage}%</span>
                </div>
                <div className="h-1.5 bg-gray-300 w-full">
                  <div className="h-full bg-ink-dim transition-all duration-500" style={{ width: `${cpuUsage}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-ink-dim">VRAM_ALLOC</span>
                  <span className="text-ink-main font-bold">1.2GB / 4.0GB</span>
                </div>
                <div className="h-1.5 bg-gray-300 w-full">
                  <div className="h-full bg-ink-dim transition-all duration-500" style={{ width: `${vramUsage}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 03: OPS Health - File Size */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">03 OPS_HEALTH</span>
              <span className={`text-[10px] font-bold tracking-widest ${processingStatus === 'ACTIVE' ? 'text-green-600' : processingStatus === 'SYNCING' ? 'text-amber-600' : 'text-ink-dim'}`}>
                {processingStatus}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center border border-gray-200 bg-white">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest uppercase mb-2">
                File Size
              </span>
              <span className="text-4xl font-bold text-ink-main">
                {formatFileSize(fileSize)}
              </span>
              <span className="text-[9px] text-ink-dim mt-1">
                PDF DOCUMENT
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* Mobile: Sticky Incident Log - Outside of bottom toolbar to avoid overflow clipping */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F0F0F0]/95 border-t border-panel-border backdrop-blur-md z-50 pb-[env(safe-area-inset-bottom,16px)]">
        {/* Section 01: Incident Log */}
        <div className="p-4">
          <div className="flex justify-between items-center pb-2 border-b border-ink-light mb-2">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">01 INCIDENT_LOG</span>
          </div>
          <div ref={incidentLogRef} className="text-[9px] text-ink-dim leading-relaxed overflow-hidden">
            {incidentLogs.length === 0 && (
              <div className="border-l-2 border-ink-light pl-2 mb-1">[--:--:--] Initializing...</div>
            )}
            {incidentLogs.map((log, index) => {
              const isError = log.includes('FATAL:') || log.includes('PARSER:');
              const isLast = index === incidentLogs.length - 1;
              return (
                <div 
                  key={index} 
                  className={`border-l-2 pl-2 mb-1 ${isError ? 'border-red-600 text-red-600 bg-red-50' : isLast ? 'border-ink-main text-ink-main font-bold' : 'border-ink-light'}`}
                >
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
