import React, { useRef, useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { Config } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StageProps {
  pdfFile: File | null;
  config: Config;
  onDocumentLoadSuccess: (data: { numPages: number }) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  onUpload: (file: File) => void;
  onError?: (errorMessage: string) => void;
}

// Move PDFPage outside to ensure referential stability
const PDFPage = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  // Destructure custom props, pass the rest (like style injected by FlipBook) to the container
  const { pageNumber, width, style, ...rest } = props;

  return (
    <div
      ref={ref}
      style={style}
      className="bg-white shadow-sm border-r border-gray-100 overflow-hidden relative"
      {...rest}
    >
      {/* Page content */}
      <div className="h-full w-full relative">
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="h-full w-full"
          loading={
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-ink-light border-t-ink-main rounded-full animate-spin"></div>
            </div>
          }
        />

        {/* Inner Shadow Gradient for Spine effect */}
        {pageNumber % 2 !== 0 ? (
          <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black/5 to-transparent pointer-events-none mix-blend-multiply" />
        ) : (
          <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none mix-blend-multiply" />
        )}

        {/* Page Number Footer */}
        <div className={`absolute bottom-4 ${pageNumber % 2 === 0 ? 'left-6' : 'right-6'} text-[8px] font-bold text-ink-light tracking-widest`}>
          PG. {pageNumber.toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
});
PDFPage.displayName = 'PDFPage';

export const Stage: React.FC<StageProps> = ({
  pdfFile,
  config,
  onDocumentLoadSuccess,
  onPageChange,
  currentPage,
  totalPages,
  onUpload,
  onError
}) => {
  const bookRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bookDimensions, setBookDimensions] = useState<{ width: number; height: number } | null>(null);

  // Reset dimensions when file changes
  useEffect(() => {
    setBookDimensions(null);
  }, [pdfFile]);

  const onDocumentLoad = async (pdf: any) => {
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });

      // We normalize height to a standard size to ensure good resolution without huge memory usage.
      // The stage scaling will handle fitting it to the screen.
      const BASE_HEIGHT = 600;
      const aspectRatio = viewport.width / viewport.height;
      const calculatedWidth = Math.floor(BASE_HEIGHT * aspectRatio);

      setBookDimensions({ width: calculatedWidth, height: BASE_HEIGHT });

      onDocumentLoadSuccess({ numPages: pdf.numPages });
    } catch (error) {
      console.error("Error calculating PDF dimensions:", error);
    }
  };

  // Responsive scaling logic that adapts to the dynamic book dimensions
  useEffect(() => {
    if (!bookDimensions) return;

    const handleResize = () => {
      const stageWidth = window.innerWidth;
      const stageHeight = window.innerHeight;

      // Ideal full width (2 pages) + padding
      const fullBookWidth = bookDimensions.width * 2;
      const fullBookHeight = bookDimensions.height;

      const horizontalPadding = 40;
      const verticalPadding = pdfFile ? 320 : 120; // Header + Toolbar + Margins

      const availableWidth = stageWidth - horizontalPadding;
      const availableHeight = stageHeight - verticalPadding;

      const scaleX = availableWidth / fullBookWidth;
      const scaleY = availableHeight / fullBookHeight;

      // Fit within both width and height, but limit max scale
      let newScale = Math.min(scaleX, scaleY);

      // Cap max scale to avoid pixelation if image is small, 
      // but allow it to scale down as much as needed for mobile
      if (newScale > 1.2) newScale = 1.2;

      // Set a hard minimum to prevent it disappearing
      if (newScale < 0.2) newScale = 0.2;

      setScale(newScale);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [bookDimensions]);

  const playFlipSound = () => {
    if (config.useSound) {
      const audio = new Audio('https://www.soundjay.com/misc/sounds/page-flip-01a.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play blocked by browser policy"));
    }
  };

  const goToPrev = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const goToNext = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  if (!pdfFile) {
    return (
      <section className="flex-1 w-full h-full p-6 pb-[240px] md:pb-[210px] flex flex-col relative z-10">
        <div
          className="flex-1 w-full border-2 border-dashed border-gray-400 rounded-none flex flex-col items-center justify-center gap-10 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            borderColor: isDragging ? '#FF6B00' : '#9CA3AF',
            backgroundColor: isDragging ? 'rgba(255, 107, 0, 0.05)' : 'transparent',
          }}
        >
          {/* Central Card Graphic - Now Clickable */}
          <div 
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Main Content Wrapper */}
            <div className="flex flex-col items-center gap-6 relative z-10">
              <div className="w-[320px] h-[220px] bg-white border border-gray-100 shadow-xl flex flex-col items-center justify-center gap-3 transition-transform duration-500 group-hover:scale-105">
                <span className="text-xl font-bold text-gray-300 tracking-widest font-mono">UPLOAD PDF</span>
              </div>
              
              {/* Bottom Labels */}
              <div className="flex justify-between items-center w-[320px] text-[10px] font-bold text-ink-dim tracking-widest">
                <span>SUPPORTED: .PDF (MAX 50MB)</span>
                <span>V.1.0.4-STABLE</span>
              </div>
            </div>
            
            {/* Stacked element - matches full height */}
            <div className="absolute top-3 left-3 w-full h-full border border-ink-dim/20 bg-transparent -z-10 transition-transform duration-500 group-hover:translate-x-1 group-hover:translate-y-1"></div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/pdf"
            onChange={handleFileSelect}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 relative flex flex-col items-center justify-center p-4 pb-[240px] md:pb-[210px] overflow-hidden">

      {/* Container scaling wrapper */}
      <div style={{ transform: `scale(${scale})`, transition: 'transform 0.3s ease-out' }}>
        <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoad}
          onLoadError={(error) => {
            console.error('PDF Load Error:', error);
            if (onError) {
              onError(error.message || 'Failed to load PDF');
            }
          }}
          loading={
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-ink-dim border-t-ink-main rounded-full animate-spin"></div>
              <div className="flex items-center gap-2 text-xs font-bold text-ink-dim animate-pulse">
                DECODING STREAM...
              </div>
            </div>
          }
          error={
            <div className="flex flex-col items-center gap-2 text-red-500 font-bold">
              <span>ERROR LOADING PDF</span>
              <span className="text-[10px] text-ink-dim">Please try a different file</span>
            </div>
          }
        >
          {/* Only render FlipBook when we have pages AND dimensions to prevent init errors */}
          {totalPages > 0 && bookDimensions && (
            <HTMLFlipBook
              width={bookDimensions.width}
              height={bookDimensions.height}
              size="fixed"
              minWidth={100}
              maxWidth={2000}
              minHeight={100}
              maxHeight={2000}
              maxShadowOpacity={config.shadowIntensity / 100}
              showCover={config.isHardCover}
              mobileScrollSupport={true}
              className="shadow-2xl"
              flippingTime={config.flipSpeed}
              usePortrait={false}
              startZIndex={0}
              autoSize={true}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={30}
              showPageCorners={true}
              disableFlipByClick={false}
              onFlip={(e) => {
                onPageChange(e.data);
                playFlipSound();
              }}
              ref={bookRef}
              style={{}}
              startPage={0}
              drawShadow={true}
            >
              {Array.from(new Array(totalPages), (el, index) => (
                <PDFPage
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={bookDimensions.width}
                />
              ))}
            </HTMLFlipBook>
          )}
        </Document>
      </div>

      {/* Floating Controls */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 bg-panel-bg border border-panel-border px-4 py-2 flex items-center gap-4 z-30 shadow-lg transition-opacity duration-500 ${totalPages > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={goToPrev}
          className="w-6 h-6 border border-ink-dim flex items-center justify-center hover:bg-ink-main hover:text-white transition-colors cursor-pointer disabled:opacity-30"
          disabled={!pdfFile || currentPage === 0}
        >
          <ChevronLeft size={14} />
        </button>

        <div className="text-[10px] font-bold tracking-widest text-ink-main min-w-[60px] text-center">
          {totalPages > 0 ? `${(currentPage).toString().padStart(2, '0')} / ${(totalPages - 1).toString().padStart(2, '0')}` : '00 / 00'}
        </div>

        <button
          onClick={goToNext}
          className="w-6 h-6 border border-ink-dim flex items-center justify-center hover:bg-ink-main hover:text-white transition-colors cursor-pointer disabled:opacity-30"
          disabled={!pdfFile || currentPage >= totalPages - 1}
        >
          <ChevronRight size={14} />
        </button>
      </div>

    </section>
  );
};