import React, { useRef } from 'react';

interface LandingPageProps {
  onUpload: (file: File) => void;
}

export function LandingPage({ onUpload }: LandingPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-6 py-12">
      {/* Main Headline - Responsive font sizes */}
      <div className="text-center mb-6 sm:mb-10 w-full max-w-[800px]">
        <h1 className="text-ink-main font-mono font-semibold tracking-[-0.04em] leading-tight sm:leading-[1.5] sm:font-medium">
          <span className="block text-[32px] sm:text-4xl md:text-5xl lg:text-6xl">
            Turn <span className="text-black">PDFs into</span>
          </span>
          <span className="block text-[32px] sm:text-4xl md:text-5xl lg:text-6xl mt-0.5 sm:mt-2 leading-[1.325]">
            <span className="text-gray-500">interactive</span> flipbooks
          </span>
        </h1>
      </div>

      {/* Upload Component */}
      <div className="w-full max-w-[800px] mb-6 sm:mb-8 px-2 sm:px-0">
        <div
          className="bg-white border border-panel-border p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:border-ink-main hover:bg-white hover:shadow-lg"
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-ink-light mb-4">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">00 SOURCE_INPUT</span>
          </div>

          {/* Upload Content */}
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center border border-dashed border-panel-border">
            <div className="w-8 h-8 border border-ink-main flex items-center justify-center mb-4">
              <span className="text-lg font-bold">+</span>
            </div>
            <h2 className="text-sm font-bold text-ink-main tracking-widest mb-1">DROP_PDF_STREAM</h2>
            <p className="text-[10px] text-ink-dim">OR CLICK TO BROWSE LOCAL_FS</p>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-ink-light mt-4 gap-1 sm:gap-0">
            <span className="text-[8px] font-bold text-ink-dim tracking-widest">MAX_SIZE: 20MB // FORMAT: PDF_V1.7+</span>
            <span className="text-[8px] font-bold text-ink-dim tracking-widest">VER: 1.0.42_STABLE</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/pdf"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Three Steps in One Box - Responsive: stack on mobile, row on desktop */}
      <div className="w-full max-w-[800px] px-2 sm:px-0">
        <div className="bg-[#F0F0F0] border border-panel-border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 sm:gap-6 lg:gap-8">
          {/* Step 01: Upload */}
          <div className="flex items-stretch gap-3 flex-1 min-w-0">
            <div className="w-6 border border-ink-main flex items-center justify-center shrink-0 bg-white self-stretch">
              <span className="text-[10px] sm:text-[10px] font-bold text-ink-main">01</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[10px] sm:text-[10px] font-bold text-ink-main tracking-widest mb-0.5">UPLOAD</h3>
              <p className="hidden sm:block text-[10px] sm:text-[10px] text-ink-dim leading-relaxed">Import any PDF document into the workspace to start</p>
                            <p className="sm:hidden text-[10px] text-ink-dim leading-relaxed">Import your PDF document</p>
            </div>
          </div>

          {/* Step 02: Configure */}
          <div className="flex items-stretch gap-3 flex-1 min-w-0">
            <div className="w-6 border border-ink-main flex items-center justify-center shrink-0 bg-white self-stretch">
              <span className="text-[10px] sm:text-[10px] font-bold text-ink-main">02</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[10px] sm:text-[10px] font-bold text-ink-main tracking-widest mb-0.5">CONFIGURE</h3>
              <p className="hidden sm:block text-[10px] sm:text-[10px] text-ink-dim leading-relaxed">Adjust physics, shadows, and flip mechanics</p>
                            <p className="sm:hidden text-[10px] text-ink-dim leading-relaxed">Customize motion, style and more</p>
            </div>
          </div>

          {/* Step 03: Deploy */}
          <div className="flex items-stretch gap-3 flex-1 min-w-0">
            <div className="w-6 border border-ink-main flex items-center justify-center shrink-0 bg-white self-stretch">
              <span className="text-[10px] sm:text-[10px] font-bold text-ink-main">03</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[10px] sm:text-[10px] font-bold text-ink-main tracking-widest mb-0.5">SHARE</h3>
              <p className="hidden sm:block text-[10px] sm:text-[10px] text-ink-dim leading-relaxed">Get a unique URL to share the interactive flipbook</p>
                            <p className="sm:hidden text-[10px] text-ink-dim leading-relaxed">Generate link to share with others</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
