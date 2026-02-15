import React, { useRef } from 'react';
import { Config, formatBytes } from '../types';
import { uploadPDF } from '../lib/supabase';

interface ToolbarProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  onUpload: (file: File) => void;
  pdfName?: string;
  pdfSize?: number;
  pdfFile?: File | null;
}

export const Toolbar: React.FC<ToolbarProps> = ({ config, setConfig, onUpload, pdfName, pdfSize, pdfFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [hasCopied, setHasCopied] = React.useState(false);
  const [deployUrl, setDeployUrl] = React.useState('https://flipsys-0-1.vercel.app?share=...');
  const [flipSpeedValue, setFlipSpeedValue] = React.useState(config.flipSpeed);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
      setDeployUrl('https://flipsys-0-1.vercel.app?share=...');
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!pdfName || !pdfFile) return;
    setIsGenerating(true);

    const result = await uploadPDF(pdfFile);
    
    if (result) {
      const shareUrl = `${window.location.origin}?share=${result.id}`;
      setDeployUrl(shareUrl);
      navigator.clipboard.writeText(shareUrl);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } else {
      alert('Failed to upload PDF. Please try again.');
    }
    
    setIsGenerating(false);
  };

  return (
    <section className="h-[220px] md:h-48 bg-[#F0F0F0]/95 border-t border-panel-border flex flex-nowrap overflow-x-auto backdrop-blur-md px-10 py-4 gap-10 shrink-0 z-40">

      {/* SECTION 01: SOURCE */}
      <div className="flex-1 min-w-[200px] flex flex-col gap-3 border-r border-panel-border pr-10">
        <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
          <span className="text-[10px] font-bold text-ink-dim tracking-widest">01 SOURCE</span>
          <span className="text-[8px] font-bold text-ink-dim tracking-widest">PDF_STREAM</span>
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
          className="h-[60px] border border-dashed border-ink-dim flex items-center justify-center gap-3 cursor-pointer hover:bg-white/50 transition-colors group relative overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
        >
          <div className="w-4 h-4 rounded-full border border-ink-main border-t-transparent group-hover:rotate-180 transition-transform duration-500"></div>
          <span className="text-[9px] font-bold tracking-widest text-ink-dim group-hover:text-ink-main">
            {pdfName ? 'REPLACE FILE' : 'UPLOAD FILE'}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2 mt-auto">
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
      <div className="flex-1 min-w-[200px] flex flex-col justify-between border-r border-panel-border pr-10">
        <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
          <span className="text-[10px] font-bold text-ink-dim tracking-widest">02 PHYSICS</span>
        </div>

        <div className="flex flex-col gap-1">
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

        <div className="flex flex-col gap-1">
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

        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-ink-dim cursor-pointer" onClick={() => setConfig({ ...config, useSound: !config.useSound })}>
          <span>SOUND_FX</span>
          <div className={`w-6 h-3 border border-ink-main relative transition-all ${config.useSound ? 'bg-ink-main/10' : ''}`}>
            <div className={`absolute top-[1px] w-2 h-2 bg-ink-main transition-all duration-300 ${config.useSound ? 'left-[13px]' : 'left-[1px]'}`}></div>
          </div>
        </div>
      </div>

      {/* SECTION 03: DEPLOY */}
      <div className="flex-1 min-w-[200px] flex flex-col gap-3">
        <div className="flex justify-between items-center pb-1.5 border-b border-ink-light">
          <span className="text-[10px] font-bold text-ink-dim tracking-widest">03 DEPLOY</span>
        </div>

        <div className="border border-ink-light p-1.5 bg-white">
          <input
            type="text"
            value={deployUrl}
            readOnly
            className="w-full text-[10px] text-ink-dim font-mono outline-none bg-transparent"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!pdfName || isGenerating}
          className="w-full py-2 bg-ink-main text-white text-[10px] font-bold tracking-wider hover:bg-ink-dim transition-colors flex justify-between px-3 items-center mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isGenerating ? 'GENERATING...' : hasCopied ? 'URL COPIED!' : 'GENERATE & COPY'}</span>
          <span className={isGenerating ? 'animate-spin' : ''}>{isGenerating ? '◌' : '↗'}</span>
        </button>
      </div>

    </section>
  );
};