import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Toolbar, SectionType } from './components/Toolbar';
import { Stage } from './components/Stage';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { LandingPage } from './components/LandingPage';
import { Config, DefaultConfig } from './types';
import { getPDF } from './lib/supabase';

// PDF.js worker setup is required for react-pdf
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const getShareIdFromLocation = (): string | null => {
  const url = new URL(window.location.href);
  const searchShareId = url.searchParams.get('share')?.trim();
  if (searchShareId) return searchShareId;

  const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (!rawHash) return null;

  const hashQuery = rawHash.includes('?') ? rawHash.split('?')[1] : rawHash;
  const hashShareId = new URLSearchParams(hashQuery).get('share')?.trim();
  return hashShareId || null;
};

export default function App() {
  // Shared mode is derived from URL query/hash once and kept in state to prevent UI mode flicker.
  const [shareId, setShareId] = useState<string | null>(() => getShareIdFromLocation());
  const [isRouteResolved, setIsRouteResolved] = useState<boolean>(false);
  const isSharedView = Boolean(shareId);

  const [config, setConfig] = useState<Config>(DefaultConfig);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorInfo, setErrorInfo] = useState<{ code: string; title: string; node: string; buffer: string; timestamp: string } | null>(null);
  const [processingPage, setProcessingPage] = useState<number>(0);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  
  // Shared incident logs between LoadingState and ErrorState
  const [incidentLogs, setIncidentLogs] = useState<string[]>([]);
  const [isErrorLogShown, setIsErrorLogShown] = useState<boolean>(false);
  const logTimersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const [sharedLoadState, setSharedLoadState] = useState<'idle' | 'fetching' | 'error' | 'ready'>(
    shareId ? 'fetching' : 'idle'
  );
  const [sharedLoadError, setSharedLoadError] = useState<string | null>(null);
  const [toolbarAccordionSection, setToolbarAccordionSection] = useState<SectionType>('source');

  // Background pattern style from the design
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: '#F0F0F0',
    backgroundImage: `
      radial-gradient(circle, #D6D6D6 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
  };

  // Set initialized flag after mount to enable transitions
  useEffect(() => {
    setHasInitialized(true);
  }, []);

  useEffect(() => {
    const syncShareId = () => {
      setShareId(getShareIdFromLocation());
      setIsRouteResolved(true);
    };

    syncShareId();
    window.addEventListener('popstate', syncShareId);
    window.addEventListener('hashchange', syncShareId);

    return () => {
      window.removeEventListener('popstate', syncShareId);
      window.removeEventListener('hashchange', syncShareId);
    };
  }, []);

  const clearLogTimers = () => {
    logTimersRef.current.forEach(clearTimeout);
    logTimersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearLogTimers();
    };
  }, []);
  
  // Switch to error state when error log is shown
  useEffect(() => {
    if (isErrorLogShown && errorInfo) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [isErrorLogShown, errorInfo]);

  // Load shared PDF from URL parameter
  useEffect(() => {
    if (!isRouteResolved) return;

    if (!isSharedView || !shareId) {
      setSharedLoadState('idle');
      setSharedLoadError(null);
      return;
    }

    setSharedLoadState('fetching');
    setSharedLoadError(null);

    let cancelled = false;

    const loadSharedPDF = async () => {
      try {
        const result = await getPDF(shareId);
        if (!result) throw new Error('Shared PDF not found');

        if (result.config) {
          setConfig(prev => ({
            ...prev,
            ...result.config,
          }));
        }

        const response = await fetch(result.url);
        if (!response.ok) throw new Error('Failed to download shared PDF');
        const blob = await response.blob();
        if (cancelled) return;

        const file = new File([blob], result.fileName, { type: 'application/pdf' });
        clearLogTimers();
        setPdfFile(file);
        setCurrentPage(0);
        setIsReady(false);
        setIsLoading(false);
        setHasError(false);
        setErrorInfo(null);
        setProcessingPage(0);
        setIncidentLogs([]);
        setIsErrorLogShown(false);
        setTotalPages(0);
        setSharedLoadState('ready');
      } catch (err: any) {
        if (cancelled) return;
        setIsLoading(false);
        setPdfFile(null);
        setSharedLoadState('error');
        setSharedLoadError(err?.message || 'Failed to load shared PDF');
      }
    };

    loadSharedPDF();

    return () => {
      cancelled = true;
    };
  }, [isRouteResolved, isSharedView, shareId]);

  const handleUpload = (file: File) => {
    setPdfFile(file);
    setCurrentPage(0);
    setIsReady(false);
    setIsLoading(true);
    setHasError(false);
    setErrorInfo(null);
    setProcessingPage(0);
    setIncidentLogs([]);
    setIsErrorLogShown(false);
    
    // Start incident log animation only for non-shared interactive uploads.
    if (!isSharedView) {
      startIncidentLogAnimation(false);
    }
  };
  
  // Shared incident log animation for both loading and error states
  const startIncidentLogAnimation = (isError: boolean) => {
    // Clear any existing timers
    clearLogTimers();
    
    const getTimestamp = () => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    };
    
    const allLogs = [
      `[${getTimestamp()}] Initializing PDF parser...`,
      `[${getTimestamp()}] Loading document structure...`,
      `[${getTimestamp()}] Validating file header...`,
      `[${getTimestamp()}] Checking PDF signature...`,
      `[${getTimestamp()}] Parsing document catalog...`,
      `[${getTimestamp()}] Analyzing page tree...`,
    ];
    
    // Add error logs if this is an error scenario
    if (isError) {
      allLogs.push(`[${getTimestamp()}] FATAL: Invalid PDF structure detected`);
      allLogs.push(`[${getTimestamp()}] PARSER: PDF header signature not found`);
    }
    
    // Animate logs appearing one by one
    allLogs.forEach((log, index) => {
      const timer = setTimeout(() => {
        setIncidentLogs(prev => [...prev, log]);
        
        // If this is the last error log, trigger error state
        if (isError && log.includes('PARSER:')) {
          setIsErrorLogShown(true);
        }
      }, index * 250);
      logTimersRef.current.push(timer);
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);

    if (isSharedView) {
      // Skip loading animation for shared PDFs - show immediately
      setIsLoading(false);
      setIsReady(true);
    } else {
      // Simulate page-by-page processing with realistic timing for uploads
      let page = 0;
      const processingTime = Math.max(100, Math.min(500, 3000 / numPages));
      const interval = setInterval(() => {
        page++;
        setProcessingPage(page);
        if (page >= numPages) {
          clearInterval(interval);
          setTimeout(() => {
            setIsLoading(false);
            setIsReady(true);
          }, 800);
        }
      }, processingTime);
    }
  };

  const handleAbortProcessing = () => {
    clearLogTimers();
    setIsLoading(false);
    setPdfFile(null);
    setTotalPages(0);
    setProcessingPage(0);
    setIncidentLogs([]);
    setIsErrorLogShown(false);
  };

  const handleError = (errorMessage: string) => {
    console.log('handleError called with:', errorMessage);
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    // Set error info
    setErrorInfo({
      code: 'ERR_PDF_001',
      title: 'INVALID_PDF_STRUCTURE',
      node: 'PDF_PARSER_V2',
      buffer: 'HEADER_VALIDATION_FAILED',
      timestamp: timestamp,
    });
    
    // Clear any pending log timers to stop adding normal logs
    clearLogTimers();
    
    // Add error logs to existing logs (don't clear)
    const getTimestamp = () => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    };
    
    // Add error logs after a short delay
    const errorTimer1 = setTimeout(() => {
      setIncidentLogs(prev => [...prev, `[${getTimestamp()}] FATAL: Invalid PDF structure detected`]);
    }, 250);
    logTimersRef.current.push(errorTimer1);
    
    const errorTimer2 = setTimeout(() => {
      setIncidentLogs(prev => [...prev, `[${getTimestamp()}] PARSER: PDF header signature not found`]);
      setIsErrorLogShown(true);
    }, 500);
    logTimersRef.current.push(errorTimer2);
  };

  const handleRetry = () => {
    if (pdfFile) {
      setHasError(false);
      setErrorInfo(null);
      setIsLoading(true);
      setProcessingPage(0);
      setIncidentLogs([]);
      setIsErrorLogShown(false);
      // Re-trigger the document load
      setTotalPages(0);
      // Restart log animation
      startIncidentLogAnimation(false);
    }
  };

  const handleDismissError = () => {
    clearLogTimers();
    setHasError(false);
    setErrorInfo(null);
    setPdfFile(null);
    setTotalPages(0);
    setIncidentLogs([]);
    setIsErrorLogShown(false);
  };

  const showSharedLoader =
    isRouteResolved &&
    isSharedView &&
    !hasError &&
    sharedLoadState !== 'error' &&
    (!pdfFile || totalPages === 0);

  return (
    <div className={`h-[100dvh] w-screen flex flex-col font-mono text-ink-main overflow-x-hidden overflow-y-hidden select-none ${isSharedView ? 'bg-[#E6E6E6]' : ''}`} style={isSharedView ? undefined : backgroundStyle}>
      {/* Header - simplified for shared view */}
      {isRouteResolved && !isSharedView && <Header isReady={isReady} isLoading={isLoading} hasError={hasError} />}
      
      {/* Shared view header */}
      {isRouteResolved && isSharedView && (
        <header className="h-12 flex items-center px-4 sm:px-10 justify-between bg-transparent z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
            <span className="w-2 h-2 bg-ink-main rounded-full"></span>
            <span className="hidden sm:inline">NPM-FLIP // SYS.01 // READ_MODE</span>
            <span className="sm:hidden">NPM-FLIP // READ</span>
          </div>
          <a 
            href="/" 
            className="text-[10px] font-bold border-b border-ink-main pb-0.5 hover:opacity-70 transition-opacity"
          >
            EXIT
          </a>
        </header>
      )}

      <main className={`${pdfFile || isLoading || hasError ? 'flex-1' : ''} flex flex-col min-h-0 relative overflow-hidden ${isSharedView ? 'pb-0' : ''}`}>
        {/* Error State - Shows when processing fails */}
        {hasError && errorInfo && (
          <ErrorState
            errorCode={errorInfo.code}
            errorTitle={errorInfo.title}
            failNode={errorInfo.node}
            bufferState={errorInfo.buffer}
            timestamp={errorInfo.timestamp}
            onRetry={handleRetry}
            onDismiss={handleDismissError}
            incidentLogs={incidentLogs}
            hasInitialized={hasInitialized}
          />
        )}

        {/* Loading State - Shows during PDF processing */}
        {!isSharedView && isLoading && pdfFile && !hasError && (
          <LoadingState
            fileName={pdfFile.name}
            fileSize={pdfFile.size}
            totalPages={totalPages}
            currentProcessingPage={processingPage}
            onAbort={handleAbortProcessing}
            incidentLogs={incidentLogs}
            hasInitialized={hasInitialized}
          />
        )}

        {/* Stage - Only render when PDF is loaded */}
        {(!isLoading || isSharedView) && !hasError && pdfFile && (
          <Stage
            pdfFile={pdfFile}
            config={config}
            onDocumentLoadSuccess={handleDocumentLoadSuccess}
            onPageChange={handlePageChange}
            currentPage={currentPage}
            totalPages={totalPages}
            onError={handleError}
            isSharedView={isSharedView}
            toolbarAccordionSection={toolbarAccordionSection}
          />
        )}

        {/* Hidden Stage for PDF processing (loads PDF in background) */}
        {!isSharedView && isLoading && pdfFile && (
          <div className="hidden">
            <Stage
              pdfFile={pdfFile}
              config={config}
              onDocumentLoadSuccess={handleDocumentLoadSuccess}
              onPageChange={handlePageChange}
              currentPage={currentPage}
              totalPages={totalPages}
              onError={handleError}
              isSharedView={isSharedView}
            />
          </div>
        )}

        {/* Shared loading state to prevent blank/flash transitions while PDF metadata/pages initialize */}
        {showSharedLoader && (
          <section className="absolute inset-0 z-30 flex items-center justify-center px-4 sm:px-6 pointer-events-none">
            <div className="w-full max-w-[560px] border border-panel-border bg-[#F0F0F0]/95 backdrop-blur-sm p-4 sm:p-6">
              <div className="flex justify-between items-center pb-2 border-b border-ink-light">
                <span className="text-[10px] font-bold text-ink-dim tracking-widest">READ_MODE_BOOT</span>
                <span className="text-[10px] font-bold text-ink-main tracking-widest">LOADING</span>
              </div>
              <p className="text-xs text-ink-main mt-4">Preparing shared flipbook…</p>
            </div>
          </section>
        )}

        {/* Shared error state */}
        {isSharedView && sharedLoadState === 'error' && (
          <section className="absolute inset-0 z-30 flex items-center justify-center px-4 sm:px-6">
            <div className="w-full max-w-[560px] border border-red-300 bg-white p-4 sm:p-6">
              <div className="flex justify-between items-center pb-2 border-b border-ink-light">
                <span className="text-[10px] font-bold text-ink-dim tracking-widest">READ_MODE_BOOT</span>
                <span className="text-[10px] font-bold text-red-600 tracking-widest">FAILED</span>
              </div>
              <p className="text-sm text-ink-main mt-4">{sharedLoadError || 'Unable to load shared flipbook.'}</p>
              <a
                href="/"
                className="inline-block mt-4 text-[10px] font-bold border-b border-ink-main pb-0.5 hover:opacity-70 transition-opacity"
              >
                RETURN_HOME
              </a>
            </div>
          </section>
        )}

        {/* Landing Page - Shows when no file uploaded (hidden in shared view) */}
        {isRouteResolved && !isSharedView && !pdfFile && !isLoading && !hasError && (
          <LandingPage onUpload={handleUpload} />
        )}

        {/* Toolbar - Shows only after file uploaded AND processing complete AND no error (hidden in shared view) */}
        {!isSharedView && !hasError && (
          <div className={`absolute bottom-0 left-0 right-0 z-40 ${hasInitialized ? 'transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]' : ''} ${pdfFile && !isLoading ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
            <Toolbar
              config={config}
              setConfig={setConfig}
              onUpload={handleUpload}
              pdfName={pdfFile?.name}
              pdfSize={pdfFile?.size}
              pdfFile={pdfFile}
              onAccordionChange={setToolbarAccordionSection}
            />
          </div>
        )}
      </main>
    </div>
  );
}
