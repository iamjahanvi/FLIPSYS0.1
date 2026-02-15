import React, { useEffect, useState } from 'react';

interface LoadingStateProps {
  fileName: string;
  totalPages: number;
  currentProcessingPage: number;
  onAbort: () => void;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  fileName,
  totalPages,
  currentProcessingPage,
  onAbort,
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [cpuUsage, setCpuUsage] = useState(42);
  const [vramUsage, setVramUsage] = useState(30);
  const [elapsedTime, setElapsedTime] = useState(0);

  const progress = totalPages > 0 ? (currentProcessingPage / totalPages) * 100 : 0;
  
  // Simulate elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate log entries
  useEffect(() => {
    const getTimestamp = () => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    };

    if (currentProcessingPage > 0) {
      const newLog = `[${getTimestamp()}] Processing page ${currentProcessingPage}/${totalPages}...`;
      setLogs(prev => [...prev.slice(-3), newLog]);
    }
  }, [currentProcessingPage, totalPages]);

  // Simulate resource fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 30) + 35);
      setVramUsage(Math.floor(Math.random() * 20) + 25);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedRemaining = totalPages > 0 && currentProcessingPage > 0 
    ? Math.ceil((totalPages - currentProcessingPage) * (elapsedTime / currentProcessingPage))
    : 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Stage Area - Processing Card */}
      <section className="flex-1 flex flex-col items-center justify-center p-10">
        <div 
          className="w-[500px] max-w-full bg-white p-8 border border-gray-300 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)]"
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
          <div className="flex justify-between mb-8">
            <div>
              <span className="text-[10px] font-bold text-ink-dim tracking-widest uppercase block mb-1">CURRENT_NODE</span>
              <span className="text-sm font-bold text-ink-main">PAGE_{currentProcessingPage}.RENDER</span>
            </div>
            <div className="text-right">
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

      {/* Bottom Toolbar - Processing Stats */}
      <section className="h-[220px] md:h-48 bg-[#F0F0F0]/95 border-t border-panel-border flex flex-nowrap overflow-x-auto backdrop-blur-md px-6 py-4 gap-6 shrink-0">
        
        {/* Section 05: Thread Log */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">05 THREAD_LOG</span>
          </div>
          <div className="text-[9px] text-ink-dim leading-relaxed overflow-hidden flex-1">
            {logs.length === 0 && (
              <>
                <div className="border-l-2 border-ink-light pl-2 mb-1">[--:--:--] Initializing stream...</div>
                <div className="border-l-2 border-ink-light pl-2 mb-1">[--:--:--] Loading PDF engine</div>
              </>
            )}
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`border-l-2 pl-2 mb-1 ${index === logs.length - 1 ? 'border-ink-main text-ink-main font-bold' : 'border-ink-light'}`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Section 06: System Resources */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">06 SYS_RESOURCES</span>
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

        {/* Section 07: Cache Allocation */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">07 CACHE_ALLOC</span>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-[8px] font-bold text-ink-dim tracking-widest">BUFFER_SWAP</span>
              <span className="text-ink-main font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[8px] font-bold text-ink-dim tracking-widest">TEMP_STORAGE</span>
              <span className="text-ink-main font-bold">142.4 MB</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[8px] font-bold text-ink-dim tracking-widest">VOLATILE_MEM</span>
              <span className="text-ink-main font-bold">OK</span>
            </div>
          </div>
        </div>

        {/* Section 08: OPS Health */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">08 OPS_HEALTH</span>
          </div>
          <div className="flex-1 border border-gray-300 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-ink-main">0.00ms</span>
            <span className="text-[8px] font-bold text-ink-dim tracking-widest mt-1">LATENCY_SYNC</span>
          </div>
        </div>
      </section>
    </div>
  );
};
