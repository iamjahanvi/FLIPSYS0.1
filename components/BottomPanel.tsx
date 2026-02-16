import React from 'react';

interface BottomPanelProps {
  mode: 'loading' | 'error' | 'toolbar' | 'quickstart';
  incidentLogs?: string[];
  cpuUsage?: number;
  vramUsage?: number;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  mode,
  incidentLogs = [],
  cpuUsage = 42,
  vramUsage = 30,
}) => {
  if (mode === 'loading') {
    return (
      <section className="h-full bg-[#F0F0F0]/95 border-t border-panel-border flex flex-nowrap overflow-x-auto backdrop-blur-md px-6 py-4 gap-6">
        {/* Section 01: Incident Log */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
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
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
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

        {/* Section 03: OPS Health */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">03 OPS_HEALTH</span>
          </div>
          <div className="flex-1 border border-gray-300 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-ink-main">0.00ms</span>
            <span className="text-[8px] font-bold text-ink-dim tracking-widest mt-1">LATENCY_SYNC</span>
          </div>
        </div>
      </section>
    );
  }

  if (mode === 'error') {
    return (
      <section className="h-full bg-[#F0F0F0]/95 border-t border-panel-border flex flex-nowrap overflow-x-auto backdrop-blur-md px-6 py-4 gap-6">
        {/* Section 01: Incident Log */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
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

        {/* Section 02: Troubleshooting */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">02 TROUBLESHOOTING</span>
          </div>
          <ul className="text-[10px] text-ink-dim space-y-2 mt-1">
            <li className="flex gap-2 pb-2 border-b border-dashed border-gray-300">
              <span className="text-red-600">&gt;</span>
              <span>Ensure file is a valid PDF, not a renamed document</span>
            </li>
            <li className="flex gap-2 pb-2 border-b border-dashed border-gray-300">
              <span className="text-red-600">&gt;</span>
              <span>Check if PDF is corrupted or incomplete download</span>
            </li>
            <li className="flex gap-2 pb-2 border-b border-dashed border-gray-300">
              <span className="text-red-600">&gt;</span>
              <span>Try opening PDF in a viewer to verify integrity</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600">&gt;</span>
              <span>Re-export PDF from source application</span>
            </li>
          </ul>
        </div>

        {/* Section 03: OPS Status */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">03 OPS_STATUS</span>
          </div>
          <div className="flex-1 border border-red-300 bg-red-50 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-red-600">FAIL</span>
            <span className="text-[8px] font-bold text-ink-dim tracking-widest mt-1">INVALID_PDF_STRUCTURE</span>
          </div>
        </div>
      </section>
    );
  }

  return null;
};
