import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

interface FlipBookProps {
  width: number;
  height: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  flippingTime: number;
  shadowIntensity: number;
  children: React.ReactNode[];
}

export interface FlipBookRef {
  flipNext: () => void;
  flipPrev: () => void;
}

interface PageProps {
  pageNumber: number;
  width: number;
  height: number;
  isLeft: boolean;
  isVisible: boolean;
  children: React.ReactNode;
}

const Page = forwardRef<HTMLDivElement, PageProps>(
  ({ pageNumber, width, height, isLeft, isVisible, children }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute top-0"
        style={{
          width: width,
          height: height,
          left: isLeft ? 0 : width,
          zIndex: isVisible ? 10 : 1,
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </div>
    );
  }
);
Page.displayName = 'Page';

export const FlipBook = forwardRef<FlipBookRef, FlipBookProps>(
  ({ width, height, currentPage, onPageChange, flippingTime, shadowIntensity, children }, ref) => {
    const [isFlipping, setIsFlipping] = useState(false);
    const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const totalPages = children.length;
    const displayedPage = Math.floor(currentPage / 2) * 2;

    const flipNext = useCallback(() => {
      if (isFlipping || currentPage >= totalPages - 1) return;
      setFlipDirection('next');
      setIsFlipping(true);
    }, [currentPage, totalPages, isFlipping]);

    const flipPrev = useCallback(() => {
      if (isFlipping || currentPage <= 0) return;
      setFlipDirection('prev');
      setIsFlipping(true);
    }, [currentPage, isFlipping]);

    useImperativeHandle(ref, () => ({
      flipNext,
      flipPrev,
    }));

    const handleAnimationComplete = () => {
      if (flipDirection === 'next') {
        onPageChange(currentPage + 1);
      } else if (flipDirection === 'prev') {
        onPageChange(currentPage - 1);
      }
      setIsFlipping(false);
      setFlipDirection(null);
    };

    // Calculate which pages to show
    const leftPageIndex = displayedPage;
    const rightPageIndex = displayedPage + 1;

    // Get the pages being flipped
    const flippingPageIndex = flipDirection === 'next' ? rightPageIndex : leftPageIndex;
    const isFlippingLeftPage = flipDirection === 'prev';

    return (
      <div
        ref={containerRef}
        className="relative"
        style={{
          width: width * 2,
          height: height,
          perspective: '2000px',
        }}
      >
        {/* Static left page (when not flipping prev) */}
        {leftPageIndex < totalPages && !(flipDirection === 'prev' && isFlipping) && (
          <div
            className="absolute top-0 left-0"
            style={{
              width,
              height,
              zIndex: 5,
            }}
          >
            {children[leftPageIndex]}
          </div>
        )}

        {/* Static right page (when not flipping next) */}
        {rightPageIndex < totalPages && !(flipDirection === 'next' && isFlipping) && (
          <div
            className="absolute top-0"
            style={{
              width,
              height,
              left: width,
              zIndex: 5,
            }}
          >
            {children[rightPageIndex]}
          </div>
        )}

        {/* Animated flipping page */}
        <AnimatePresence>
          {isFlipping && flippingPageIndex < totalPages && (
            <motion.div
              className="absolute top-0"
              style={{
                width,
                height,
                left: isFlippingLeftPage ? 0 : width,
                transformOrigin: isFlippingLeftPage ? 'right center' : 'left center',
                transformStyle: 'preserve-3d',
                zIndex: 20,
              }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: isFlippingLeftPage ? -180 : 180 }}
              exit={{ rotateY: isFlippingLeftPage ? -180 : 180 }}
              transition={{
                duration: flippingTime / 1000,
                ease: 'easeInOut',
              }}
              onAnimationComplete={handleAnimationComplete}
            >
              {/* Front face */}
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                }}
              >
                {children[flippingPageIndex]}
              </div>
              
              {/* Back face */}
              <div
                className="absolute inset-0"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: '#f5f5f5',
                }}
              >
                {/* Show the next/prev page content on the back */}
                {flipDirection === 'next' && leftPageIndex + 2 < totalPages && children[leftPageIndex + 2]}
                {flipDirection === 'prev' && rightPageIndex - 2 >= 0 && children[rightPageIndex - 2]}
              </div>

              {/* Shadow overlay */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isFlippingLeftPage 
                    ? 'linear-gradient(to left, rgba(0,0,0,0.3), transparent)'
                    : 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
                  opacity: shadowIntensity / 100,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, shadowIntensity / 100, 0] }}
                transition={{
                  duration: flippingTime / 1000,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
FlipBook.displayName = 'FlipBook';
