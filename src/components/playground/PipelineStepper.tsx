/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Play,
  CheckCircle2,
  Flame,
  Hash,
  Percent,
  Dice5,
  X,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { SamplingResult, sampleOneToken, CalculatedTokenState, PROMPT_CONTEXT } from '../../lib/llmSampling';

interface PipelineStepperProps {
  result: SamplingResult;
  activeControl: 'temp' | 'topK' | 'topP' | null;
  onSampleToken: () => void;
  isSpinning?: boolean;
  temperature?: number;
  setTemperature?: (val: number) => void;
  topKEnabled?: boolean;
  setTopKEnabled?: (val: boolean) => void;
  topK?: number;
  setTopK?: (val: number) => void;
  topPEnabled?: boolean;
  setTopPEnabled?: (val: boolean) => void;
  topP?: number;
  setTopP?: (val: number) => void;
}

export const PIPELINE_STAGES = [
  {
    id: 'logits',
    num: 1,
    title: 'Original Logits',
    short: '1. Raw Logits',
    formula: 'logits = W × h',
    description: 'The neural network computes raw scalar scores for every token in its vocabulary based on the prompt context.',
    inputType: null,
    outputType: 'Raw score from transformer network',
  },
  {
    id: 'temp',
    num: 2,
    title: 'Temperature Scaling',
    short: '2. Temperature',
    formula: 'scaled = logit / T',
    description: 'Each raw logit is divided by temperature T. Small T (< 1.0) stretches score gaps; large T (> 1.0) shrinks score gaps.',
    inputType: 'Raw logit scores',
    outputType: 'Temperature-scaled logits (logit / T)',
  },
  {
    id: 'softmax',
    num: 3,
    title: 'Softmax Probabilities',
    short: '3. Softmax',
    formula: 'P(i) = exp(s_i - max) / Σ exp',
    description: 'Exponentiates the scaled logits and normalizes them into initial percentage chances that sum to 100%.',
    inputType: 'Scaled logits',
    outputType: 'Initial probabilities summing to 100%',
  },
  {
    id: 'topK',
    num: 4,
    title: 'Top-k Filtering & Pool Normalization',
    short: '4. Top-k',
    formula: 'rank <= k  →  normalize retained sum to 100%',
    description: 'Sorts tokens descending and retains the top-k candidates. Excluded candidates get 0%, and the retained pool probabilities are immediately normalized (P_i / sum_k) so they sum to 100% before Top-p evaluation.',
    inputType: 'Softmax probabilities (all 6 tokens)',
    outputType: 'Normalized probabilities within top-k pool (P / sum(retained_k))',
  },
  {
    id: 'topP',
    num: 5,
    title: 'Top-p (Nucleus) Filtering',
    short: '5. Top-p',
    formula: 'Σ P_topk(i) >= p',
    description: 'Accumulates the normalized Top-k probabilities from highest to lowest until reaching or passing target p. Because Top-k was normalized to 100%, the cumulative sum of all k tokens steps up to exactly 100%.',
    inputType: 'Normalized probabilities of retained Top-k tokens',
    outputType: 'Cumulative sum towards target p (crossing token admitted in full)',
  },
  {
    id: 'finalProbs',
    num: 6,
    title: 'Final Probabilities',
    short: '6. Final Probs',
    formula: 'P_final(i) = P(i) / Σ P_retained',
    description: 'Normalizes the remaining eligible candidates so their lottery slices fill 100% of the selection wheel.',
    inputType: 'Filtered candidate pool',
    outputType: 'Rescaled probabilities summing to 100%',
  },
  {
    id: 'sampling',
    num: 7,
    title: 'Token Selection',
    short: '7. Sampling',
    formula: 'Sample ~ P_final',
    description: 'Generates a random draw to pick one token according to its final slice size. The chosen token is appended to the prompt.',
    inputType: 'Final rescaled probability lottery slices',
    outputType: 'Selected next token continuation',
  },
];

