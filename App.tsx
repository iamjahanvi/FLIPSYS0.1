import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Stage } from './components/Stage';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { FlipBookDemo } from './components/FlipBookDemo';
import { LandingPage } from './components/LandingPage';
import { Config, DefaultConfig } from './types';
import { getPDF } from './lib/supabase';

// PDF.js worker setup is required for react-pdf
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function App() {
  // Check for demo mode via URL parameter
  const isDemoMode = window.location.search.includes('demo=flipbook');
  
  if (isDemoMode) {
    return <FlipBookDemo />;
  }

  // Check if this is a shared PDF view (read-only mode)
  const isSharedView = window.location.search.includes('share=');

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
  const logTimersRef = React.useRef<NodeJS.Timeout[]>([]);

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
  
  // Switch to error state when error log is shown
  useEffect(() => {
    if (isErrorLogShown && errorInfo) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [isErrorLogShown, errorInfo]);

  // Load shared PDF from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    
    if (shareId && !pdfFile) {
      setIsLoading(true);
      getPDF(shareId).then((result) => {
        if (result) {
          // Apply saved config if available
          if (result.config) {
            setConfig(prev => ({
              ...prev,
              ...result.config,
            }));
          }
          fetch(result.url)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], result.fileName, { type: 'application/pdf' });
              handleUpload(file);
            })
            .catch(() => {
              setIsLoading(false);
              alert('Failed to load shared PDF');
            });
        } else {
          setIsLoading(false);
          alert('Shared PDF not found');
        }
      });
    }
  }, []);

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
    
    // Start incident log animation
    startIncidentLogAnimation(false);
  };
  
  // Shared incident log animation for both loading and error states
  const startIncidentLogAnimation = (isError: boolean) => {
    // Clear any existing timers
    logTimersRef.current.forEach(clearTimeout);
    logTimersRef.current = [];
    
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
    
    // Check if this is a shared PDF (from URL parameter)
    const params = new URLSearchParams(window.location.search);
    const isSharedPDF = params.get('share') !== null;
    
    if (isSharedPDF) {
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
    setIsLoading(false);
    setPdfFile(null);
    setTotalPages(0);
    setProcessingPage(0);
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
    logTimersRef.current.forEach(clearTimeout);
    logTimersRef.current = [];
    
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
    setHasError(false);
    setErrorInfo(null);
    setPdfFile(null);
    setTotalPages(0);
    setIncidentLogs([]);
    setIsErrorLogShown(false);
  };

  return (
    <div className={`h-screen w-screen flex flex-col font-mono text-ink-main overflow-hidden select-none ${isSharedView ? 'bg-[#E6E6E6]' : ''}`} style={isSharedView ? undefined : backgroundStyle}>
      {/* Header - simplified for shared view */}
      {!isSharedView && <Header isReady={isReady} isLoading={isLoading} hasError={hasError} />}
      
      {/* Shared view header */}
      {isSharedView && (
        <header className="h-12 flex items-center px-10 justify-between bg-transparent z-10">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="w-2 h-2 bg-ink-main rounded-full"></span>
            PDF2FLIP // SYS.01 // READ_MODE
          </div>
          <a 
            href="/" 
            className="text-[10px] font-bold border-b border-ink-main pb-0.5 hover:opacity-70 transition-opacity"
          >
            EXIT [ESC]
          </a>
        </header>
      )}

      <main className={`flex-1 flex flex-col min-h-0 relative ${isSharedView ? 'pb-0' : ''}`}>
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
        {isLoading && pdfFile && !hasError && (
          <LoadingState
            fileName={pdfFile.name}
            totalPages={totalPages}
            currentProcessingPage={processingPage}
            onAbort={handleAbortProcessing}
            incidentLogs={incidentLogs}
            hasInitialized={hasInitialized}
          />
        )}

        {/* Stage - Only render when PDF is loaded */}
        {!isLoading && !hasError && pdfFile && (
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
        )}

        {/* Hidden Stage for PDF processing (loads PDF in background) */}
        {isLoading && pdfFile && (
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

        {/* Landing Page - Shows when no file uploaded (hidden in shared view) */}
        {!isSharedView && !pdfFile && !isLoading && !hasError && (
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
            />
          </div>
        )}
      </main>
    </div>
  );
}