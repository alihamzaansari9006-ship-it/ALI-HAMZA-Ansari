import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Image as ImageIcon } from 'lucide-react';

interface ImageZoomModalProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ src, isOpen, onClose, alt }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isOpen) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      setScale(prev => Math.min(Math.max(prev + delta, 1), 8));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [isOpen]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 8));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => setScale(1);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(3);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-zinc-950"
        >
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between p-3 md:px-6 md:py-4 z-[110] bg-zinc-900/95 backdrop-blur-2xl border-b border-white/10 shrink-0 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <ImageIcon className="text-white/50 w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="text-white/70 text-xs md:text-sm font-medium hidden sm:block tracking-wide uppercase">
                Image Viewer
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              {/* Controls Pill */}
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl rounded-full px-2 py-1 md:px-3 md:py-1.5 border border-white/10 shadow-inner">
                <button onClick={handleDownload} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Download">
                  <Download size={16} className="md:w-4 md:h-4" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button onClick={handleZoomOut} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Zoom Out">
                  <ZoomOut size={16} className="md:w-4 md:h-4" />
                </button>
                <span className="text-white/90 text-xs md:text-sm font-mono w-12 md:w-14 text-center select-none">
                  {Math.round(scale * 100)}%
                </span>
                <button onClick={handleZoomIn} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Zoom In">
                  <ZoomIn size={16} className="md:w-4 md:h-4" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button onClick={handleReset} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all" title="Reset">
                  <RotateCcw size={16} className="md:w-4 md:h-4" />
                </button>
              </div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-black/40 hover:bg-red-500/20 text-white/70 hover:text-red-400 rounded-full border border-white/10 hover:border-red-500/30 transition-all shrink-0 ml-1 md:ml-2 shadow-inner"
              >
                <X size={20} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div 
            ref={containerRef}
            className="relative flex-1 w-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4 md:p-8 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:20px_20px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.img
              src={src}
              alt={alt || "Zoomed view"}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: scale,
                x: scale === 1 ? 0 : undefined,
                y: scale === 1 ? 0 : undefined,
                opacity: 1
              }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag={scale > 1}
              dragConstraints={containerRef}
              dragElastic={0.1}
              onDoubleClick={handleDoubleClick}
              className="max-w-full max-h-full object-contain pointer-events-auto select-none rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bottom Info Bar */}
          <div className="w-full p-3 md:p-4 z-[110] bg-zinc-900/95 backdrop-blur-2xl border-t border-white/10 shrink-0 flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
            <div className="text-white/40 text-xs md:text-sm font-medium flex items-center gap-3 md:gap-4">
              <span className="hidden md:inline">Double click to zoom</span>
              <span className="hidden md:inline">•</span>
              <span>Drag to pan</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Scroll to zoom</span>
              <span className="md:hidden">Pinch or double tap to zoom</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
