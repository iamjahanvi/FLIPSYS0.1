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
  isSharedView?: boolean;
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
  onError,
  isSharedView = false
}) => {
  const bookRef = useRef<any>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bookDimensions, setBookDimensions] = useState<{ width: number; height: number } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isManualFlipRef = useRef(false);

  // Initialize audio on mount
  useEffect(() => {
    // Use relative path for Vercel deployment compatibility
    const audio = new Audio('./Assets/freesound_community-turning-book-page-79935 (mp3cut.net).mp3');
    audio.volume = 0.5;
    audio.preload = 'auto';
    audioRef.current = audio;
    
    // Pre-load the audio
    audio.load();
    
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Reset dimensions and error when file changes
  useEffect(() => {
    setBookDimensions(null);
    setPdfError(null);
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
      if (onError) {
        onError('Failed to process PDF structure');
      }
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
    if (config.useSound && audioRef.current) {
      // Reset to start and play
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // Auto-play was prevented, try again on next user interaction
          console.log("Audio play blocked, will retry on next interaction");
        });
      }
    }
  };

  const goToPrev = () => {
    if (bookRef.current && !isFlipping) {
      setIsFlipping(true);
      isManualFlipRef.current = true;
      playFlipSound();
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const goToNext = () => {
    if (bookRef.current && !isFlipping) {
      setIsFlipping(true);
      isManualFlipRef.current = true;
      playFlipSound();
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
            {/* Main Card Container - Matching loading state style */}
            <div className="w-[520px] bg-white border border-gray-200 shadow-xl flex flex-col p-8 transition-transform duration-500 group-hover:scale-[1.02]">
              {/* Top Row: Title / Max Size */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-ink-dim tracking-widest">UPLOAD PDF</span>
                <span className="text-[10px] font-bold text-ink-dim tracking-widest">MAX 50MB</span>
              </div>
              
              {/* Middle Row: Drag & Drop hint / Version */}
              <div className="flex justify-between items-end mb-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-ink-dim tracking-widest mb-1">DRAG & DROP</span>
                  <span className="text-lg font-bold text-ink-main tracking-wide">DROP FILE HERE</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-ink-dim tracking-widest block">VERSION</span>
                  <span className="text-lg font-bold text-ink-main tracking-wide">V.1.0.4-STABLE</span>
                </div>
              </div>
              
              {/* Bottom: Select Button */}
              <button 
                className="w-full border border-ink-dim/40 py-4 text-[11px] font-bold text-ink-dim tracking-widest hover:bg-ink-main hover:text-white hover:border-ink-main transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                SELECT PDF TO UPLOAD
              </button>
            </div>
            
            {/* Stacked element */}
            <div className="absolute top-2 left-2 w-full h-full border border-ink-dim/20 bg-transparent -z-10 transition-transform duration-500 group-hover:translate-x-1 group-hover:translate-y-1"></div>
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
    <section className={`flex-1 relative flex flex-col items-center justify-center overflow-hidden ${isSharedView ? 'p-4 pb-4' : 'p-4 pb-[240px] md:pb-[210px]'}`}>
      {/* Shadows visible during flip - controlled by react-pageflip */}
      <style>{`
        /* Hide hard shadows completely */
        .stf__hardShadow,
        .stf__hardInnerShadow {
          display: none !important;
        }
        
        /* Soft shadows - react-pageflip controls visibility during flip */
        .stf__outerShadow,
        .stf__innerShadow {
          opacity: 0 !important;
          transition: opacity 0.15s ease;
        }
        
        /* Show soft shadows when they have width/height (during flip) */
        .stf__outerShadow[style*="width"],
        .stf__innerShadow[style*="width"] {
          opacity: 0.5 !important;
        }
      `}</style>

      {/* Container scaling wrapper */}
      <div 
        className="relative"
        style={{ 
          transform: `scale(${scale}) ${bookDimensions ? (currentPage === 0 ? `translateX(-${bookDimensions.width / 2}px)` : (currentPage === totalPages - 1) ? `translateX(${bookDimensions.width / 2}px)` : 'translateX(0px)') : 'translateX(0px)'}`, 
          transition: 'transform 0.5s ease-out',
        }}
      >
        <div 
          className="flipbook-shadow-wrapper relative"
          style={{
            filter: `drop-shadow(0 25px 50px rgba(0, 0, 0, ${config.shadowIntensity / 100 * 0.5}))`,
            transition: 'filter 0.3s ease-out',
          }}
        >

          <Document
          file={pdfFile}
          onLoadSuccess={onDocumentLoad}
          onLoadError={(error) => {
            console.error('PDF Load Error:', error);
            const errorMsg = error.message || 'Failed to load PDF';
            console.log('Setting pdfError and calling onError:', errorMsg);
            setPdfError(errorMsg);
            if (onError) {
              console.log('Calling onError callback');
              onError(errorMsg);
            } else {
              console.log('onError callback is undefined!');
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
            <div className="hidden" />
          }
        >
          {/* Only render FlipBook when we have pages AND dimensions to prevent init errors */}
          {totalPages > 0 && bookDimensions && (
            <div 
              className="flipbook-click-area"
              onMouseDown={() => {
                // Play sound on mouse down (before flip starts) when sound is enabled
                if (config.useSound) {
                  playFlipSound();
                }
              }}
            >
              <HTMLFlipBook
                key={`flipbook-${config.flipSpeed}`}
                width={bookDimensions.width}
                height={bookDimensions.height}
                size="fixed"
                minWidth={100}
                maxWidth={2000}
                minHeight={100}
                maxHeight={2000}
                maxShadowOpacity={0.5}
                showCover={config.isHardCover}
                mobileScrollSupport={true}
                className="flipbook-container"
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
                  setTimeout(() => setIsFlipping(false), config.flipSpeed);
                }}
                ref={bookRef}
                startPage={currentPage}
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
            </div>
          )}
        </Document>
        </div>
      </div>

      {/* Floating Controls */}
      <div className={`absolute ${isSharedView ? 'bottom-10' : 'bottom-[240px] md:bottom-[210px]'} left-1/2 -translate-x-1/2 bg-panel-bg border border-panel-border px-4 py-2 flex items-center gap-4 z-50 shadow-lg transition-opacity duration-500 ${totalPages > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={goToPrev}
          className="w-8 h-8 border border-ink-dim flex items-center justify-center hover:bg-ink-main hover:text-white transition-colors cursor-pointer disabled:opacity-30 text-sm font-bold"
          disabled={!pdfFile || currentPage === 0}
        >
          &lt;
        </button>

        <div className="text-[10px] font-bold tracking-widest text-ink-main min-w-[60px] text-center">
          {totalPages > 0 ? `${(currentPage).toString().padStart(2, '0')} / ${(totalPages - 1).toString().padStart(2, '0')}` : '00 / 00'}
        </div>

        <button
          onClick={goToNext}
          className="w-8 h-8 border border-ink-dim flex items-center justify-center hover:bg-ink-main hover:text-white transition-colors cursor-pointer disabled:opacity-30 text-sm font-bold"
          disabled={!pdfFile || currentPage >= totalPages - 1}
        >
          &gt;
        </button>
      </div>

    </section>
  );
};