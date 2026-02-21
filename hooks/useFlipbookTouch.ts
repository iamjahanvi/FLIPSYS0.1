import { useRef, useCallback, useEffect } from 'react';

interface GestureState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: 'left' | 'right' | null;
  isDragging: boolean;
  startTime: number;
  lastTime: number;
  dragProgress: number;
}

interface UseFlipbookTouchOptions {
  isEnabled: boolean;
  isSinglePage: boolean;
  pageWidth: number;
  onFlipPrev: () => void;
  onFlipNext: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// Thresholds
const MIN_DRAG = 8; // px - minimum movement to start peel
const FLIP_TRIGGER = 0.18; // % of page width to trigger flip
const FLING_VELOCITY = 0.45; // px/ms - velocity threshold for fling
const EDGE_TAP_ZONE = 0.50; // 50% of screen width for left/right click zones

export function useFlipbookTouch(options: UseFlipbookTouchOptions) {
  const {
    isEnabled,
    isSinglePage,
    pageWidth,
    onFlipPrev,
    onFlipNext,
    onDragStart,
    onDragEnd,
  } = options;

  const gestureRef = useRef<GestureState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    direction: null,
    isDragging: false,
    startTime: 0,
    lastTime: 0,
    dragProgress: 0,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPeelingRef = useRef(false);

  // Clamp value between min and max
  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  // Dispatch synthetic pointer event to flipbook canvas
  const dispatchSyntheticPointer = useCallback((
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    clientX: number,
    clientY: number,
    pressure = 0.5
  ) => {
    const container = containerRef.current;
    if (!container) return;

    // Find the flipbook canvas or container element
    const flipbookElement = (container.querySelector('.flipbook-container') as HTMLElement) ||
                          (container.querySelector('.stf__wrapper') as HTMLElement) ||
                          (container.querySelector('canvas') as HTMLElement);
    
    if (!flipbookElement) return;

    const rect = flipbookElement.getBoundingClientRect();
    const pointerId = 1;

    // Create synthetic pointer event
    const syntheticEvent = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      screenX: clientX,
      screenY: clientY,
      pointerId,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pressure,
      width: 1,
      height: 1,
      tiltX: 0,
      tiltY: 0,
    });

    flipbookElement.dispatchEvent(syntheticEvent);
  }, []);

  // Calculate drag progress (-1 to 1)
  const calculateDragProgress = useCallback((deltaX: number) => {
    if (pageWidth <= 0) return 0;
    return clamp(deltaX / pageWidth, -1, 1);
  }, [pageWidth, clamp]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isEnabled) return;
    
    const touch = e.touches[0];
    const now = performance.now();
    
    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
      isDragging: false,
      startTime: now,
      lastTime: now,
      dragProgress: 0,
    };

    isPeelingRef.current = false;
  }, [isEnabled]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isEnabled) return;
    
    const touch = e.touches[0];
    const gesture = gestureRef.current;
    const now = performance.now();
    const deltaTime = now - gesture.lastTime;

    // Update position
    gesture.currentX = touch.clientX;
    gesture.currentY = touch.clientY;
    gesture.deltaX = touch.clientX - gesture.startX;
    gesture.deltaY = touch.clientY - gesture.startY;

    // Calculate velocity (px/ms)
    if (deltaTime > 0) {
      const instantVelocity = Math.abs(gesture.deltaX) / deltaTime;
      gesture.velocity = gesture.velocity * 0.7 + instantVelocity * 0.3; // Smooth velocity
    }

    // Determine direction
    if (Math.abs(gesture.deltaX) > Math.abs(gesture.deltaY)) {
      gesture.direction = gesture.deltaX > 0 ? 'right' : 'left';
    }

    // Check if we've moved enough to start dragging
    const totalDelta = Math.sqrt(gesture.deltaX * gesture.deltaX + gesture.deltaY * gesture.deltaY);
    
    if (!gesture.isDragging && totalDelta > MIN_DRAG) {
      gesture.isDragging = true;
      
      // Prevent default to stop scrolling
      if (e.cancelable) {
        e.preventDefault();
      }

      // Start the peel by dispatching pointerdown
      dispatchSyntheticPointer('pointerdown', gesture.startX, gesture.startY, 0.5);
      isPeelingRef.current = true;
      onDragStart?.();
    }

    // If dragging, update the peel
    if (gesture.isDragging && isPeelingRef.current) {
      if (e.cancelable) {
        e.preventDefault();
      }

      // Use requestAnimationFrame for smooth updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        gesture.dragProgress = calculateDragProgress(gesture.deltaX);
        dispatchSyntheticPointer('pointermove', touch.clientX, touch.clientY, 0.5 + Math.abs(gesture.dragProgress) * 0.5);
      });
    }

    gesture.lastTime = now;
  }, [isEnabled, dispatchSyntheticPointer, calculateDragProgress, onDragStart]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isEnabled) return;
    
    const gesture = gestureRef.current;
    const now = performance.now();
    const totalTime = now - gesture.startTime;

    // Cancel any pending raf
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // If we were peeling, complete or cancel the flip
    if (isPeelingRef.current) {
      const absProgress = Math.abs(gesture.dragProgress);
      const shouldFlip = absProgress > FLIP_TRIGGER || gesture.velocity > FLING_VELOCITY;

      if (shouldFlip && gesture.direction) {
        // Complete the flip in the swipe direction
        const targetX = gesture.direction === 'right' 
          ? gesture.startX + pageWidth * 1.5 
          : gesture.startX - pageWidth * 1.5;
        
        dispatchSyntheticPointer('pointermove', targetX, gesture.currentY, 1);
        dispatchSyntheticPointer('pointerup', targetX, gesture.currentY, 0);

        // Trigger the actual page flip
        // Swipe left (dragging right to left) = go to NEXT page (moving forward)
        // Swipe right (dragging left to right) = go to PREVIOUS page (moving backward)
        if (gesture.direction === 'left') {
          onFlipNext();
        } else {
          onFlipPrev();
        }
      } else {
        // Cancel - snap back to original position
        dispatchSyntheticPointer('pointermove', gesture.startX, gesture.startY, 0);
        dispatchSyntheticPointer('pointerup', gesture.startX, gesture.startY, 0);
      }

      isPeelingRef.current = false;
      onDragEnd?.();
    } else if (!gesture.isDragging) {
      // This was a tap - check for edge tap
      const container = containerRef.current;
      if (container && pageWidth > 0) {
        const rect = container.getBoundingClientRect();
        const tapX = gesture.startX - rect.left;
        const edgeZone = rect.width * EDGE_TAP_ZONE;

        if (tapX < edgeZone) {
          // Tap on left 50% - previous page
          onFlipPrev();
        } else if (tapX > rect.width - edgeZone) {
          // Tap on right 50% - next page
          onFlipNext();
        }
      }
    }

    // Reset gesture state
    gestureRef.current = {
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
      isDragging: false,
      startTime: 0,
      lastTime: 0,
      dragProgress: 0,
    };
  }, [isEnabled, pageWidth, dispatchSyntheticPointer, onFlipPrev, onFlipNext, onDragEnd]);

  // Handle touch cancel
  const handleTouchCancel = useCallback((e: TouchEvent) => {
    if (!isEnabled) return;
    
    const gesture = gestureRef.current;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (isPeelingRef.current) {
      // Cancel the flip
      dispatchSyntheticPointer('pointercancel', gesture.currentX, gesture.currentY, 0);
      isPeelingRef.current = false;
      onDragEnd?.();
    }

    // Reset gesture state
    gestureRef.current = {
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,      velocity: 0,
      direction: null,
      isDragging: false,
      startTime: 0,
      lastTime: 0,
      dragProgress: 0,
    };
  }, [isEnabled, dispatchSyntheticPointer, onDragEnd]);

  // Attach/detach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isEnabled) return;

    // Use passive: false for touchmove to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isEnabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    isDragging: gestureRef.current.isDragging,
    dragProgress: gestureRef.current.dragProgress,
  };
}
