import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { Config } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFlipbookTouch } from '../hooks/useFlipbookTouch';
import '../flipbook.css';
import { SectionType } from './Toolbar';

interface StageProps {
  pdfFile: File | null;
  config: Config;
  onDocumentLoadSuccess: (data: { numPages: number }) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  onError?: (errorMessage: string) => void;
  isSharedView?: boolean;
  toolbarAccordionSection?: SectionType;
  isToolbarMinimized?: boolean;
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
  isSharedView = false,
  toolbarAccordionSection,
  isToolbarMinimized = false
}) => {
  const bookRef = useRef<any>(null);
  const [renderDimensions, setRenderDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const isFlippingRef = useRef(isFlipping);
  useEffect(() => { isFlippingRef.current = isFlipping; }, [isFlipping]);
  
  const [bookDimensions, setBookDimensions] = useState<{ width: number; height: number } | null>(null);
  const [canAnimatePosition, setCanAnimatePosition] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveFlippingTime = Math.round(config.flipSpeed * 1.35);
  
  // Responsive state
  const [isSinglePage, setIsSinglePage] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const patchFlipToPage = useCallback(() => {
    const pageFlipInstance = bookRef.current?.pageFlip?.();
    const flipController = pageFlipInstance?.getFlipController?.() as any;

    if (!flipController || flipController.__flipToPagePatched) return;

    // Override flipToPage to fix backward navigation in portrait mode
    const originalFlipToPage = flipController.flipToPage?.bind(flipController);
    if (typeof originalFlipToPage === 'function') {
      flipController.flipToPage = function(this: any, page: number, corner: string) {
        const current = this.app?.getPageCollection?.()?.getCurrentPageIndex?.() ?? 0;
        
        if (page === current) return;
        
        // Determine direction based on page index comparison
        const isGoingBackward = page < current;
        
        // Get render rectangle for positioning
        const rect = this.render?.getRect?.();
        if (!rect) return;
        
        // Use the corner or default to top
        const flipCorner = corner || 'top';
        const yPos = flipCorner === 'bottom' ? rect.height - 2 : 1;
        
        // For backward navigation, simulate click on left side of page
        // For forward navigation, simulate click on right side of page
        // This ensures the physics animation works correctly in both portrait and landscape
        if (isGoingBackward) {
          // Click on left edge to flip backward
          this.flip({ x: rect.left + 5, y: yPos });
        } else {
          // Click on right edge to flip forward
          this.flip({ x: rect.left + rect.pageWidth * 2 - 5, y: yPos });
        }
      };
      
      flipController.__flipToPagePatched = true;
    }
  }, []);

  const patchHoverCornerSensitivity = useCallback(() => {
    const pageFlipInstance = bookRef.current?.pageFlip?.();
    const flipController = pageFlipInstance?.getFlipController?.() as any;

    if (!flipController) return;

    // Apply flipToPage patch first
    patchFlipToPage();

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
      setWindowWidth(stageWidth);

      // Determine layout mode based on breakpoints
      // Desktop: >= 1024px → 2-page spread
      // Tablet: 600px - 1023px → 1 page
      // Mobile: < 600px → 1 page
      const newIsSinglePage = stageWidth < 1024;
      setIsSinglePage(newIsSinglePage);

      const horizontalPadding = stageWidth < 600 ? 16 : 40;
      const verticalPadding = isSharedView 
        ? (stageWidth < 600 ? 80 : 120) 
        : (stageWidth < 600 ? 180 : 320);

      const availableWidth = stageWidth - horizontalPadding;
      const availableHeight = stageHeight - verticalPadding;

      // In single-page mode, only use one page width
      const spreadWidth = newIsSinglePage ? bookDimensions.width : bookDimensions.width * 2;
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

  // Use ref to ensure playFlipSound is always accessible in callbacks
  const playFlipSoundRef = useRef(() => {
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
  });
  
  // Update the ref when config changes
  useEffect(() => {
    playFlipSoundRef.current = () => {
      if (config.useSound && audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.log("Audio play blocked, will retry on next interaction");
          });
        }
      }
    };
  }, [config.useSound]);

  const playFlipSound = () => {
    playFlipSoundRef.current();
  };

  // Index-based navigation - works identically in both spread and portrait modes
  const goToPage = useCallback((index: number) => {
    if (!bookRef.current) return;
    if (index < 0 || index >= totalPages) return;
    
    // Play sound at the START of the flip (only if enabled)
    if (config.useSound && audioRef.current) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.log("Audio play blocked, will retry on next interaction");
        });
      }
    }
    
    console.log('Navigating to page index:', index);
    bookRef.current.pageFlip().flip(index);
  }, [totalPages, config.useSound]);

  const handlePrev = useCallback(() => {
    if (currentPage <= 0) return;
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const handleNext = useCallback(() => {
    if (currentPage >= totalPages - 1) return;
    goToPage(currentPage + 1);
  }, [currentPage, totalPages, goToPage]);

  // Detect if device supports touch
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
    return () => window.removeEventListener('touchstart', checkTouch);
  }, []);

  // Initialize the flipbook touch hook for swipe gestures with flip physics
  const { containerRef: touchContainerRef } = useFlipbookTouch({
    isEnabled: isTouchDevice && !!pdfFile && totalPages > 0,
    isSinglePage,
    pageWidth: renderDimensions?.width || 0,
    onFlipPrev: handlePrev,
    onFlipNext: handleNext,
  });

  // Touch-only click zones for mobile/tablet
  const handleTouchZoneClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTouchDevice) return; // Only handle on touch devices
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    
    // Left 50% = previous page, Right 50% = next page
    if (clickX < width / 2) {
      handlePrev();
    } else {
      handleNext();
    }
  }, [isTouchDevice, handlePrev, handleNext]);

  // Ref for the stage container
  const stageRef = useRef<HTMLElement>(null);

  // Calculate dynamic bottom padding based on accordion state (mobile only)
  const getMobileBottomPadding = () => {
    if (isSharedView) return 'pb-4';
    // Base padding when accordion is closed (just headers)
    if (!toolbarAccordionSection) return 'pb-[180px]';
    // Expanded padding based on which section is open
    switch (toolbarAccordionSection) {
      case 'source':
        return 'pb-[320px]';
      case 'physics':
        return 'pb-[300px]';
      case 'share':
        return 'pb-[280px]';
      default:
        return 'pb-[180px]';
    }
  };

  if (!pdfFile) {
    // LandingPage handles upload UI - Stage just renders empty when no PDF
    return (
      <section className="flex-1 w-full h-full" />
    );
  }

  return (
    <section 
      ref={stageRef}
      className={`flipbook-stage flex-1 relative flex flex-col items-center justify-center ${isSharedView ? 'p-4 pb-4' : `pt-16 md:pt-20 ${getMobileBottomPadding()} md:pb-[210px]`}`}
      style={{ overflow: 'visible' }}
    >
      {/* Responsive layout wrapper */}
      <div 
        className={`flipbook-responsive ${isSinglePage ? 'single-page' : ''}`}
        style={{ 
          ['--page-width' as string]: renderDimensions ? `${renderDimensions.width}px` : '100%',
          overflow: 'visible',
        }}
      >
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

      {/* Book wrapper - centered for all pages in single-page mode */}
      <div
        className="relative"
        style={{
          // In single-page mode, always center the book
          // In spread mode, offset for first and last pages to center the visible spread
          transform: isSinglePage 
            ? 'none' 
            : `translateX(${renderDimensions && totalPages > 0 ? (currentPage === 0 ? -renderDimensions.width / 2 : (currentPage === totalPages - 1) ? renderDimensions.width / 2 : 0) : 0}px)`,
          transition: canAnimatePosition ? 'transform 0.5s ease-out' : 'none',
          overflow: 'visible',
        }}
      >
        <div 
          className="flipbook-shadow-wrapper relative"
          style={{
            filter: `drop-shadow(0 25px 50px rgba(0, 0, 0, ${config.shadowIntensity / 100 * 0.5}))`,
            transition: 'filter 0.3s ease-out',
            overflow: 'visible',
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
            <div 
              ref={touchContainerRef}
              className="flipbook-click-area relative"
              style={{ 
                overflow: 'visible',
                width: isSinglePage ? renderDimensions.width : renderDimensions.width * 2,
                height: renderDimensions.height,
              }}
            >
              {/* Touch edge zones - only for tap navigation, not blocking drag */}
              {isTouchDevice && (
                <div 
                  className="absolute inset-0 z-10 flex pointer-events-none"
                  style={{ 
                    touchAction: 'none',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  {/* Left edge tap zone - 20% width */}
                  <div 
                    className="h-full pointer-events-auto"
                    style={{ cursor: 'pointer', width: '20%' }} 
                    onClick={handlePrev}
                  />
                  {/* Middle area - no pointer events, allows drag to pass through */}
                  <div className="h-full" style={{ width: '60%' }} />
                  {/* Right edge tap zone - 20% width */}
                  <div 
                    className="h-full pointer-events-auto"
                    style={{ cursor: 'pointer', width: '20%' }} 
                    onClick={handleNext}
                  />
                </div>
              )}
              <HTMLFlipBook
                  key={`flipbook-${config.flipSpeed}-${isSinglePage ? 'single' : 'spread'}`}
                  width={renderDimensions.width}
                  height={renderDimensions.height}
                  size="fixed"
                  minWidth={100}
                  maxWidth={2000}
                  minHeight={100}
                  maxHeight={2000}
                  showCover={config.isHardCover}
                  mobileScrollSupport={false}
                  className={`flipbook-container ${isSinglePage ? 'flipbook-single-page' : ''}`}
                  flippingTime={effectiveFlippingTime}
                  usePortrait={isSinglePage}
                  startZIndex={isSinglePage ? 200 : 100}
                  autoSize={true}
                  clickEventForward={false}
                  useMouseEvents={true}
                  swipeDistance={24}
                  showPageCorners={true}
                  disableFlipByClick={true}
                  onFlip={(e) => {
                    setIsFlipping(true);
                    onPageChange(e.data);
                    // Reset isFlipping after animation completes
                    setTimeout(() => setIsFlipping(false), effectiveFlippingTime);
                  }}
                  onChangeState={(e) => {
                    // Debug: log all state changes
                    console.log('Flip state changed:', e.data);
                    // Play sound when flip starts (state changes to 'flipping' or 'user_fold')
                    // 'user_fold' is triggered when user manually starts dragging a page
                    // 'flipping' is triggered when the flip animation begins
                    if (e.data === 'flipping' || e.data === 'user_fold') {
                      playFlipSoundRef.current();
                    }
                  }}
                  ref={bookRef}
                  startPage={currentPage}
                  drawShadow={true}
                  maxShadowOpacity={0.25}
                  style={{ overflow: 'visible' }}
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
      </div>

      {/* Floating Controls - desktop only - positioned fixed relative to viewport, 8px above toolbar */}
      <div className={`hidden md:flex flipbook-controls fixed ${isToolbarMinimized ? 'bottom-[44px]' : 'bottom-[196px]'} left-1/2 -translate-x-1/2 bg-panel-bg border border-panel-border p-1 items-center gap-2 z-50 shadow-lg transition-opacity duration-500 ${totalPages > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Prev button clicked, currentPage:', currentPage);
            handlePrev();
          }}
          className="w-6 h-6 border border-ink-dim flex items-center justify-center hover:bg-ink-main hover:text-white transition-colors cursor-pointer disabled:opacity-30 text-xs font-bold"
          disabled={currentPage <= 0}
          type="button"
        >
          &lt;
        </button>

        <div className="text-[10px] font-bold tracking-widest min-w-[50px] text-center">
          {totalPages > 0 ? (
            <>
              <span className="text-ink-main">{(currentPage).toString().padStart(2, '0')}</span>
              <span className="text-[#707070]"> / {(totalPages - 1).toString().padStart(2, '0')}</span>
            </>
          ) : (
            <span className="text-[#707070]">00 / 00</span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Next button clicked, currentPage:', currentPage);
            handleNext();
          }}
          className="w-6 h-6 border border-ink-dim flex items-center justify-center hover:bg-ink-main hover:text-white transition-colors cursor-pointer disabled:opacity-30 text-xs font-bold"
          disabled={currentPage >= totalPages - 1}
          type="button"
        >
          &gt;
        </button>
      </div>

    </section>
  );
};
