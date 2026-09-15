/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Play, CheckCircle2 } from 'lucide-react';
import { SamplingResult } from '../../lib/llmSampling';

interface PipelineStepperProps {
  result: SamplingResult;
  activeControl: 'temp' | 'topK' | 'topP' | null;
  onSampleToken: () => void;
  isSpinning?: boolean;
}

export const PIPELINE_STAGES = [
  {
    id: 'logits',
    num: 1,
    title: 'Original Logits',
    short: '1. Raw Logits',
    formula: 'logits = W × h',
    description: 'The neural network computes raw scalar scores for every token in its vocabulary based on the prompt context.',
  },
  {
    id: 'temp',
    num: 2,
    title: 'Temperature Scaling',
    short: '2. Temperature',
    formula: 'scaled = logit / T',
    description: 'Each raw logit is divided by temperature T. Small T (< 1.0) stretches score gaps; large T (> 1.0) shrinks score gaps.',
  },
  {
    id: 'softmax',
    num: 3,
    title: 'Softmax Probabilities',
    short: '3. Softmax',
    formula: 'P(i) = exp(s_i - max) / Σ exp',
    description: 'Exponentiates the scaled logits and normalizes them into initial percentage chances that sum to 100%.',
  },
  {
    id: 'topK',
    num: 4,
    title: 'Top-k Filtering',
    short: '4. Top-k',
    formula: 'rank <= k',
    description: 'Sorts tokens descending and keeps only the top-k highest-scoring candidates. Excluded tokens receive 0% chance.',
  },
  {
    id: 'topP',
    num: 5,
    title: 'Top-p (Nucleus) Filtering',
    short: '5. Top-p',
    formula: 'Σ P(i) >= p',
    description: 'Accumulates probabilities until reaching or crossing target p. Tokens beyond the threshold are excluded.',
  },
  {
    id: 'finalProbs',
    num: 6,
    title: 'Final Probabilities',
    short: '6. Final Probs',
    formula: 'P_final(i) = P(i) / Σ P_retained',
    description: 'Normalizes the remaining eligible candidates so their lottery slices fill 100% of the selection wheel.',
  },
  {
    id: 'sampling',
    num: 7,
    title: 'Token Selection',
    short: '7. Sampling',
    formula: 'Sample ~ P_final',
    description: 'Generates a random draw to pick one token according to its final slice size. The chosen token is appended to the prompt.',
  },
];

