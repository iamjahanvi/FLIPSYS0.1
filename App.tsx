import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Stage } from './components/Stage';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { FlipBookDemo } from './components/FlipBookDemo';
import { Config, DefaultConfig } from './types';

// PDF.js worker setup is required for react-pdf
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function App() {
  // Check for demo mode via URL parameter
  const isDemoMode = window.location.search.includes('demo=flipbook');
  
  if (isDemoMode) {
    return <FlipBookDemo />;
  }
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

  // Background pattern style from the design
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: '#F0F0F0',
    backgroundImage: `
      radial-gradient(circle, #D6D6D6 1px, transparent 1px),
      linear-gradient(to right, rgba(200,200,200,0.3) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(200,200,200,0.3) 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px, 100px 100px, 100px 100px',
  };

  // Set initialized flag after mount to enable transitions
  useEffect(() => {
    setHasInitialized(true);
  }, []);

  const handleUpload = (file: File) => {
    setPdfFile(file);
    setCurrentPage(0);
    setIsReady(false);
    setIsLoading(true);
    setHasError(false);
    setErrorInfo(null);
    setProcessingPage(0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    // Simulate page-by-page processing with realistic timing
    let page = 0;
    const processingTime = Math.max(100, Math.min(500, 3000 / numPages)); // Adaptive timing based on page count
    const interval = setInterval(() => {
      page++;
      setProcessingPage(page);
      if (page >= numPages) {
        clearInterval(interval);
        // Add a small delay after completion before showing the flipbook
        setTimeout(() => {
          setIsLoading(false);
          setIsReady(true);
        }, 800);
      }
    }, processingTime);
  };

  const handleAbortProcessing = () => {
    setIsLoading(false);
    setPdfFile(null);
    setTotalPages(0);
    setProcessingPage(0);
  };

  const handleError = (errorMessage: string) => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    setIsLoading(false);
    setHasError(true);
    setErrorInfo({
      code: 'ERR_0XF12',
      title: 'EXECUTION_TIMEOUT',
      node: 'MESH_OPTIMIZER_V4',
      buffer: 'OVERFLOW_DETECTION',
      timestamp: timestamp,
    });
  };

  const handleRetry = () => {
    if (pdfFile) {
      setHasError(false);
      setErrorInfo(null);
      setIsLoading(true);
      setProcessingPage(0);
      // Re-trigger the document load
      setTotalPages(0);
    }
  };

  const handleDismissError = () => {
    setHasError(false);
    setErrorInfo(null);
    setPdfFile(null);
    setTotalPages(0);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-mono text-ink-main overflow-hidden select-none" style={backgroundStyle}>
      <Header isReady={isReady} isLoading={isLoading} hasError={hasError} />

      <main className="flex-1 flex flex-col min-h-0 relative">
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
          />
        )}

        {/* Loading State - Shows during PDF processing */}
        {isLoading && pdfFile && !hasError && (
          <LoadingState
            fileName={pdfFile.name}
            totalPages={totalPages}
            currentProcessingPage={processingPage}
            onAbort={handleAbortProcessing}
          />
        )}

        {/* Stage - Hidden during loading and error */}
        {!isLoading && !hasError && (
          <Stage
            pdfFile={pdfFile}
            config={config}
            onDocumentLoadSuccess={handleDocumentLoadSuccess}
            onPageChange={handlePageChange}
            currentPage={currentPage}
            totalPages={totalPages}
            onUpload={handleUpload}
            onError={handleError}
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
              onUpload={handleUpload}
            />
          </div>
        )}

        {/* Quick Start Guide - Shows when no file uploaded */}
        <div className={`absolute bottom-0 left-0 right-0 z-40 ${hasInitialized ? 'transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]' : ''} ${!pdfFile ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
          <section className="h-[220px] md:h-48 bg-[#F0F0F0]/95 border-t border-panel-border backdrop-blur-md px-6 py-4 shrink-0">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-2 pb-3 border-b border-ink-light">
                <span className="text-[10px] font-bold text-ink-dim tracking-widest">QUICK START GUIDE</span>
              </div>
              
              {/* Steps - Horizontal Layout */}
              <div className="flex-1 flex items-center justify-center gap-8 md:gap-16 mt-4">
                {/* Step 01: UPLOAD */}
                <div className="flex items-center gap-3 text-left max-w-[220px]">
                  <div className="w-7 h-7 border-2 border-ink-main flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-ink-main">01</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink-main tracking-widest mb-1">UPLOAD</h3>
                    <p className="text-[10px] text-ink-dim leading-relaxed">Drag any PDF document into the workspace to start the engine.</p>
                  </div>
                </div>

                {/* Connector Arrow */}
                <div className="hidden md:flex items-center text-ink-light">
                  <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="opacity-50">
                    <path d="M0 6H22M22 6L17 1M22 6L17 11" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>

                {/* Step 02: CONFIGURE */}
                <div className="flex items-center gap-3 text-left max-w-[220px]">
                  <div className="w-7 h-7 border-2 border-ink-main flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-ink-main">02</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink-main tracking-widest mb-1">CONFIGURE</h3>
                    <p className="text-[10px] text-ink-dim leading-relaxed">Adjust physics, shadows, and flip mechanics in the lower panel.</p>
                  </div>
                </div>

                {/* Connector Arrow */}
                <div className="hidden md:flex items-center text-ink-light">
                  <svg width="24" height="12" viewBox="0 0 24 12" fill="none" className="opacity-50">
                    <path d="M0 6H22M22 6L17 1M22 6L17 11" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>

                {/* Step 03: DEPLOY */}
                <div className="flex items-center gap-3 text-left max-w-[220px]">
                  <div className="w-7 h-7 border-2 border-ink-main flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-ink-main">03</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink-main tracking-widest mb-1">DEPLOY</h3>
                    <p className="text-[10px] text-ink-dim leading-relaxed">Generate a unique URL to share your interactive flipbook.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Toolbar - Shows only after file uploaded AND processing complete */}
        <div className={`absolute bottom-0 left-0 right-0 z-40 ${hasInitialized ? 'transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]' : ''} ${pdfFile && !isLoading ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
          <Toolbar
            config={config}
            setConfig={setConfig}
            onUpload={handleUpload}
            pdfName={pdfFile?.name}
            pdfSize={pdfFile?.size}
          />
        </div>
      </main>
    </div>
  );
}