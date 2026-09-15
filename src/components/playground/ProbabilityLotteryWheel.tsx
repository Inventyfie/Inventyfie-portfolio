/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Sparkles, BarChart2, RefreshCw, Trophy, Quote } from 'lucide-react';
import { SamplingResult, sampleOneToken, simulateBatchDraws, CalculatedTokenState, PROMPT_CONTEXT } from '../../lib/llmSampling';

interface ProbabilityLotteryWheelProps {
  result: SamplingResult;
  onSpinStart?: () => void;
  onSpinEnd?: (token: CalculatedTokenState) => void;
}

export const ProbabilityLotteryWheel = ({
  result,
  onSpinStart,
  onSpinEnd,
}: ProbabilityLotteryWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedToken, setSelectedToken] = useState<CalculatedTokenState | null>(null);
  const [drawHistory, setDrawHistory] = useState<CalculatedTokenState[]>([]);
  const [batchResults, setBatchResults] = useState<{
    counts: Record<string, number>;
    frequencies: Record<string, number>;
    totalDraws: number;
  } | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const eligibleTokens = result.tokens.filter((t) => t.isEligible && t.finalProb > 0);

  // Calculate slice geometry for SVG
  const size = 260;
  const center = size / 2;
  const radius = center - 16;

  // Build slices
  let accumulatedAngle = 0;
  const slices = eligibleTokens.map((token) => {
    const sweepAngle = token.finalProb * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    accumulatedAngle += sweepAngle;

    return {
      token,
      startAngle,
      endAngle,
      midAngle,
      sweepAngle,
    };
  });

  const getCoordinatesForAngle = (angleInDegrees: number, r: number) => {
    // 0 deg is at top (12 o'clock, which is -90 in standard trig)
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: center + r * Math.cos(angleInRadians),
      y: center + r * Math.sin(angleInRadians),
    };
  };

  const spinWheel = () => {
    if (isSpinning || eligibleTokens.length === 0) return;

    setIsSpinning(true);
    onSpinStart?.();

    // 1. Sample token
    const { token: picked, randomPercent } = sampleOneToken(result);

    // 2. Find slice for picked token
    const targetSlice = slices.find((s) => s.token.id === picked.id) || slices[0];

    // Pointer is at 12 o'clock (0 deg). To land on targetSlice, wheel must rotate such that
    // targetSlice.midAngle aligns with 0 deg.
    // Randomize slightly within slice to be realistic
    const jitter = (Math.random() - 0.5) * (targetSlice.sweepAngle * 0.7);
    const landingAngle = targetSlice.midAngle + jitter;

    // Spin 4 to 6 full rotations (1440 - 2160 deg) minus landing angle
    const extraRotations = 360 * (5 + Math.floor(Math.random() * 2));
    const targetRotation = rotation + extraRotations + (360 - (landingAngle % 360));

    setRotation(targetRotation);

    window.setTimeout(() => {
      setSelectedToken(picked);
      setDrawHistory((prev) => [picked, ...prev.slice(0, 9)]);
      setIsSpinning(false);
      onSpinEnd?.(picked);
    }, 2400);
  };

  const handleRun100Draws = () => {
    const batch = simulateBatchDraws(result, 100);
    setBatchResults(batch);
    setShowBatchModal(true);
  };

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-white">Probability Lottery Wheel</h3>
              <p className="text-xs text-white/60">Weighted random sampling simulator</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRun100Draws}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            title="Simulate 100 draws instantly to observe empirical frequencies"
          >
            <BarChart2 size={13} className="text-neon-cyan" />
            Run 100 Draws
          </button>
        </div>

        {/* Wheel Graphic Container */}
        <div className="relative my-4 flex flex-col items-center justify-center">
          {/* 12 O'Clock Pointer / Ticker Arrow */}
          <div className="absolute top-0 z-20 flex flex-col items-center -translate-y-2">
            <div className="h-0 w-0 border-x-8 border-x-transparent border-t-[14px] border-t-white filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
            <div className="h-2 w-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00f2ff]" />
          </div>

          {/* Wheel SVG */}
          <div className="relative">
            <svg
              width={size}
              height={size}
              className="drop-shadow-2xl select-none"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? 'transform 2.4s cubic-bezier(0.12, 0.8, 0.2, 1)'
                  : 'none',
              }}
            >
              <circle
                cx={center}
                cy={center}
                r={radius + 4}
                fill="none"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="6"
              />

              {/* Slices */}
              {slices.map((slice) => {
                if (slice.sweepAngle >= 359.99) {
                  // Single token has 100% of wheel
                  return (
                    <circle
                      key={slice.token.id}
                      cx={center}
                      cy={center}
                      r={radius}
                      fill={slice.token.color}
                    />
                  );
                }

                const p1 = getCoordinatesForAngle(slice.startAngle, radius);
                const p2 = getCoordinatesForAngle(slice.endAngle, radius);
                const largeArcFlag = slice.sweepAngle > 180 ? 1 : 0;

                const pathData = [
                  `M ${center} ${center}`,
                  `L ${p1.x} ${p1.y}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y}`,
                  'Z',
                ].join(' ');

                // Label coords
                const labelCoord = getCoordinatesForAngle(slice.midAngle, radius * 0.65);

                return (
                  <g key={slice.token.id}>
                    <path
                      d={pathData}
                      fill={slice.token.color}
                      stroke="rgba(10, 15, 25, 0.6)"
                      strokeWidth="2"
                    />
                    {slice.sweepAngle > 16 && (
                      <text
                        x={labelCoord.x}
                        y={labelCoord.y}
                        fill="#ffffff"
                        fontSize={slice.sweepAngle > 40 ? '12' : '10'}
                        fontWeight="bold"
                        fontFamily="Space Grotesk, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${slice.midAngle + 90}, ${labelCoord.x}, ${labelCoord.y})`}
                        className="drop-shadow pointer-events-none select-none capitalize"
                      >
                        {slice.token.token}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Center Hub */}
              <circle cx={center} cy={center} r={18} fill="#090d16" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <circle cx={center} cy={center} r={6} fill="#00f2ff" />
            </svg>
          </div>

          {/* Spin Action Button */}
          <div className="mt-5 w-full max-w-xs">
            <button
              type="button"
              disabled={isSpinning || eligibleTokens.length === 0}
              onClick={spinWheel}
              className="accent-button w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neon-cyan via-emerald-400 to-amber-400 py-3 px-5 text-sm font-bold text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSpinning ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Spinning Lottery Wheel...
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  Spin and Pick a Token
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Token Result Box */}
        {selectedToken && (
          <div className="my-4 rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 p-4 shadow-lg animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy size={16} className="text-neon-cyan" />
              <span className="text-xs uppercase tracking-wider font-bold text-neon-cyan">
                Drawn Continuation
              </span>
            </div>
            <p className="font-display text-lg sm:text-xl font-bold text-white">
              “{PROMPT_CONTEXT}{' '}
              <span
                className="inline-block rounded-lg px-2.5 py-0.5 text-slate-950 shadow-md capitalize"
                style={{ backgroundColor: selectedToken.color }}
              >
                {selectedToken.token}
              </span>”
            </p>
            <p className="mt-1 text-xs text-white/70">
              Selected with <strong className="text-white">{(selectedToken.finalProb * 100).toFixed(1)}%</strong> lottery chance.
            </p>
          </div>
        )}

        {/* Key Teaching Quote */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/80">
          <Quote size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="italic font-medium">
            “A larger slice has a better chance, but a smaller slice can still win.”
          </p>
        </div>
      </div>

      {/* 100 Draws Modal / Drawer */}
      {showBatchModal && batchResults && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="100 Draws Simulation Results"
          onClick={() => setShowBatchModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-neon-cyan" />
                <h4 className="font-display text-lg font-bold text-white">100 Simulated Draws</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-white/70">
              Here is how 100 independent random samples turned out compared to the expected theoretical probability:
            </p>

            <div className="space-y-3 font-mono text-xs">
              {result.tokens.map((token) => {
                const observedCount = batchResults.counts[token.id] || 0;
                const observedPercent = batchResults.frequencies[token.id] || 0;
                const expectedPercent = token.finalProb * 100;

                return (
                  <div key={token.id} className="rounded-xl border border-white/10 bg-black/30 p-2.5">
                    <div className="mb-1 flex items-center justify-between font-sans">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-md" style={{ backgroundColor: token.color }} />
                        <span className="font-bold text-white capitalize">{token.token}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-neon-cyan font-bold">
                          Observed: {observedCount}/100 ({observedPercent.toFixed(0)}%)
                        </span>
                        <span className="text-white/50">Expected: {expectedPercent.toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* Comparative Dual Bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{
                            width: `${observedPercent}%`,
                            backgroundColor: token.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleRun100Draws}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Re-run 100 Draws
              </button>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="rounded-full bg-neon-cyan px-4 py-2 text-xs font-bold text-slate-950 hover:bg-neon-cyan/80"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