export const PipelineStepper = ({
  result,
  activeControl,
  onSampleToken,
  isSpinning = false,
}: PipelineStepperProps) => {
  const [stepMode, setStepMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // In live mode, determine the highlighted stage based on user interaction
  const getActiveStageIndex = () => {
    if (stepMode) return currentStepIndex;
    if (activeControl === 'temp') return 1; // Temperature
    if (activeControl === 'topK') return 3; // Top-k
    if (activeControl === 'topP') return 4; // Top-p
    return 5; // Final Probs
  };

  const activeIdx = getActiveStageIndex();
  const currentStage = PIPELINE_STAGES[activeIdx];

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md">
      {/* Header with Mode Toggle */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-neon-cyan animate-pulse" />
            <h3 className="font-display text-lg font-bold text-white">Animated Processing Pipeline</h3>
          </div>
          <p className="text-xs text-white/60">Follow the mathematical journey from raw transformer scores to token selection</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStepMode(!stepMode);
              if (!stepMode) setCurrentStepIndex(0);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              stepMode
                ? 'bg-neon-cyan text-slate-950 shadow-[0_0_20px_rgba(0,242,255,0.4)]'
                : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Sparkles size={14} />
            {stepMode ? 'Step-by-Step Mode ON' : 'Switch to Step-by-Step Mode'}
          </button>
        </div>
      </div>

      {/* Pipeline Steps Flow */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex min-w-[620px] items-center justify-between gap-1 sm:gap-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive = idx === activeIdx;
            const isCompleted = idx < activeIdx;

            return (
              <div key={stage.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => {
                    setStepMode(true);
                    setCurrentStepIndex(idx);
                  }}
                  className={`group relative flex w-full flex-col items-center rounded-2xl border p-2.5 text-center transition-all ${
                    isActive
                      ? 'border-neon-cyan bg-neon-cyan/20 ring-2 ring-neon-cyan/40 shadow-[0_0_25px_rgba(0,242,255,0.3)]'
                      : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-white/80 hover:border-emerald-500/50'
                      : 'border-white/10 bg-black/20 text-white/50 hover:border-white/25 hover:text-white/80'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                          isActive
                            ? 'bg-neon-cyan text-slate-950'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {stage.num}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold leading-tight ${isActive ? 'text-white' : ''}`}>
                    {stage.short}
                  </span>
                </button>

                {idx < PIPELINE_STAGES.length - 1 ? (
                  <ArrowRight
                    size={14}
                    className={`mx-1 shrink-0 ${
                      idx < activeIdx ? 'text-emerald-400/70' : 'text-white/20'
                    }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Detail Card */}
      <div className="rounded-2xl border border-neon-cyan/30 bg-black/40 p-4 sm:p-5 shadow-inner">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-neon-cyan/20 px-2 py-0.5 font-mono text-xs font-bold text-neon-cyan">
                Stage {currentStage.num} of 7
              </span>
              <h4 className="font-display text-lg font-bold text-white">{currentStage.title}</h4>
              <code className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-amber-300">
                {currentStage.formula}
              </code>
            </div>
            <p className="text-xs leading-relaxed text-white/80 max-w-2xl">{currentStage.description}</p>
          </div>

          {/* Stepper Controls or Quick Action */}
          <div className="flex items-center gap-2 shrink-0">
            {stepMode ? (
              <>
                <button
                  type="button"
                  disabled={currentStepIndex === 0}
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft size={16} /> Prev Step
                </button>
                <button
                  type="button"
                  disabled={currentStepIndex === PIPELINE_STAGES.length - 1}
                  onClick={() => setCurrentStepIndex((prev) => Math.min(PIPELINE_STAGES.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1 rounded-xl bg-neon-cyan px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-neon-cyan/80 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next Step <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isSpinning}
                onClick={onSampleToken}
                className="accent-button inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan to-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Play size={14} fill="currentColor" />
                {isSpinning ? 'Sampling Token...' : 'Test Draw This Step'}
              </button>
            )}
          </div>
        </div>

        {/* Live Stage Token State Snapshot */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 border-t border-white/10 pt-3">
          {result.tokens.map((token) => {
            let stageValue = '';
            let isMuted = false;

            if (currentStage.id === 'logits') {
              stageValue = `Logit: ${token.logit.toFixed(1)}`;
            } else if (currentStage.id === 'temp') {
              stageValue = `Scaled: ${token.scaledLogit.toFixed(2)}`;
            } else if (currentStage.id === 'softmax') {
              stageValue = `Softmax: ${(token.initialProb * 100).toFixed(1)}%`;
            } else if (currentStage.id === 'topK') {
              isMuted = !token.retainedByTopK;
              stageValue = token.retainedByTopK ? `Top-k: Keep (#${token.topKRank})` : 'Top-k: Cut ✗';
            } else if (currentStage.id === 'topP') {
              isMuted = !token.isEligible;
              stageValue = token.isEligible
                ? `Cumul: ${(token.cumulativeTopPProb * 100).toFixed(1)}%`
                : token.retainedByTopK
                ? `Over limit (${(token.cumulativeTopPProb * 100).toFixed(1)}%)`
                : 'Cut by Top-k';
            } else if (currentStage.id === 'finalProbs') {
              isMuted = !token.isEligible;
              stageValue = token.isEligible
                ? `Final: ${(token.finalProb * 100).toFixed(1)}%`
                : 'Excluded (0%)';
            } else {
              isMuted = !token.isEligible;
              stageValue = token.isEligible
                ? `Lottery: ${(token.finalProb * 100).toFixed(1)}%`
                : '0% in Lottery';
            }

            return (
              <div
                key={token.id}
                className={`rounded-xl border p-2 text-center transition-all ${
                  isMuted
                    ? 'border-white/5 bg-white/[0.02] opacity-35'
                    : 'border-white/15 bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: token.color }}
                  />
                  <span className="font-display text-xs font-bold text-white capitalize truncate">
                    {token.token}
                  </span>
                </div>
                <div className="font-mono text-[11px] font-semibold text-neon-cyan truncate">
                  {stageValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
