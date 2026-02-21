import React, { useEffect, useRef } from 'react';

interface ErrorStateProps {
  errorCode: string;
  errorTitle: string;
  failNode: string;
  bufferState: string;
  timestamp: string;
  onRetry: () => void;
  onDismiss: () => void;
  incidentLogs: string[];
  hasInitialized?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  errorCode,
  errorTitle,
  failNode,
  bufferState,
  timestamp,
  onRetry,
  onDismiss,
  incidentLogs,
  hasInitialized = false,
}) => {
  const incidentLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (incidentLogRef.current) {
      incidentLogRef.current.scrollTop = incidentLogRef.current.scrollHeight;
    }
  }, [incidentLogs]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stage Area - Error Card (shown immediately with error state) */}
      <section className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 pb-32 md:pb-10 overflow-y-auto">
        <div 
          className="w-full max-w-[500px] bg-white p-6 sm:p-8 border border-red-600 shadow-[0_30px_60px_-12px_rgba(217,48,37,0.1)]"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
          }}
        >
          {/* Error Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-2 sm:gap-0">
            <div>
              <span className="text-[10px] font-bold text-ink-dim tracking-widest uppercase">CONVERSION FAILED</span>
              <div className="text-base sm:text-lg font-bold text-red-600 mt-1">INVALID_PDF_STRUCTURE</div>
            </div>
            <span className="text-[10px] font-bold text-red-600 tracking-widest">ERR_PDF_001</span>
          </div>
          
          {/* Error Code Block */}
          <div className="bg-gray-100 border-l-[3px] border-red-600 p-4 my-5">
            <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] mb-1.5 gap-1 sm:gap-0">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">FAIL_NODE</span>
              <span className="text-ink-main">PDF_PARSER_V2</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] mb-1.5 gap-1 sm:gap-0">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">BUFFER_STATE</span>
              <span className="text-ink-main">HEADER_VALIDATION_FAILED</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] gap-1 sm:gap-0">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">TIMESTAMP</span>
              <span className="text-ink-main">{timestamp}</span>
            </div>
          </div>

          {/* Button Group */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={onRetry}
              className="flex-1 py-3 bg-ink-main text-white text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors"
            >
              RETRY_CONVERSION
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 py-3 bg-transparent border border-gray-300 text-ink-dim text-[10px] font-bold tracking-widest uppercase hover:bg-gray-100 hover:text-ink-main transition-colors"
            >
              Abort_and_Revert
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Toolbar - Error Details - Responsive */}
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

          {/* Section 02: Troubleshooting */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 border-r border-panel-border pr-6">
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
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">03 OPS_STATUS</span>
            </div>
            <div className="flex-1 border border-red-300 bg-red-50 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-red-600">FAIL</span>
              <span className="text-[8px] font-bold text-ink-dim tracking-widest mt-1">INVALID_PDF_STRUCTURE</span>
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
