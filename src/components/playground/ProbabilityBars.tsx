/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarChart3, TrendingUp, Filter } from 'lucide-react';
import { SamplingResult } from '../../lib/llmSampling';

interface ProbabilityBarsProps {
  result: SamplingResult;
}

export const ProbabilityBars = ({ result }: ProbabilityBarsProps) => {
  const yTicks = [100, 75, 50, 25, 0];

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md flex flex-col justify-between">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neon-cyan/20 text-neon-cyan">
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-white">Probability Distribution</h3>
              <p className="text-xs text-white/60">Fixed 0% to 100% vertical scale</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-white/70">
              <span className="h-2 w-2 rounded-full bg-neon-cyan" /> Final Pool %
            </span>
          </div>
        </div>

        {/* Vertical Chart Container */}
        <div className="relative mt-6 h-64 sm:h-72 w-full pt-4 pb-2">
          {/* Y-Axis Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-2">
            {yTicks.map((tick) => (
              <div key={tick} className="flex items-center gap-2 w-full">
                <span className="w-8 text-right font-mono text-[10px] text-white/40">{tick}%</span>
                <div className="h-[1px] w-full bg-white/10" />
              </div>
            ))}
          </div>

          {/* Bar Columns */}
          <div className="absolute inset-y-0 left-10 right-0 grid grid-cols-6 gap-2 sm:gap-4 items-end pb-2">
            {result.tokens.map((token) => {
              const isEligible = token.isEligible;
              const percentValue = token.finalProb * 100;
              const initialPercentValue = token.initialProb * 100;

              return (
                <div
                  key={token.id}
                  className={`group relative flex h-full flex-col items-center justify-end transition-all duration-300 ${
                    !isEligible ? 'opacity-35 hover:opacity-80' : 'opacity-100'
                  }`}
                >
                  {/* Percentage label above bar */}
                  <div className="mb-1 text-center font-mono">
                    <span
                      className={`text-xs sm:text-sm font-bold transition-all ${
                        isEligible ? 'text-white' : 'text-white/40 line-through'
                      }`}
                    >
                      {percentValue.toFixed(1)}%
                    </span>
                  </div>

                  {/* Vertical bar column track */}
                  <div className="relative w-full max-w-[48px] h-[78%] rounded-t-xl bg-white/[0.04] overflow-hidden flex items-end">
                    {/* Ghost bar of initial softmax prob if excluded or scaled */}
                    {!isEligible && (
                      <div
                        className="absolute bottom-0 inset-x-0 rounded-t-lg bg-white/10 border-t border-dashed border-white/30 transition-all duration-500"
                        style={{ height: `${Math.min(100, Math.max(2, initialPercentValue))}%` }}
                        title={`Initial softmax before filter: ${initialPercentValue.toFixed(1)}%`}
                      />
                    )}

                    {/* Active Probability Bar */}
                    <div
                      className="w-full rounded-t-xl transition-all duration-500 ease-out shadow-lg"
                      style={{
                        height: isEligible ? `${Math.min(100, Math.max(3, percentValue))}%` : '0%',
                        backgroundColor: token.color,
                        boxShadow: isEligible ? `0 0 20px ${token.color}40` : 'none',
                      }}
                    />
                  </div>

                  {/* Token Name Label Below */}
                  <div className="mt-2.5 flex flex-col items-center gap-1">
                    <span className="font-display text-xs sm:text-sm font-bold capitalize text-white">
                      {token.token}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-sans uppercase font-bold tracking-wider ${
                        isEligible
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {isEligible ? 'Active' : 'Cut'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Legend / Insight */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-neon-cyan shrink-0" />
          <span>
            Tallest candidate: <strong className="text-white capitalize">{result.dominantToken.token}</strong> (
            {(result.dominantToken.finalProb * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-amber-400 shrink-0" />
          <span>
            {result.excludedTokens.length > 0
              ? `${result.excludedTokens.length} tokens excluded and faded`
              : 'All 6 tokens remain in the pool'}
          </span>
        </div>
      </div>
    </div>
  );
};