export const PipelineStepper = ({
  result,
  activeControl,
  onSampleToken,
  isSpinning = false,
  temperature = 1.0,
  setTemperature,
  topKEnabled = true,
  setTopKEnabled,
  topK = 6,
  setTopK,
  topPEnabled = true,
  setTopPEnabled,
  topP = 1.0,
  setTopP,
}: PipelineStepperProps) => {
  const [stepMode, setStepMode] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Wheel overlay state in stage 7
  const [showPredictModal, setShowPredictModal] = useState(false);
  const [modalSpinning, setModalSpinning] = useState(false);
  const [modalRotation, setModalRotation] = useState(0);
  const [predictedToken, setPredictedToken] = useState<CalculatedTokenState | null>(null);
  const [drawDetails, setDrawDetails] = useState<{
    randomVal: number;
    randomPercent: number;
    intervalStart: number;
    intervalEnd: number;
  } | null>(null);

  const activeIdx = stepMode ? currentStepIndex : activeControl === 'temp' ? 1 : activeControl === 'topK' ? 3 : activeControl === 'topP' ? 4 : 5;
  const currentStage = PIPELINE_STAGES[activeIdx];

  // Stage 7 Predict Wheel geometry
  const eligibleTokens = result.tokens.filter((t) => t.isEligible && t.finalProb > 0);
  const modalSize = 250;
  const modalCenter = modalSize / 2;
  const modalRadius = modalCenter - 14;

  let accAngle = 0;
  const modalSlices = eligibleTokens.map((token) => {
    const sweep = token.finalProb * 360;
    const start = accAngle;
    const end = accAngle + sweep;
    const mid = start + sweep / 2;
    accAngle += sweep;
    return { token, start, end, mid, sweep };
  });

  const getCoordinates = (angleInDegrees: number, r: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: modalCenter + r * Math.cos(angleInRadians),
      y: modalCenter + r * Math.sin(angleInRadians),
    };
  };

  const spinPredictModalWheel = () => {
    if (modalSpinning || eligibleTokens.length === 0) return;
    setModalSpinning(true);

    const sampleResult = sampleOneToken(result);
    const picked = sampleResult.token;
    const targetSlice = modalSlices.find((s) => s.token.id === picked.id) || modalSlices[0];
    const jitter = (Math.random() - 0.5) * (targetSlice.sweep * 0.5);
    const landingAngle = (targetSlice.mid + jitter + 360) % 360;

    // Pointer is fixed at 12 o'clock (0 degrees).
    // Rotating wheel by R moves angle theta to (theta + R) % 360.
    // For theta to align with 0 deg, R % 360 must equal (360 - theta) % 360.
    const desiredRotationMod = (360 - landingAngle) % 360;
    const currentRotationMod = ((modalRotation % 360) + 360) % 360;
    const deltaAngle = (desiredRotationMod - currentRotationMod + 360) % 360;
    const extraRotations = 360 * (5 + Math.floor(Math.random() * 2));
    const targetRot = modalRotation + extraRotations + (deltaAngle === 0 ? 360 : deltaAngle);

    setModalRotation(targetRot);
    setDrawDetails({
      randomVal: sampleResult.randomVal,
      randomPercent: sampleResult.randomPercent,
      intervalStart: sampleResult.intervalStart,
      intervalEnd: sampleResult.intervalEnd,
    });

    window.setTimeout(() => {
      setPredictedToken(picked);
      setModalSpinning(false);
    }, 2200);
  };

  const openPredictModal = () => {
    setPredictedToken(null);
    setDrawDetails(null);
    setShowPredictModal(true);
  };

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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
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

          {/* Stepper Controls or Predict Button */}
          <div className="flex items-center gap-2 shrink-0">
            {currentStage.id === 'sampling' ? (
              <button
                type="button"
                onClick={openPredictModal}
                className="accent-button inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan via-emerald-400 to-amber-300 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-transform hover:scale-105 active:scale-95"
              >
                <Dice5 size={16} /> Predict Next Word
              </button>
            ) : stepMode ? (
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
            ) : null}
          </div>
        </div>

        {/* INPUT OF THIS STAGE (Shown when stage has a distinct transformation input) */}
        {currentStage.inputType && (
          <div className="mb-4 border-t border-white/10 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 bg-white/10 px-2 py-0.5 rounded">
                Input to Stage {currentStage.num} ({currentStage.inputType})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
              {result.tokens.map((token) => {
                let inputVal = '';
                if (currentStage.id === 'temp') {
                  inputVal = `Logit: ${token.logit > 0 ? `+${token.logit.toFixed(1)}` : token.logit.toFixed(1)}`;
                } else if (currentStage.id === 'softmax') {
                  inputVal = `Scaled: ${token.scaledLogit > 0 ? `+${token.scaledLogit.toFixed(2)}` : token.scaledLogit.toFixed(2)}`;
                } else if (currentStage.id === 'topK') {
                  inputVal = `Softmax: ${(token.initialProb * 100).toFixed(1)}%`;
                } else if (currentStage.id === 'topP') {
                  inputVal = token.retainedByTopK ? `Top-k Pool: ${(token.topKProb * 100).toFixed(1)}%` : 'Excluded (0%)';
                } else if (currentStage.id === 'finalProbs') {
                  inputVal = token.isEligible ? `Cumul: ${(token.cumulativeTopPProb * 100).toFixed(1)}%` : 'Excluded';
                } else if (currentStage.id === 'sampling') {
                  inputVal = token.isEligible ? `${(token.finalProb * 100).toFixed(1)}%` : '0%';
                }

                return (
                  <div key={`input-${token.id}`} className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 text-center">
                    <span className="font-display text-[11px] text-white/70 capitalize block truncate">{token.token}</span>
                    <span className="font-mono text-[10px] text-white/50">{inputVal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* OUTPUT OF THIS STAGE */}
        <div className={`border-t border-white/10 pt-3 ${currentStage.inputType ? 'mt-2' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded border border-neon-cyan/30">
              Output of Stage {currentStage.num} ({currentStage.outputType})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {result.tokens.map((token) => {
              let stageValue = '';
              let isMuted = false;

              if (currentStage.id === 'logits') {
                stageValue = `Logit: ${token.logit > 0 ? `+${token.logit.toFixed(1)}` : token.logit.toFixed(1)}`;
              } else if (currentStage.id === 'temp') {
                stageValue = `Scaled: ${token.scaledLogit > 0 ? `+${token.scaledLogit.toFixed(2)}` : token.scaledLogit.toFixed(2)}`;
              } else if (currentStage.id === 'softmax') {
                stageValue = `Softmax: ${(token.initialProb * 100).toFixed(1)}%`;
              } else if (currentStage.id === 'topK') {
                isMuted = !token.retainedByTopK;
                stageValue = token.retainedByTopK
                  ? `Pool: ${(token.topKProb * 100).toFixed(1)}% (#${token.topKRank})`
                  : 'Excluded (0%)';
              } else if (currentStage.id === 'topP') {
                isMuted = !token.isEligible;
                stageValue = token.isEligible
                  ? `Cumul: ${(token.cumulativeTopPProb * 100).toFixed(1)}%`
                  : token.retainedByTopK
                  ? `Cut (> ${(token.cumulativeTopPProb * 100).toFixed(1)}%)`
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

        {/* INLINE STAGE CONTROLS: Shown beside/below for stages 2, 4, 5 */}
        {currentStage.id === 'temp' && setTemperature && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-red-300">
                <Flame size={16} className="text-red-400" />
                <span>Adjust Temperature (T) at Stage 2:</span>
              </div>
              <span className="font-mono text-xs font-bold text-red-200 bg-red-500/30 px-2.5 py-0.5 rounded border border-red-500/40">
                T = {temperature.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 cursor-pointer bg-white/20 rounded-lg accent-red-500 mb-2"
              aria-label="Temperature slider in stage 2"
            />

            <div className="flex flex-wrap items-center justify-between text-[11px] text-white/60">
              <span>0.1 (Strict & Focused)</span>
              <div className="flex gap-1.5 font-mono">
                {[0.2, 0.5, 1.0, 1.5, 2.0].map((tVal) => (
                  <button
                    key={tVal}
                    type="button"
                    onClick={() => setTemperature(tVal)}
                    className={`px-2 py-0.5 rounded transition-all ${
                      Math.abs(temperature - tVal) < 0.02
                        ? 'bg-red-500 text-white font-bold'
                        : 'bg-white/10 hover:bg-white/20 text-white/70'
                    }`}
                  >
                    T={tVal.toFixed(1)}
                  </button>
                ))}
              </div>
              <span>2.0 (Flat & Wild)</span>
            </div>
          </div>
        )}

        {currentStage.id === 'topK' && setTopK && setTopKEnabled && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
                <Hash size={16} className="text-amber-400" />
                <span>Adjust Top-k Limit at Stage 4:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopKEnabled(!topKEnabled)}
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    topKEnabled
                      ? 'bg-amber-500/40 text-amber-200 border border-amber-500/60'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {topKEnabled ? 'Top-k ON' : 'Top-k OFF'}
                </button>
                <span className="font-mono text-xs font-bold text-amber-200 bg-amber-500/30 px-2.5 py-0.5 rounded border border-amber-500/40">
                  k = {topKEnabled ? topK : '6 (All)'}
                </span>
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="6"
              step="1"
              disabled={!topKEnabled}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              className={`w-full h-2 rounded-lg mb-2 ${
                topKEnabled ? 'cursor-pointer bg-white/20 accent-amber-500' : 'opacity-30 cursor-not-allowed bg-white/10'
              }`}
              aria-label="Top-k slider in stage 4"
            />

            <div className="flex flex-wrap items-center justify-between text-[11px] text-white/60 mb-2">
              <span>k = 1 token</span>
              <div className="flex gap-1.5 font-mono">
                {[1, 2, 3, 4, 5, 6].map((kVal) => (
                  <button
                    key={kVal}
                    type="button"
                    disabled={!topKEnabled}
                    onClick={() => setTopK(kVal)}
                    className={`px-2 py-0.5 rounded transition-all ${
                      topKEnabled && topK === kVal
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-white/10 hover:bg-white/20 text-white/70'
                    }`}
                  >
                    k={kVal}
                  </button>
                ))}
              </div>
              <span>k = 6 (All Candidates)</span>
            </div>

            <div className="rounded-lg bg-black/30 p-2 text-[11px] text-amber-200/90 flex items-center gap-1.5 border border-amber-500/20">
              <Sparkles size={13} className="shrink-0 text-amber-400" />
              <span>
                <strong>How Normalization Works:</strong> Retaining {result.retainedTokens.filter(t => t.retainedByTopK).length} candidates drops excluded tokens to 0%. The retained probabilities are divided by their sum, rescaling the active pool to exactly <strong>100%</strong> before Top-p begins.
              </span>
            </div>
          </div>
        )}

        {currentStage.id === 'topP' && setTopP && setTopPEnabled && (
          <div className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3.5 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                <Percent size={16} className="text-cyan-400" />
                <span>Adjust Top-p Target at Stage 5:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopPEnabled(!topPEnabled)}
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    topPEnabled
                      ? 'bg-cyan-500/40 text-cyan-200 border border-cyan-500/60'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {topPEnabled ? 'Top-p ON' : 'Top-p OFF'}
                </button>
                <span className="font-mono text-xs font-bold text-cyan-200 bg-cyan-500/30 px-2.5 py-0.5 rounded border border-cyan-500/40">
                  p = {topPEnabled ? `${(topP * 100).toFixed(0)}%` : '100%'}
                </span>
              </div>
            </div>

            <input
              type="range"
              min="0.10"
              max="1.00"
              step="0.05"
              disabled={!topPEnabled}
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className={`w-full h-2 rounded-lg mb-2 ${
                topPEnabled ? 'cursor-pointer bg-white/20 accent-cyan-500' : 'opacity-30 cursor-not-allowed bg-white/10'
              }`}
              aria-label="Top-p slider in stage 5"
            />

            <div className="flex flex-wrap items-center justify-between text-[11px] text-white/60 mb-2">
              <span>p = 10% (Tight)</span>
              <div className="flex gap-1.5 font-mono">
                {[0.5, 0.75, 0.85, 0.9, 1.0].map((pVal) => (
                  <button
                    key={pVal}
                    type="button"
                    disabled={!topPEnabled}
                    onClick={() => setTopP(pVal)}
                    className={`px-2 py-0.5 rounded transition-all ${
                      topPEnabled && Math.abs(topP - pVal) < 0.02
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-white/10 hover:bg-white/20 text-white/70'
                    }`}
                  >
                    {(pVal * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
              <span>p = 100% (Full coverage)</span>
            </div>

            <div className="rounded-lg bg-black/30 p-2 text-[11px] text-cyan-200/90 flex items-center gap-1.5 border border-cyan-500/20">
              <Sparkles size={13} className="shrink-0 text-cyan-400" />
              <span>
                <strong>Why Cumulative Sum reaches 100%:</strong> Top-p accumulates the normalized Top-k probabilities. When all {result.tokens.filter(t => t.retainedByTopK).length} active Top-k tokens are summed, the total equals <strong>100.0%</strong> because the pool was normalized in Stage 4.
              </span>
            </div>
          </div>
        )}

        {/* Prediction Output sentence when on stage 7 */}
        {currentStage.id === 'sampling' && (
          <div className="mt-4 rounded-xl border border-neon-cyan/40 bg-black/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-white/50 block font-semibold mb-0.5">
                Next-Word Continuation:
              </span>
              <span className="font-display text-lg font-bold text-white">
                “{PROMPT_CONTEXT}{' '}
                <strong
                  className="rounded px-2 py-0.5 text-slate-950 capitalize"
                  style={{ backgroundColor: (predictedToken || result.dominantToken).color }}
                >
                  {(predictedToken || result.dominantToken).token}
                </strong>
                ”
              </span>
              <span className="text-xs text-neon-cyan font-mono ml-2 font-bold">
                ({(((predictedToken || result.dominantToken).finalProb) * 100).toFixed(1)}% chance)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY WHEEL MODAL FOR PREDICT ACTION AT STAGE 7 */}
      {showPredictModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPredictModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-950 p-6 shadow-2xl text-white text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowPredictModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            <div className="flex items-center justify-center gap-2 mb-1">
              <Dice5 size={20} className="text-neon-cyan" />
              <h4 className="font-display text-lg font-bold text-white">Next Token Lottery Wheel</h4>
            </div>
            <p className="text-xs text-white/60 mb-4">
              Spin to sample a next token according to the final stage-6 probabilities
            </p>

            {/* Wheel SVG */}
            <div className="relative my-4 flex flex-col items-center justify-center select-none">
              <div className="absolute top-0 z-20 flex flex-col items-center -translate-y-2 pointer-events-none">
                <div className="h-0 w-0 border-x-7 border-x-transparent border-t-[12px] border-t-white drop-shadow-md" />
                <div className="h-2 w-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00f2ff]" />
              </div>

              <svg
                width={modalSize}
                height={modalSize}
                className="drop-shadow-xl"
                style={{
                  transform: `rotate(${modalRotation}deg)`,
                  transition: modalSpinning ? 'transform 2.2s cubic-bezier(0.12, 0.8, 0.2, 1)' : 'none',
                }}
              >
                <circle cx={modalCenter} cy={modalCenter} r={modalRadius + 3} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                {modalSlices.map((slice) => {
                  if (slice.sweep >= 359.99) {
                    return <circle key={slice.token.id} cx={modalCenter} cy={modalCenter} r={modalRadius} fill={slice.token.color} />;
                  }
                  const p1 = getCoordinates(slice.start, modalRadius);
                  const p2 = getCoordinates(slice.end, modalRadius);
                  const largeArc = slice.sweep > 180 ? 1 : 0;
                  const path = `M ${modalCenter} ${modalCenter} L ${p1.x} ${p1.y} A ${modalRadius} ${modalRadius} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
                  const labelCoord = getCoordinates(slice.mid, modalRadius * 0.65);

                  return (
                    <g key={slice.token.id}>
                      <path d={path} fill={slice.token.color} stroke="#090d16" strokeWidth="1.5" />
                      {slice.sweep > 20 && (
                        <text
                          x={labelCoord.x}
                          y={labelCoord.y}
                          fill="#ffffff"
                          fontSize={slice.sweep > 45 ? '12' : '10'}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${slice.mid + 90}, ${labelCoord.x}, ${labelCoord.y})`}
                          className="drop-shadow capitalize pointer-events-none"
                        >
                          {slice.token.token}
                        </text>
                      )}
                    </g>
                  );
                })}
                <circle cx={modalCenter} cy={modalCenter} r={16} fill="#090d16" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <circle cx={modalCenter} cy={modalCenter} r={5} fill="#00f2ff" />
              </svg>
            </div>

            {/* Spin Button */}
            <div className="mt-4 space-y-3">
              <button
                type="button"
                disabled={modalSpinning || eligibleTokens.length === 0}
                onClick={spinPredictModalWheel}
                className="accent-button w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan via-emerald-400 to-amber-300 py-2.5 text-sm font-bold text-slate-950 shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {modalSpinning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Executing Weighted Sampling...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    🎲 Spin & Sample Next Token
                  </>
                )}
              </button>

              {/* Real Mathematical Sampling Algorithm Explanation Banner */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-left text-xs text-white/80 space-y-1.5 font-sans">
                <div className="flex items-center gap-1.5 font-bold text-neon-cyan text-[11px] uppercase tracking-wider">
                  <Sparkles size={14} />
                  <span>The Real AI Algorithm: Inverse Transform Sampling</span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  The spinning wheel is an interactive visual metaphor. Under the hood, LLMs execute this exact algorithm:
                </p>
                <ol className="list-decimal pl-4 text-[10px] text-white/60 space-y-0.5 font-mono">
                  <li>Generate pseudo-random float <code className="text-amber-300">r ~ Uniform(0.0, 1.0)</code></li>
                  <li>Split [0, 1) into cumulative segments proportional to each token's final probability</li>
                  <li>Select the token whose probability bracket contains <code className="text-amber-300">r</code></li>
                </ol>

                {/* Live calculation details during spinning / upon result */}
                {modalSpinning && (
                  <div className="mt-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 p-2 text-[11px] font-mono text-neon-cyan animate-pulse">
                    ⚡ Sampling algorithm in progress: drawing random float r in [0, 1)...
                  </div>
                )}

                {predictedToken && drawDetails && !modalSpinning && (
                  <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-[11px] font-mono text-emerald-300">
                    <div>✓ Drawn <strong className="text-white">r = {drawDetails.randomVal.toFixed(4)}</strong> ({drawDetails.randomPercent.toFixed(1)}%)</div>
                    <div>✓ Landed in bracket: <span className="capitalize font-bold text-white">“{predictedToken.token}”</span> [{drawDetails.intervalStart.toFixed(1)}% — {drawDetails.intervalEnd.toFixed(1)}%]</div>
                  </div>
                )}
              </div>

              {/* Result display in Modal */}
              {predictedToken && !modalSpinning && (
                <div className="rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 p-3 text-center animate-in fade-in">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-neon-cyan font-bold mb-1">
                    <Trophy size={14} /> Random Draw Picked:
                  </div>
                  <p className="font-display text-lg font-bold text-white">
                    “The dragon breathed{' '}
                    <span
                      className="rounded px-2 py-0.5 text-slate-950 capitalize"
                      style={{ backgroundColor: predictedToken.color }}
                    >
                      {predictedToken.token}
                    </span>
                    .”
                  </p>
                  <p className="text-[11px] text-white/60 mt-1">
                    Final Lottery Probability: <strong>{(predictedToken.finalProb * 100).toFixed(1)}%</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
