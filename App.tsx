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
  const [isToolbarMinimized, setIsToolbarMinimized] = useState(false);

  // Background pattern style from the design
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: '#F0F0F0',
    backgroundImage: `
      radial-gradient(circle, #D6D6D6 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
  };

  // Shared view background pattern style
  const sharedViewBackgroundStyle: React.CSSProperties = {
    backgroundColor: '#F0F0F0F2',
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
    <div className="h-[100dvh] w-screen flex flex-col font-mono text-ink-main overflow-visible select-none" style={isSharedView ? sharedViewBackgroundStyle : backgroundStyle}>
      {/* Header - simplified for shared view */}
      {isRouteResolved && !isSharedView && <Header isReady={isReady} isLoading={isLoading} hasError={hasError} currentPage={currentPage} totalPages={totalPages} />}
      
      {/* Shared view header */}
      {isRouteResolved && isSharedView && (
        <header className="h-12 flex items-center px-4 sm:px-10 justify-between bg-transparent z-10 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold tracking-tight text-ink-main">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="16" width="16" className="text-current">
              <g id="Auto-Stories-Alt">
                <path id="Vector" fill="currentColor" d="M16.9121 3.85352c1.0538 -0.10157 2.1404 -0.0816 3.1318 0.12207 0.9845 0.2023 1.9469 0.60135 2.6631 1.31738 0.1874 0.18748 0.293 0.44293 0.293 0.70801V17.751c-0.0003 0.3462 -0.18 0.6685 -0.4746 0.8506 -0.2947 0.1818 -0.6629 0.1978 -0.9727 0.0429 -1.28 -0.6399 -2.908 -0.8486 -4.5605 -0.6611 -1.6506 0.1873 -3.2401 0.7608 -4.419 1.5859 -0.3442 0.2409 -0.8022 0.2409 -1.1464 0 -1.1789 -0.8251 -2.76839 -1.3986 -4.41899 -1.5859 -1.65247 -0.1875 -3.28051 0.0212 -4.56054 0.6611 -0.30977 0.1549 -0.67798 0.1389 -0.97266 -0.0429 -0.29456 -0.1821 -0.47435 -0.5044 -0.47461 -0.8506V6.00098l0.00488 -0.09961c0.02282 -0.22866 0.12421 -0.44445 0.28809 -0.6084C1.77342 4.81264 2.36567 4.47741 3 4.24609V16.2988c1.35474 -0.3857 2.82206 -0.4628 4.2334 -0.3027 1.58849 0.1803 3.1649 0.6663 4.502 1.4111l0.2646 0.1524V5.30762c1.2916 -0.74856 3.1366 -1.28291 4.9121 -1.4541m2.7285 2.08105c-0.7472 -0.15345 -1.6254 -0.17774 -2.5371 -0.08984 -1.1271 0.10868 -2.2213 0.37985 -3.1035 0.72265V16.6299c0.8863 -0.3122 1.8244 -0.5269 2.7666 -0.6338 1.4113 -0.1601 2.8787 -0.083 4.2334 0.3027V6.46582c-0.3372 -0.23161 -0.7908 -0.41444 -1.3594 -0.53125M10 5.5V15l-5 -4.5V0.5z" stroke-width="1"></path>
              </g>
            </svg>
            <span className="hidden sm:inline tracking-wide">NPM-FLIP // {`${(currentPage).toString().padStart(2, '0')}-${(totalPages > 0 ? totalPages - 1 : 0).toString().padStart(2, '0')}`}</span>
            <span className="sm:hidden tracking-wide">NPM-FLIP // {`${(currentPage).toString().padStart(2, '0')}-${(totalPages > 0 ? totalPages - 1 : 0).toString().padStart(2, '0')}`}</span>
          </div>
          <a 
            href="/" 
            className="text-xs font-bold text-red-600 hover:opacity-70 transition-opacity"
          >
            [EXIT]
          </a>
        </header>
      )}

      <main className={`flex-1 flex flex-col min-h-0 relative overflow-hidden ${isSharedView ? 'pb-0' : ''}`}>
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
            isToolbarMinimized={isToolbarMinimized}
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
              isMinimized={isToolbarMinimized}
              onMinimizedChange={setIsToolbarMinimized}
            />
          </div>
        )}
      </main>
    </div>
  );
}
