import React, { useRef, useState, useEffect } from 'react';
import { Config, formatBytes } from '../types';
import { uploadPDF, UploadResult } from '../lib/supabase';

interface ToolbarProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  onUpload: (file: File) => void;
  pdfName?: string;
  pdfSize?: number;
  pdfFile?: File | null;
  onAccordionChange?: (openSection: SectionType) => void;
  isMinimized?: boolean;
  onMinimizedChange?: (isMinimized: boolean) => void;
}

export type SectionType = 'source' | 'physics' | 'share' | null;

export const Toolbar: React.FC<ToolbarProps> = ({ config, setConfig, onUpload, pdfName, pdfSize, pdfFile, onAccordionChange, isMinimized: externalIsMinimized, onMinimizedChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [hasCopied, setHasCopied] = React.useState(false);
  const [deployUrl, setDeployUrl] = React.useState('https://flipd.online/?share=...');
  const [flipSpeedValue, setFlipSpeedValue] = React.useState(config.flipSpeed);
  const [openSection, setOpenSection] = useState<SectionType>('physics');
  const [toast, setToast] = React.useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [internalIsMinimized, setInternalIsMinimized] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const isShareUrlReady = !deployUrl.includes('share=...');
  
  // Use external state if provided, otherwise use internal state
  const isMinimized = externalIsMinimized !== undefined ? externalIsMinimized : internalIsMinimized;
  const setIsMinimized = (value: boolean) => {
    if (externalIsMinimized === undefined) {
      setInternalIsMinimized(value);
    }
    onMinimizedChange?.(value);
  };

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2000);
  };

  // Reset to Physics tab when a new file is uploaded/replaced
  useEffect(() => {
    setOpenSection('physics');
    onAccordionChange?.('physics');
  }, [pdfFile?.name]);

  const toggleSection = (section: SectionType) => {
    const newSection = openSection === section ? null : section;
    setOpenSection(newSection);
    onAccordionChange?.(newSection);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadError(false);
      onUpload(file);
      setDeployUrl('https://flipd.online/?share=...');
    } else if (file) {
      setUploadError(true);
      showToast('Only PDFs are supported. Try again.');
      // Clear error state after 2 seconds
      setTimeout(() => setUploadError(false), 2000);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Play click sound when toggle is turned ON
  const playClickSound = () => {
    const audio = new Audio('/click.wav');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  };

  const handleSoundToggle = () => {
    const newValue = !config.useSound;
    // Play sound only when turning ON
    if (newValue) {
      playClickSound();
    }
    setConfig({ ...config, useSound: newValue });
  };

  const handleGenerate = async () => {
    if (!pdfName || !pdfFile) return;
    setIsGenerating(true);

    try {
      const result = await uploadPDF(pdfFile, config);
      
      if (result.success) {
        const shareUrl = `https://flipd.online/?share=${result.id}`;
        setDeployUrl(shareUrl);
        // Use legacy execCommand for better mobile compatibility
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setHasCopied(true);
          setTimeout(() => setHasCopied(false), 2000);
        } catch (err) {
          console.log('Copy failed, URL generated:', shareUrl);
        }
        document.body.removeChild(textArea);
      } else {
        alert(`Failed to upload PDF: ${(result as Extract<UploadResult, { success: false }>).error}`);
      }
    } catch (err: any) {
      alert('Upload error: ' + (err.message || 'Unknown error'));
    }
    
    setIsGenerating(false);
  };

  return (
    <section 
      className={`relative bg-[#F0F0F0]/95 backdrop-blur-md shrink-0 z-40 pb-[env(safe-area-inset-bottom,0px)] md:border-t md:border-panel-border ${isMinimized ? 'md:h-10 md:px-6 md:py-2' : 'md:h-48 md:px-6 md:py-4'}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Desktop Minimize Handle - Centered at top, larger touch area */}
      {!isMinimized && (
        <button
          onClick={() => setIsMinimized(true)}
          className="hidden md:block absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-12 cursor-pointer group/Handle"
          aria-label="Minimize toolbar"
        >
          {/* Visible handle line - 8px from top */}
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-ink-dim/40 group-hover/Handle:bg-ink-dim/60 transition-opacity duration-150 ${isHovering ? 'opacity-100' : 'opacity-0'}`} />
          
          {/* Tooltip - 8px below handle (16px from top) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-ink-main text-white text-[10px] font-bold tracking-widest whitespace-nowrap transition-opacity duration-150 pointer-events-none opacity-0 group-hover/Handle:opacity-100">
            MINIMIZE
          </div>
        </button>
      )}

      {/* Desktop Minimized Bar */}
      {isMinimized && (
        <div 
          onClick={() => setIsMinimized(false)}
          className="hidden md:flex h-full items-center justify-center cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-ink-dim">
            <div className="w-6 h-[2px] bg-ink-dim/40"></div>
            <span className="text-[10px] font-bold tracking-widest px-2 py-1 transition-all duration-150 group-hover:bg-ink-main group-hover:text-white">EXPAND TOOLBAR</span>
            <div className="w-6 h-[2px] bg-ink-dim/40"></div>
          </div>
        </div>
      )}
      
      {/* Desktop: Horizontal layout - Hidden when minimized */}
      <div className={`hidden md:flex h-full gap-6 ${isMinimized ? '!hidden' : ''}`}>
        {/* SECTION 01: SOURCE */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">01 SOURCE</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />

          <button
            onClick={triggerUpload}
            className={`h-[60px] bg-white border border-dashed flex items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors group relative overflow-hidden ${uploadError ? 'border-red-500' : 'border-ink-dim'}`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
          >
            <svg 
              className="w-4 h-4 text-ink-main group-hover:scale-110 transition-transform duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-[9px] font-bold tracking-widest text-ink-main">
              {pdfName ? 'REPLACE FILE' : 'UPLOAD FILE'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-ink-dim tracking-widest mb-1">FILENAME</span>
              <span className="text-xs text-ink-main truncate font-bold" title={pdfName || 'NONE'}>
                {pdfName ? (pdfName.length > 12 ? pdfName.substring(0, 10) + '...' : pdfName) : 'N/A'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-ink-dim tracking-widest mb-1">SIZE</span>
              <span className="text-xs text-ink-main font-bold">{pdfSize ? formatBytes(pdfSize) : '0KB'}</span>
            </div>
          </div>
        </div>

        {/* SECTION 02: PHYSICS */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-4 border-r border-panel-border pr-6">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">02 PHYSICS</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold tracking-widest text-ink-dim">
              <span>FLIP_SPEED</span>
              <span className="text-ink-main">{flipSpeedValue}ms</span>
            </div>
            <input
              type="range"
              min="500"
              max="2000"
              step="100"
              value={flipSpeedValue}
              onChange={(e) => setFlipSpeedValue(parseInt(e.target.value))}
              onMouseUp={() => setConfig({ ...config, flipSpeed: flipSpeedValue })}
              onTouchEnd={() => setConfig({ ...config, flipSpeed: flipSpeedValue })}
              className="w-full h-[2px] bg-ink-light appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink-main [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-main [&::-webkit-slider-thumb]:mt-[-1px]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold tracking-widest text-ink-dim">
              <span>SHADOW</span>
              <span className="text-ink-main">{config.shadowIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={config.shadowIntensity}
              onChange={(e) => setConfig({ ...config, shadowIntensity: parseInt(e.target.value) })}
              className="w-full h-[2px] bg-ink-light appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink-main [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-main [&::-webkit-slider-thumb]:mt-[-1px]"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-ink-dim cursor-pointer" onClick={handleSoundToggle}>
            <span>SOUND_FX</span>
            <div className={`w-6 h-3 border border-ink-main relative transition-all ${config.useSound ? 'bg-ink-main/10' : ''}`}>
              <div className={`absolute top-[1px] w-2 h-2 bg-ink-main transition-all duration-300 ${config.useSound ? 'left-[13px]' : 'left-[1px]'}`}></div>
            </div>
          </div>
        </div>

        {/* SECTION 03: SHARE */}
        <div className="flex-1 min-w-[200px] flex flex-col gap-3">
          <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
            <span className="text-[10px] font-bold text-ink-dim tracking-widest">03 SHARE</span>
          </div>

          <div 
            className="h-[60px] bg-white border border-dashed border-ink-dim flex items-center justify-between gap-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors group relative overflow-hidden"
            style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
            onClick={() => {
              if (!isShareUrlReady) return;
              navigator.clipboard.writeText(deployUrl);
              setHasCopied(true);
              setTimeout(() => setHasCopied(false), 2000);
            }}
          >
            <input
              type="text"
              value={deployUrl}
              readOnly
              className="flex-1 text-[10px] text-ink-dim font-mono outline-none bg-transparent cursor-pointer"
            />
            {isShareUrlReady && (
              <svg 
                className="w-4 h-4 text-ink-main group-hover:scale-110 transition-transform duration-300 shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {hasCopied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                )}
              </svg>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!pdfName || isGenerating}
            className="w-full py-2 bg-ink-main text-white text-[10px] font-bold tracking-wider hover:bg-ink-dim transition-colors flex justify-between px-3 items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isGenerating ? 'GENERATING...' : hasCopied ? 'URL COPIED!' : 'GENERATE & COPY'}</span>
            <span className={isGenerating ? 'animate-spin' : ''}>{isGenerating ? '◌' : '↗'}</span>
          </button>
        </div>
      </div>

      {/* Mobile: Horizontal Tab layout */}
      <div className="md:hidden flex flex-col-reverse">
        
        {/* Tab Bar - Always visible at bottom */}
        <div className="flex">
          {/* Tab 01: SOURCE */}
          <button
            onClick={() => toggleSection('source')}
            className={`flex-1 flex flex-col items-center justify-center px-4 py-3 border-r border-t border-panel-border last:border-r-0 transition-colors ${openSection === 'source' ? 'bg-white border-t-transparent' : 'bg-[#F0F0F0]/95'}`}
          >
            <span className={`text-[10px] font-bold tracking-widest leading-tight ${openSection === 'source' ? 'text-ink-main' : 'text-ink-dim'}`}>01</span>
            <span className={`text-[10px] font-bold tracking-widest leading-tight ${openSection === 'source' ? 'text-ink-main' : 'text-ink-dim'}`}>SOURCE</span>
          </button>
          
          {/* Tab 02: PHYSICS */}
          <button
            onClick={() => toggleSection('physics')}
            className={`flex-1 flex flex-col items-center justify-center px-4 py-3 border-r border-t border-panel-border last:border-r-0 transition-colors ${openSection === 'physics' ? 'bg-white border-t-transparent' : 'bg-[#F0F0F0]/95'}`}
          >
            <span className={`text-[10px] font-bold tracking-widest leading-tight ${openSection === 'physics' ? 'text-ink-main' : 'text-ink-dim'}`}>02</span>
            <span className={`text-[10px] font-bold tracking-widest leading-tight ${openSection === 'physics' ? 'text-ink-main' : 'text-ink-dim'}`}>PHYSICS</span>
          </button>
          
          {/* Tab 03: SHARE - Direct action button */}
          <button 
            onClick={async () => {
              if (!pdfName || !pdfFile || isGenerating) return;
              setOpenSection(null);
              setIsGenerating(true);
              try {
                const result = await uploadPDF(pdfFile, config);
                if (result.success) {
                  const shareUrl = `https://flipd.online/?share=${result.id}`;
                  setDeployUrl(shareUrl);
                  // Use legacy execCommand for better mobile compatibility
                  const textArea = document.createElement('textarea');
                  textArea.value = shareUrl;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    showToast('Link copied to clipboard');
                  } catch (err) {
                    showToast('Link ready! Tap to copy');
                  }
                  document.body.removeChild(textArea);
                } else {
                  showToast(`Failed: ${(result as Extract<UploadResult, { success: false }>).error}`);
                }
              } catch (err: any) {
                showToast('Upload error: ' + (err.message || 'Unknown error'));
              }
              setIsGenerating(false);
            }}
            disabled={!pdfName || isGenerating}
            className="flex-1 flex items-center justify-center px-4 py-3 bg-ink-main text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center gap-1 h-[10px]">
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            ) : (
              <span className="flex flex-col items-center">
                <svg className="w-2.5 h-2.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-[10px] font-bold tracking-widest leading-tight">SHARE</span>
              </span>
            )}
          </button>
        </div>

        {/* Expanded Content Panel - Opens above tabs */}
        {openSection && (
          <div className="bg-white border-t border-panel-border border-b-0 px-4 py-6">
            
            {/* SOURCE Content */}
            {openSection === 'source' && (
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf"
                  className="hidden"
                />

                <button
                  onClick={triggerUpload}
                  className={`h-[50px] bg-[#F0F0F0F2] border border-dashed flex items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors group relative overflow-hidden ${uploadError ? 'border-red-500' : 'border-ink-dim'}`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
                >
                  <svg 
                    className="w-4 h-4 text-ink-main group-hover:scale-110 transition-transform duration-300" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-[9px] font-bold tracking-widest text-ink-main">
                    {pdfName ? 'REPLACE FILE' : 'UPLOAD FILE'}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] font-bold text-ink-dim tracking-widest mb-1">FILENAME</span>
                    <span className="text-xs text-ink-main truncate font-bold" title={pdfName || 'NONE'}>
                      {pdfName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-bold text-ink-dim tracking-widest mb-1">SIZE</span>
                    <span className="text-xs text-ink-main font-bold">{pdfSize ? formatBytes(pdfSize) : '0KB'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PHYSICS Content */}
            {openSection === 'physics' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-widest text-ink-dim">
                    <span>FLIP_SPEED</span>
                    <span className="text-ink-main">{flipSpeedValue}ms</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="2000"
                    step="100"
                    value={flipSpeedValue}
                    onChange={(e) => setFlipSpeedValue(parseInt(e.target.value))}
                    onMouseUp={() => setConfig({ ...config, flipSpeed: flipSpeedValue })}
                    onTouchEnd={() => setConfig({ ...config, flipSpeed: flipSpeedValue })}
                    className="w-full h-[2px] bg-ink-light appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink-main [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-main [&::-webkit-slider-thumb]:mt-[-1px]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] font-bold tracking-widest text-ink-dim">
                    <span>SHADOW</span>
                    <span className="text-ink-main">{config.shadowIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.shadowIntensity}
                    onChange={(e) => setConfig({ ...config, shadowIntensity: parseInt(e.target.value) })}
                    className="w-full h-[2px] bg-ink-light appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink-main [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-main [&::-webkit-slider-thumb]:mt-[-1px]"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-ink-dim cursor-pointer py-2 -my-2" onClick={handleSoundToggle}>
                  <span className="pointer-events-none">SOUND_FX</span>
                  <div className={`w-6 h-3 border border-ink-main relative transition-all pointer-events-none ${config.useSound ? 'bg-ink-main/10' : ''}`}>
                    <div className={`absolute top-[1px] w-2 h-2 bg-ink-main transition-all duration-300 pointer-events-none ${config.useSound ? 'left-[13px]' : 'left-[1px]'}`}></div>
                  </div>
                </div>
              </div>
            )}


          </div>
        )}
      </div>

      {/* Toast Notification */}
      <div className={`fixed bottom-36 left-4 right-4 bg-ink-main text-white px-6 py-3 text-[10px] font-bold tracking-wider text-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-30 md:hidden ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
        {toast.message}
      </div>

    </section>
  );
};
