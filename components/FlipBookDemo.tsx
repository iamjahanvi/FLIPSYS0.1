import React, { useState, useRef } from 'react';
import { FlipBook, FlipBookRef } from './FlipBook';

export const FlipBookDemo: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [flipSpeed, setFlipSpeed] = useState(1000);
  const [shadowIntensity, setShadowIntensity] = useState(50);
  const bookRef = useRef<FlipBookRef>(null);

  const totalPages = 8;

  // Generate sample pages
  const pages = Array.from({ length: totalPages }, (_, i) => (
    <div
      key={i}
      className="w-full h-full flex items-center justify-center text-4xl font-bold"
      style={{
        background: i % 2 === 0 ? '#ffffff' : '#f8f8f8',
        border: '1px solid #e0e0e0',
      }}
    >
      <div className="text-center">
        <div className="text-6xl mb-4">{i + 1}</div>
        <div className="text-sm text-gray-400">Page {i + 1} of {totalPages}</div>
      </div>
    </div>
  ));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const goToPrev = () => {
    bookRef.current?.flipPrev();
  };

  const goToNext = () => {
    bookRef.current?.flipNext();
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] p-8">
      <h1 className="text-2xl font-bold mb-8 text-center">Framer Motion FlipBook Demo</h1>
      
      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-8 bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Flip Speed Control */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-gray-600">FLIP SPEED</label>
              <span className="text-sm font-bold text-gray-800">{flipSpeed}ms</span>
            </div>
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={flipSpeed}
              onChange={(e) => setFlipSpeed(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Change this while flipping - no flicker!
            </p>
          </div>

          {/* Shadow Intensity Control */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-gray-600">SHADOW INTENSITY</label>
              <span className="text-sm font-bold text-gray-800">{shadowIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={shadowIntensity}
              onChange={(e) => setShadowIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Changes apply immediately - smooth transition!
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={goToPrev}
            disabled={currentPage === 0}
            className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            ← Previous
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded font-mono">
            Page {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={goToNext}
            disabled={currentPage >= totalPages - 1}
            className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* FlipBook */}
      <div className="flex justify-center">
        <div
          className="inline-block"
          style={{
            filter: `drop-shadow(0 25px 50px rgba(0, 0, 0, ${shadowIntensity / 100 * 0.5}))`,
            transition: 'filter 0.3s ease-out',
          }}
        >
          <FlipBook
            ref={bookRef}
            width={300}
            height={400}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            flippingTime={flipSpeed}
            shadowIntensity={shadowIntensity}
          >
            {pages}
          </FlipBook>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-2xl mx-auto mt-8 text-center text-sm text-gray-600">
        <p className="mb-2">
          <strong>Try this:</strong> Click "Next" to start a flip, then immediately adjust the FLIP SPEED slider.
        </p>
        <p>
          The next flip will use the new speed without any flickering or re-mounting!
        </p>
      </div>
    </div>
  );
};
