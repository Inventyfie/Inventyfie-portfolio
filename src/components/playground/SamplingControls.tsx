/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RotateCcw, Sliders, Flame, Hash, Percent, HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface SamplingControlsProps {
  temperature: number;
  setTemperature: (val: number) => void;
  topKEnabled: boolean;
  setTopKEnabled: (val: boolean) => void;
  topK: number;
  setTopK: (val: number) => void;
  topPEnabled: boolean;
  setTopPEnabled: (val: boolean) => void;
  topP: number;
  setTopP: (val: number) => void;
  onReset: () => void;
  activeControl: 'temp' | 'topK' | 'topP' | null;
  setActiveControl: (ctrl: 'temp' | 'topK' | 'topP' | null) => void;
}

export const SamplingControls = ({
  temperature,
  setTemperature,
  topKEnabled,
  setTopKEnabled,
  topK,
  setTopK,
  topPEnabled,
  setTopPEnabled,
  topP,
  setTopP,
  onReset,
  activeControl,
  setActiveControl,
}: SamplingControlsProps) => {
  const [showTooltip, setShowTooltip] = useState<'temp' | 'topK' | 'topP' | null>(null);

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan">
            <Sliders size={18} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Sampling Controls</h3>
            <p className="text-xs text-white/60">Adjust how the model reshapes and filters candidate chances</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 transition-all hover:bg-white/20 hover:text-white"
          title="Reset to default settings (T=1.0, k=6, p=1.00)"
        >
          <RotateCcw size={13} />
          Reset Experiment
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 1. Temperature Control */}
        <div
          className={`relative rounded-2xl border p-4 transition-all ${
            activeControl === 'temp'
              ? 'border-red-500/60 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : 'border-white/10 bg-black/20 hover:border-white/20'
          }`}
          onFocus={() => setActiveControl('temp')}
          onClick={() => setActiveControl('temp')}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-red-400" />
              <label htmlFor="temp-slider" className="font-display text-sm font-bold text-white">
                Temperature (T)
              </label>
            </div>
            <span className="font-mono text-sm font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-md">
              {temperature.toFixed(2)}
            </span>
          </div>

          <p className="mb-3 text-xs leading-relaxed text-white/70">
            <strong>Changes how concentrated the probabilities are.</strong> Lower values make the top token dominant; higher values flatten the chances.
          </p>

          <input
            id="temp-slider"
            type="range"
            min="0.1"
            max="2.0"
            step="0.05"
            value={temperature}
            onChange={(e) => {
              setTemperature(parseFloat(e.target.value));
              setActiveControl('temp');
            }}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-red-500"
            aria-label="Temperature slider from 0.1 to 2.0"
          />

          <div className="mt-2 flex justify-between font-mono text-[10px] text-white/50">
            <span>0.1 (Strict)</span>
            <span>1.0 (Default)</span>
            <span>2.0 (Wild)</span>
          </div>
        </div>

        {/* 2. Top-k Control */}
        <div
          className={`relative rounded-2xl border p-4 transition-all ${
            activeControl === 'topK'
              ? 'border-amber-500/60 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : 'border-white/10 bg-black/20 hover:border-white/20'
          }`}
          onFocus={() => setActiveControl('topK')}
          onClick={() => setActiveControl('topK')}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-amber-400" />
              <label htmlFor="topk-slider" className="font-display text-sm font-bold text-white">
                Top-k (Count)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTopKEnabled(!topKEnabled)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  topKEnabled
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-white/10 text-white/40 border border-white/10'
                }`}
                title={topKEnabled ? 'Click to disable Top-k' : 'Click to enable Top-k'}
              >
                {topKEnabled ? 'ON' : 'OFF'}
              </button>
              <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-md ${
                topKEnabled ? 'text-amber-400 bg-amber-500/20' : 'text-white/40 bg-white/5'
              }`}>
                {topKEnabled ? topK : 'All (6)'}
              </span>
            </div>
          </div>

          <p className="mb-3 text-xs leading-relaxed text-white/70">
            <strong>Keeps a fixed number of the highest-probability candidates.</strong> All lower-ranking tokens are excluded immediately.
          </p>

          <input
            id="topk-slider"
            type="range"
            min="1"
            max="6"
            step="1"
            disabled={!topKEnabled}
            value={topK}
            onChange={(e) => {
              setTopK(parseInt(e.target.value, 10));
              setActiveControl('topK');
            }}
            className={`h-2 w-full appearance-none rounded-lg ${
              topKEnabled ? 'cursor-pointer bg-white/20 accent-amber-500' : 'cursor-not-allowed bg-white/10 opacity-40'
            }`}
            aria-label="Top-k slider from 1 to 6"
          />

          <div className="mt-2 flex justify-between font-mono text-[10px] text-white/50">
            <span>k = 1</span>
            <span>k = 3</span>
            <span>k = 6 (Max)</span>
          </div>
        </div>

        {/* 3. Top-p Control */}
        <div
          className={`relative rounded-2xl border p-4 transition-all ${
            activeControl === 'topP'
              ? 'border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
              : 'border-white/10 bg-black/20 hover:border-white/20'
          }`}
          onFocus={() => setActiveControl('topP')}
          onClick={() => setActiveControl('topP')}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-cyan-400" />
              <label htmlFor="topp-slider" className="font-display text-sm font-bold text-white">
                Top-p (Nucleus)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTopPEnabled(!topPEnabled)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  topPEnabled
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/10 text-white/40 border border-white/10'
                }`}
                title={topPEnabled ? 'Click to disable Top-p' : 'Click to enable Top-p'}
              >
                {topPEnabled ? 'ON' : 'OFF'}
              </button>
              <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded-md ${
                topPEnabled ? 'text-cyan-400 bg-cyan-500/20' : 'text-white/40 bg-white/5'
              }`}>
                {topPEnabled ? (topP * 100).toFixed(0) + '%' : '100%'}
              </span>
            </div>
          </div>

          <p className="mb-3 text-xs leading-relaxed text-white/70">
            <strong>Keeps the smallest leading group reaching the target.</strong> Adds candidates until their combined sum hits or passes <em>p</em>.
          </p>

          <input
            id="topp-slider"
            type="range"
            min="0.10"
            max="1.00"
            step="0.05"
            disabled={!topPEnabled}
            value={topP}
            onChange={(e) => {
              setTopP(parseFloat(e.target.value));
              setActiveControl('topP');
            }}
            className={`h-2 w-full appearance-none rounded-lg ${
              topPEnabled ? 'cursor-pointer bg-white/20 accent-cyan-500' : 'cursor-not-allowed bg-white/10 opacity-40'
            }`}
            aria-label="Top-p slider from 0.10 to 1.00"
          />

          <div className="mt-2 flex justify-between font-mono text-[10px] text-white/50">
            <span>10% (Tight)</span>
            <span>50%</span>
            <span>100% (All)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
