import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  minHeight?: number;
  maxHeight?: number;
  defaultHeight?: number;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  minHeight = 120,
  maxHeight = 400,
  defaultHeight = 220,
}) => {
  const [height, setHeight] = useState(defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
    e.preventDefault();
  }, [height]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = dragStartY.current - e.clientY;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, dragStartHeight.current + deltaY));
    setHeight(newHeight);
  }, [isDragging, minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      className="relative flex flex-col shrink-0"
      style={{ height: `${height}px` }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`
          absolute top-0 left-0 right-0 h-4 -translate-y-1/2 z-50
          flex items-center justify-center
          cursor-ns-resize
          group
          ${isDragging ? 'bg-ink-main/10' : 'hover:bg-ink-main/5'}
          transition-colors
        `}
      >
        {/* Visual indicator */}
        <div className={`
          w-16 h-1 rounded-full
          ${isDragging ? 'bg-ink-main' : 'bg-ink-dim/30 group-hover:bg-ink-dim/50'}
          transition-colors
        `} />
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
