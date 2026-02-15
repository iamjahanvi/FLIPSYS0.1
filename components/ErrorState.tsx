import React from 'react';

interface ErrorStateProps {
  errorCode: string;
  errorTitle: string;
  failNode: string;
  bufferState: string;
  timestamp: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  errorCode,
  errorTitle,
  failNode,
  bufferState,
  timestamp,
  onRetry,
  onDismiss,
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Stage Area - Error Card */}
      <section className="flex-1 flex flex-col items-center justify-center p-10">
        <div 
          className="w-[500px] max-w-full bg-white p-8 border border-red-600 shadow-[0_30px_60px_-12px_rgba(217,48,37,0.1)]"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)'
          }}
        >
          {/* Error Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-bold text-ink-dim tracking-widest uppercase">CONVERSION FAILED</span>
              <div className="text-lg font-bold text-red-600 mt-1">{errorTitle}</div>
            </div>
            <span className="text-[10px] font-bold text-red-600 tracking-widest">{errorCode}</span>
          </div>
          
          {/* Error Code Block */}
          <div className="bg-gray-100 border-l-[3px] border-red-600 p-4 my-5">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">FAIL_NODE</span>
              <span className="text-ink-main">{failNode}</span>
            </div>
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">BUFFER_STATE</span>
              <span className="text-ink-main">{bufferState}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">TIMESTAMP</span>
              <span className="text-ink-main">{timestamp}</span>
            </div>
          </div>

          {/* Button Group */}
          <div className="flex gap-3 mt-8">
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
              VIEW_DUMP
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Toolbar - Error Details */}
      <section className="h-[220px] md:h-48 bg-[#F0F0F0]/95 border-t border-panel-border flex flex-nowrap overflow-x-auto backdrop-blur-md px-6 py-4 gap-6 shrink-0">
        
        {/* Section 09: Incident Log */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">09 INCIDENT_LOG</span>
          </div>
          <div className="text-[9px] text-ink-dim leading-relaxed overflow-hidden flex-1">
            <div className="mb-1">[14:22:08] Processing page 17/24...</div>
            <div className="mb-1">[14:22:10] Allocating transient_vram...</div>
            <div className="border-l-2 border-red-600 pl-2 mb-1 text-red-600 bg-red-50">[14:22:12] FATAL: Mesh vertex limit exceeded</div>
            <div className="border-l-2 border-red-600 pl-2 text-red-600 bg-red-50">[14:22:12] KERNEL: SIGABRT received from NODE_16</div>
          </div>
        </div>

        {/* Section 10: Troubleshooting */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">10 TROUBLESHOOTING</span>
          </div>
          <ul className="text-[10px] text-ink-dim space-y-2 mt-1">
            <li className="flex gap-2 pb-2 border-b border-dashed border-gray-300">
              <span className="text-red-600">&gt;</span>
              <span>Check PDF for complex vector patterns on pg.17</span>
            </li>
            <li className="flex gap-2 pb-2 border-b border-dashed border-gray-300">
              <span className="text-red-600">&gt;</span>
              <span>Reduce "Mesh Detail" in global settings</span>
            </li>
            <li className="flex gap-2 pb-2 border-b border-dashed border-gray-300">
              <span className="text-red-600">&gt;</span>
              <span>Ensure VRAM is not shared with background apps</span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-600">&gt;</span>
              <span>Flatten PDF layers before re-uploading</span>
            </li>
          </ul>
        </div>

        {/* Section 11: Resource Snapshot */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">11 RESOURCE_SNAPSHOT</span>
          </div>
          <div className="flex flex-col gap-3 mt-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">PEAK_MEM</span>
              <span className="text-ink-main font-bold">3.98 GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">IO_LOAD</span>
              <span className="text-ink-main font-bold">98%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-ink-dim tracking-widest">THREAD_COUNT</span>
              <span className="text-ink-main font-bold">12_ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Section 12: OPS Status */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">12 OPS_STATUS</span>
          </div>
          <div className="flex-1 border border-red-300 bg-red-50 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-red-600">FAIL</span>
            <span className="text-[8px] font-bold text-ink-dim tracking-widest mt-1">SYSCALL_ABORT</span>
          </div>
        </div>
      </section>
    </div>
  );
};
