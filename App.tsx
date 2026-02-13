import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Stage } from './components/Stage';
import { Config, DefaultConfig } from './types';

// PDF.js worker setup is required for react-pdf
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function App() {
  const [config, setConfig] = useState<Config>(DefaultConfig);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Background pattern style from the design
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: '#E6E6E6',
    backgroundImage: `
      radial-gradient(circle, #D6D6D6 1px, transparent 1px),
      linear-gradient(to right, rgba(200,200,200,0.3) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(200,200,200,0.3) 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px, 100px 100px, 100px 100px',
  };

  const handleUpload = (file: File) => {
    setPdfFile(file);
    setCurrentPage(0);
    setIsReady(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setIsReady(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-mono text-ink-main overflow-hidden select-none" style={backgroundStyle}>
      <Header isReady={isReady} />
      
      <main className="flex-1 flex flex-col min-h-0">
        <Stage 
          pdfFile={pdfFile} 
          config={config} 
          onDocumentLoadSuccess={handleDocumentLoadSuccess}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          onUpload={handleUpload}
        />
        
        <Toolbar 
          config={config} 
          setConfig={setConfig} 
          onUpload={handleUpload}
          pdfName={pdfFile?.name}
          pdfSize={pdfFile?.size}
        />
      </main>
    </div>
  );
}