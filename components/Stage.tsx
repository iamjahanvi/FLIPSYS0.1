import React, { useRef, useState, useEffect, useCallback } from 'react';
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
          loading={null}
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
  onError,
  isSharedView = false
}) => {
  const bookRef = useRef<any>(null);
  const [renderDimensions, setRenderDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [bookDimensions, setBookDimensions] = useState<{ width: number; height: number } | null>(null);
  const [canAnimatePosition, setCanAnimatePosition] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveFlippingTime = Math.round(config.flipSpeed * 1.35);

  const patchHoverCornerSensitivity = useCallback(() => {
    const pageFlipInstance = bookRef.current?.pageFlip?.();
    const flipController = pageFlipInstance?.getFlipController?.() as any;

    if (!flipController) return;

    if (!flipController.__strictHoverCornersPatched) {
      const originalIsPointOnCorners = flipController.isPointOnCorners?.bind(flipController);
      if (typeof originalIsPointOnCorners === 'function') {
        // Default library threshold is diagonal/5 and is too broad for realistic hover-corner behavior.
        // Tighten it to diagonal/9 so hover fold starts much closer to the actual corners.
        flipController.isPointOnCorners = function(this: any, globalPos: { x: number; y: number }) {
          if (!originalIsPointOnCorners(globalPos)) return false;

          const rect = this.getBoundsRect?.();
          const bookPos = this.render?.convertToBook?.(globalPos);
          if (!rect || !bookPos) return false;

          const strictDistance = Math.sqrt(rect.pageWidth * rect.pageWidth + rect.height * rect.height) / 9;

          return (
            bookPos.x > 0 &&
            bookPos.y > 0 &&
            bookPos.x < rect.width &&
            bookPos.y < rect.height &&
            (bookPos.x < strictDistance || bookPos.x > rect.width - strictDistance) &&
            (bookPos.y < strictDistance || bookPos.y > rect.height - strictDistance)
          );
        };

        flipController.__strictHoverCornersPatched = true;
      }
    }

    if (!flipController.__hoverEaseOutPatched) {
      const originalAnimateFlippingTo = flipController.animateFlippingTo?.bind(flipController);
      if (typeof originalAnimateFlippingTo === 'function') {
        flipController.animateFlippingTo = function(
          this: any,
          start: { x: number; y: number },
          dest: { x: number; y: number },
          isTurned: boolean,
          needReset = true
        ) {
          const isHoverCornerPreview = !isTurned && needReset === false;

          if (!isHoverCornerPreview) {
            return originalAnimateFlippingTo(start, dest, isTurned, needReset);
          }

          if (!this.render?.startAnimation || typeof this.do !== 'function') {
            return originalAnimateFlippingTo(start, dest, isTurned, needReset);
          }

          const deltaX = dest.x - start.x;
          const deltaY = dest.y - start.y;
          const steps = Math.max(16, Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaY))));
          const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

          const frames: Array<() => void> = [];
          for (let i = 0; i <= steps; i += 1) {
            const t = i / steps;
            const easedT = easeOut(t);
            const point = {
              x: start.x + deltaX * easedT,
              y: start.y + deltaY * easedT,
            };
            frames.push(() => this.do(point));
          }

          const baseDuration =
            typeof this.getAnimationDuration === 'function'
              ? this.getAnimationDuration(steps)
              : this.app?.getSettings?.()?.flippingTime ?? 500;

          this.render.startAnimation(frames, Math.round(baseDuration * 1.7), () => {
            // For hover corner preview, original callback would no-op (isTurned=false, needReset=false).
          });
        };

        flipController.__hoverEaseOutPatched = true;
      }
    }
  }, []);

  // Initialize audio on mount
  useEffect(() => {
    // Use root-relative path for Vercel deployment (files in public folder)
    const audio = new Audio('/freesound_community-turning-book-page-79935 (mp3cut.net).mp3');
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
    setRenderDimensions(null);
    setCanAnimatePosition(false);
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

  // Compute actual rendered page size (instead of CSS transform scaling) to keep pointer physics aligned.
  useEffect(() => {
    if (!bookDimensions) return;

    const handleResize = () => {
      const stageWidth = window.innerWidth;
      const stageHeight = window.innerHeight;

      const horizontalPadding = 40;
      const verticalPadding = isSharedView ? 120 : 320;

      const availableWidth = stageWidth - horizontalPadding;
      const availableHeight = stageHeight - verticalPadding;

      const spreadWidth = bookDimensions.width * 2;
      const spreadHeight = bookDimensions.height;
      const scaleX = availableWidth / spreadWidth;
      const scaleY = availableHeight / spreadHeight;

      let nextScale = Math.min(scaleX, scaleY);
      if (nextScale > 1.2) nextScale = 1.2;
      if (nextScale < 0.2) nextScale = 0.2;

      setRenderDimensions({
        width: Math.max(120, Math.round(bookDimensions.width * nextScale)),
        height: Math.max(160, Math.round(bookDimensions.height * nextScale)),
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, [bookDimensions, isSharedView]);

  useEffect(() => {
    if (!totalPages || !renderDimensions) return;

    const patchTimer = window.setTimeout(() => {
      patchHoverCornerSensitivity();
    }, 0);

    return () => window.clearTimeout(patchTimer);
  }, [totalPages, renderDimensions, patchHoverCornerSensitivity]);

  useEffect(() => {
    if (!renderDimensions || totalPages === 0) return;

    const frame = window.requestAnimationFrame(() => {
      setCanAnimatePosition(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [renderDimensions, totalPages]);

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
      playFlipSound();
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const goToNext = () => {
    if (bookRef.current && !isFlipping) {
      setIsFlipping(true);
      playFlipSound();
      bookRef.current.pageFlip().flipNext();
    }
  };

  if (!pdfFile) {
    // LandingPage handles upload UI - Stage just renders empty when no PDF
    return (
      <section className="flex-1 w-full h-full" />
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

      {/* Book wrapper */}
      <div
        className="relative"
        style={{
          transform: `translateX(${renderDimensions && totalPages > 0 ? (currentPage === 0 ? -renderDimensions.width / 2 : (currentPage === totalPages - 1) ? renderDimensions.width / 2 : 0) : 0}px)`,
          transition: canAnimatePosition ? 'transform 0.5s ease-out' : 'none',
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
            if (onError) {
              console.log('Calling onError callback');
              onError(errorMsg);
            } else {
              console.log('onError callback is undefined!');
            }
          }}
          loading={null}
          error={
            <div className="hidden" />
          }
        >
          {/* Only render FlipBook when we have pages and resolved render dimensions */}
          {totalPages > 0 && renderDimensions && (
            <div className="flipbook-click-area">
              <HTMLFlipBook
                  key={`flipbook-${config.flipSpeed}`}
                  width={renderDimensions.width}
                  height={renderDimensions.height}
                  size="fixed"
                  minWidth={100}
                  maxWidth={2000}
                  minHeight={100}
                  maxHeight={2000}
                  showCover={config.isHardCover}
                  mobileScrollSupport={true}
                  className="flipbook-container"
                  flippingTime={effectiveFlippingTime}
                  usePortrait={false}
                  startZIndex={0}
                  autoSize={true}
                  clickEventForward={false}
                  useMouseEvents={true}
                  swipeDistance={24}
                  showPageCorners={true}
                  disableFlipByClick={true}
                  onFlip={(e) => {
                    if (!isFlipping) {
                      playFlipSound();
                    }
                    setIsFlipping(true);
                    onPageChange(e.data);
                    setTimeout(() => setIsFlipping(false), effectiveFlippingTime);
                  } }
                  ref={bookRef}
                  startPage={currentPage}
                  drawShadow={true}
                  maxShadowOpacity={0.25}
                  style={undefined}
                  onInit={() => {
                    patchHoverCornerSensitivity();
                  }}
              >
                {Array.from(new Array(totalPages), (el, index) => (
                  <PDFPage
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={renderDimensions.width}
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
