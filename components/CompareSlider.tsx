import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface CompareSliderProps {
  originalImage: string;
  generatedImage: string | null;
  loading: boolean;
}

const CompareSlider: React.FC<CompareSliderProps> = ({ originalImage, generatedImage, loading }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!generatedImage && !loading) {
    return (
      <div className="w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center">
         <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
         <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
            <span className="bg-white/90 px-4 py-2 rounded-full text-sm font-medium shadow-sm backdrop-blur-sm">
              Select a style or type a command to reimagine
            </span>
         </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden relative shadow-xl select-none group cursor-ew-resize"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* Background Layer (Generated/After) */}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 animate-pulse z-10">
           <div className="text-center">
             <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-2" />
             <p className="text-indigo-200 font-medium">Designing your space...</p>
           </div>
        </div>
      ) : (
        <img 
          src={generatedImage || originalImage} 
          alt="New Design" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
      )}

      {/* Foreground Layer (Original/Before) - Clipped */}
      {/* If generatedImage exists or loading, we show the slider mechanism. 
          If loading, we keep showing original under the loader or just the loader. 
          Let's keep original visible if generatedImage is null but loading.
      */}
      {generatedImage && !loading && (
        <div 
            className="absolute inset-0 w-full h-full"
            style={{ 
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` 
            }}
        >
          <img 
            src={originalImage} 
            alt="Original" 
            className="w-full h-full object-cover" 
          />
          {/* Label for Before */}
          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md">
            Original
          </div>
        </div>
      )}

      {/* Label for After (only visible on right side) */}
      {!loading && generatedImage && (
        <div className="absolute top-4 right-4 bg-indigo-600/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md">
           Reimagined
        </div>
      )}

      {/* Slider Handle */}
      {generatedImage && !loading && (
        <div 
          className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-20 flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-slate-700">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareSlider;
