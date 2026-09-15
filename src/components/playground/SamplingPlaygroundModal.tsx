/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { InteractivePlayground } from './InteractivePlayground';

interface SamplingPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SamplingPlaygroundModal = ({
  isOpen,
  onClose,
}: SamplingPlaygroundModalProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle Escape key to close playground without disrupting the article behind it
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isFullscreen, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[120] bg-black/85 backdrop-blur-lg flex items-center justify-center animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Interactive LLM Sampling Playground"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative flex flex-col h-full bg-slate-950/98 shadow-[0_0_80px_rgba(0,242,255,0.15)] text-white transition-all duration-300 ${
          isFullscreen
            ? 'w-full max-w-none max-h-none rounded-none border-0'
            : 'max-h-[96vh] w-full max-w-6xl rounded-3xl border border-white/20 overflow-hidden'
        }`}
      >
        {/* Sticky Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/15 bg-slate-950/90 px-4 py-3 sm:px-6 md:py-3.5 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/30 border border-neon-cyan/40 text-neon-cyan shadow-[0_0_20px_rgba(0,242,255,0.25)]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg md:text-xl font-bold leading-tight text-white">
                Interactive Next-Token Sampling Playground
              </h2>
              <p className="text-xs text-white/50">
                Temperature, Top-k and Top-p Simulator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white/80 transition-all hover:bg-white/20 hover:text-white"
              title={isFullscreen ? 'Exit Full Screen' : 'Open Full Screen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 size={15} /> <span className="hidden sm:inline">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 size={15} /> <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white"
              aria-label="Close interactive playground"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Scrollable Modal Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <InteractivePlayground embedded={false} />
        </main>
      </div>
    </div>,
    document.body,
  );
};

