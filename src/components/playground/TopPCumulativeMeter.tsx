/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Target, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SamplingResult } from '../../lib/llmSampling';

interface TopPCumulativeMeterProps {
  result: SamplingResult;
}

export const TopPCumulativeMeter = ({ result }: TopPCumulativeMeterProps) => {
  const targetPercent = result.topPEnabled ? result.topP * 100 : 100;
  const retainedCount = result.retainedTokens.length;

  // Candidate tokens sorted by topK ranking for the cumulative meter
  const eligibleInOrder = [...result.tokens]
    .filter((t) => t.retainedByTopK)
    .sort((a, b) => b.topKProb - a.topKProb);

  const crossingToken = result.crossingToken;
  const crossingCumulPercent = crossingToken
    ? crossingToken.cumulativeTopPProb * 100
    : result.topPThresholdCrossedAt * 100;

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Target size={16} />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-white">Top-p Cumulative Meter</h3>
            <p className="text-xs text-white/60">Candidates accumulate from highest to lowest probability</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono font-semibold text-cyan-300">
            Target p = {targetPercent.toFixed(0)}%
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-semibold text-white/80">
            {retainedCount} of 6 retained
          </span>
        </div>
      </div>

      {/* Horizontal Segmented Progress Meter */}
      <div className="relative my-6">
        {/* Top-p Target Vertical Line Marker */}
        {result.topPEnabled && result.topP < 1.0 && (
          <div
            className="absolute -top-3 bottom-0 z-20 flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{ left: `${Math.min(99, Math.max(1, targetPercent))}%` }}
          >
            <span className="rounded bg-cyan-500 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-950 shadow-md">
              Target {targetPercent.toFixed(0)}%
            </span>
            <div className="h-full w-[2px] bg-cyan-400 border-dashed border-l border-white shadow-[0_0_8px_#00f2ff]" />
          </div>
        )}

        {/* Stacked Cumulative Bar */}
        <div className="h-12 w-full rounded-2xl bg-black/40 border border-white/15 overflow-hidden flex p-1 gap-1">
          {eligibleInOrder.map((token) => {
            const segmentWidth = token.topKProb * 100;
            const isRetained = token.isEligible;
            const isCrossing = token.isThresholdCrossingToken;

            if (segmentWidth <= 0) return null;

            return (
              <div
                key={token.id}
                className={`group relative h-full rounded-xl transition-all duration-500 flex items-center justify-center overflow-hidden ${
                  isRetained ? 'opacity-100' : 'opacity-25 bg-white/10'
                } ${isCrossing ? 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : ''}`}
                style={{
                  width: `${segmentWidth}%`,
                  backgroundColor: isRetained ? token.color : undefined,
                }}
                title={`${token.token}: ${(token.topKProb * 100).toFixed(1)}% (Cumulative: ${(token.cumulativeTopPProb * 100).toFixed(1)}%)`}
              >
                <div className="truncate px-1 text-center">
                  <span className="font-display text-xs font-bold text-white drop-shadow capitalize block truncate">
                    {segmentWidth > 12 ? token.token : ''}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-white/90 drop-shadow block">
                    {segmentWidth > 16 ? `${segmentWidth.toFixed(0)}%` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 0% to 100% Horizontal Ticks */}
        <div className="mt-2 flex justify-between font-mono text-[10px] text-white/40 px-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Dynamic Status Banner */}
      <div className="space-y-3">
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                {result.topPEnabled && result.topP < 1.0 ? (
                  <>
                    The first {retainedCount} token{retainedCount > 1 ? 's' : ''} cover{' '}
                    <strong className="text-cyan-300 font-mono">{crossingCumulPercent.toFixed(1)}%</strong>. The{' '}
                    <strong className="text-cyan-300 font-mono">{targetPercent.toFixed(0)}%</strong> target has been reached.
                  </>
                ) : (
                  <>
                    Top-p is at 100% (or disabled), retaining all {retainedCount} eligible candidates in the pool.
                  </>
                )}
              </p>
              {crossingToken && result.topPEnabled && result.topP < 1.0 && (
                <p className="mt-1 text-xs text-white/70">
                  Threshold reached when adding “<strong className="text-white capitalize">{crossingToken.token}</strong>” (+
                  {(crossingToken.topKProb * 100).toFixed(1)}%).
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Indivisibility Insight */}
        <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/60">
          <AlertCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <p>
            <strong>Why total can exceed target:</strong> The retained total can exceed the target because tokens cannot be partially included. The model must add complete tokens until the cumulative probability meets or passes <em>p</em>.
          </p>
        </div>
      </div>
    </div>
  );
};
