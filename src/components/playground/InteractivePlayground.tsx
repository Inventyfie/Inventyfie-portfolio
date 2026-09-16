/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import {
  Sparkles,
  Flame,
  Hash,
  Percent,
  Play,
  RotateCcw,
  BarChart2,
  RefreshCw,
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  Info,
  X,
  Sliders,
  TrendingUp,
  Dice5,
  BookOpen,
} from 'lucide-react';
import {
  calculateSampling,
  sampleOneToken,
  simulateBatchDraws,
  GUIDED_EXPERIMENTS,
  PREDICTION_QUIZZES,
  CalculatedTokenState,
  SamplingResult,
  PROMPT_CONTEXT,
} from '../../lib/llmSampling';
import { PipelineStepper } from './PipelineStepper';
import { ContextScoresTable } from './ContextScoresTable';

interface InteractivePlaygroundProps {
  embedded?: boolean;
}

export const InteractivePlayground = ({ embedded = true }: InteractivePlaygroundProps) => {
  // Core sampling state
  const [temperature, setTemperature] = useState(1.0);
  const [topKEnabled, setTopKEnabled] = useState(true);
  const [topK, setTopK] = useState(6);
  const [topPEnabled, setTopPEnabled] = useState(true);
  const [topP, setTopP] = useState(1.0);

  // Interaction state
  const [activeControl, setActiveControl] = useState<'temp' | 'topK' | 'topP' | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedToken, setSelectedToken] = useState<CalculatedTokenState | null>(null);
  const [drawDetails, setDrawDetails] = useState<{
    randomVal: number;
    randomPercent: number;
    intervalStart: number;
    intervalEnd: number;
  } | null>(null);
  const [spinHistory, setSpinHistory] = useState<CalculatedTokenState[]>([]);
  const [batchResults, setBatchResults] = useState<{
    counts: Record<string, number>;
    frequencies: Record<string, number>;
    totalDraws: number;
  } | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Progressive View (Detailed 7-stage walkthrough tab)
  const [showProgressiveView, setShowProgressiveView] = useState(false);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [activeExpId, setActiveExpId] = useState<string>('default');

  // Compute calculated probabilities
  const result: SamplingResult = useMemo(() => {
    return calculateSampling({
      temperature,
      topKEnabled,
      topK,
      topPEnabled,
      topP,
    });
  }, [temperature, topKEnabled, topK, topPEnabled, topP]);

  const eligibleTokens = result.tokens.filter((t) => t.isEligible && t.finalProb > 0);
  const dominantToken = result.dominantToken;

  // Preset reset
  const handleReset = () => {
    setTemperature(1.0);
    setTopKEnabled(true);
    setTopK(6);
    setTopPEnabled(true);
    setTopP(1.0);
    setActiveControl(null);
    setActiveExpId('default');
  };

  // Preset experiments
  const applyPreset = (
    tempVal: number,
    kEnabled: boolean,
    kVal: number,
    pEnabled: boolean,
    pVal: number,
    presetId: string,
  ) => {
    setTemperature(tempVal);
    setTopKEnabled(kEnabled);
    setTopK(kVal);
    setTopPEnabled(pEnabled);
    setTopP(pVal);
    setActiveExpId(presetId);
  };

  // Wheel slice geometry
  const size = 240;
  const center = size / 2;
  const radius = center - 14;

  let accumulatedAngle = 0;
  const slices = eligibleTokens.map((token) => {
    const sweepAngle = token.finalProb * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + sweepAngle;
    const midAngle = startAngle + sweepAngle / 2;
    accumulatedAngle += sweepAngle;
    return { token, startAngle, endAngle, midAngle, sweepAngle };
  });

  const getCoordinatesForAngle = (angleInDegrees: number, r: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: center + r * Math.cos(angleInRadians),
      y: center + r * Math.sin(angleInRadians),
    };
  };

  // Wheel spin action
  const spinWheel = () => {
    if (isSpinning || eligibleTokens.length === 0) return;
    setIsSpinning(true);

    const sampleResult = sampleOneToken(result);
    const picked = sampleResult.token;
    const targetSlice = slices.find((s) => s.token.id === picked.id) || slices[0];
    const jitter = (Math.random() - 0.5) * (targetSlice.sweepAngle * 0.5);
    const landingAngle = (targetSlice.midAngle + jitter + 360) % 360;

    // Pointer is fixed at 12 o'clock (0 degrees).
    // Rotating wheel by R moves angle theta to (theta + R) % 360.
    // For theta to align with 0 deg, R % 360 must equal (360 - theta) % 360.
    const desiredRotationMod = (360 - landingAngle) % 360;
    const currentRotationMod = ((rotation % 360) + 360) % 360;
    const deltaAngle = (desiredRotationMod - currentRotationMod + 360) % 360;
    const extraRotations = 360 * (5 + Math.floor(Math.random() * 2));
    const targetRotation = rotation + extraRotations + (deltaAngle === 0 ? 360 : deltaAngle);

    setRotation(targetRotation);
    setDrawDetails({
      randomVal: sampleResult.randomVal,
      randomPercent: sampleResult.randomPercent,
      intervalStart: sampleResult.intervalStart,
      intervalEnd: sampleResult.intervalEnd,
    });

    window.setTimeout(() => {
      setSelectedToken(picked);
      setSpinHistory((prev) => [picked, ...prev.slice(0, 4)]);
      setIsSpinning(false);
    }, 2200);
  };

  // Run 100 draws
  const handleRun100Draws = () => {
    const batch = simulateBatchDraws(result, 100);
    setBatchResults(batch);
    setShowBatchModal(true);
  };

  // Current active token displayed in the sentence
  const displayToken = selectedToken || dominantToken;
  const currentQuiz = PREDICTION_QUIZZES[quizIndex];
  const selectedQuizOpt = currentQuiz.options.find((o) => o.id === selectedQuizAnswer);

  return (
    <div
      id="interactive-sampling-playground"
      className={`rounded-3xl border border-neon-cyan/30 bg-slate-950/90 shadow-2xl backdrop-blur-xl ${
        embedded ? 'my-8 p-5 sm:p-7 md:p-9' : 'p-4 sm:p-6'
      }`}
    >
      {/* 1. Header & Controls Bar */}
      <div className="mb-6 border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-neon-cyan animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-neon-cyan bg-neon-cyan/10 px-3 py-1 rounded-full border border-neon-cyan/30">
              Interactive Lab
            </span>
            <span className="text-xs text-white/50 hidden sm:inline">
              Adjust controls to see live probabilities and wheel slices change together
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProgressiveView(!showProgressiveView)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                showProgressiveView
                  ? 'bg-neon-cyan text-slate-950 shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                  : 'border border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25'
              }`}
              title="Open the step-by-step 7-stage calculation pipeline"
            >
              <Layers size={14} />
              {showProgressiveView ? 'Hide Progressive View' : '🔬 Progressive View'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/20 hover:text-white transition-all"
            >
              <RotateCcw size={13} />
              Reset All
            </button>
          </div>
        </div>

        {/* Live Sentence Banner */}
        <div className="rounded-2xl border border-white/15 bg-gradient-to-r from-black/60 via-slate-900/70 to-black/60 p-4 sm:p-5 shadow-inner">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span className="uppercase tracking-wider font-semibold">
              Live Prompt & Chosen Next Word:
            </span>
            <span className="text-[11px] text-white/40 font-mono">
              {selectedToken ? '🎯 Drawn via Wheel Spin' : '★ Leading Candidate (Most Likely)'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 font-display text-2xl sm:text-3xl font-bold text-white">
            <span>“The dragon breathed</span>
            <span
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1 text-slate-950 shadow-lg capitalize transition-all duration-300 ring-2 ring-white/30"
              style={{ backgroundColor: displayToken?.color || '#ef4444' }}
            >
              {displayToken?.token || 'fire'}
              <span className="text-xs font-mono font-bold opacity-90">
                ({((displayToken?.finalProb || 0) * 100).toFixed(1)}%)
              </span>
            </span>
            <span>…”</span>
          </div>
        </div>
      </div>

      {/* Progressive View Modal/Section (Optional Walkthrough Tab with Close Option) */}
      {showProgressiveView && (
        <div className="mb-8 rounded-3xl border border-neon-cyan/50 bg-slate-900/95 p-5 sm:p-7 shadow-[0_0_40px_rgba(0,242,255,0.15)] animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="font-display text-base sm:text-lg font-bold text-white">
                  Progressive Calculation Pipeline (Step-by-Step Walkthrough)
                </h4>
                <p className="text-xs text-white/60">
                  Inspect the exact mathematical transformation at every stage from transformer logits to sampling
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProgressiveView(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
              aria-label="Close progressive view"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-6">
            <PipelineStepper
              result={result}
              activeControl={activeControl}
              onSampleToken={spinWheel}
              isSpinning={isSpinning}
              temperature={temperature}
              setTemperature={setTemperature}
              topKEnabled={topKEnabled}
              setTopKEnabled={setTopKEnabled}
              topK={topK}
              setTopK={setTopK}
              topPEnabled={topPEnabled}
              setTopPEnabled={setTopPEnabled}
              topP={topP}
              setTopP={setTopP}
            />
            <ContextScoresTable result={result} />
          </div>
        </div>
      )}

      {/* 2. Quick 1-Click Learning Scenarios (Presets) */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles size={15} className="text-neon-cyan" />
          <h4 className="font-display text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Quick Learning Scenarios (Click to Load):
          </h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => applyPreset(1.0, true, 6, true, 1.0, 'default')}
            className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
              activeExpId === 'default'
                ? 'border-neon-cyan bg-neon-cyan/20 text-white font-bold shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="font-bold text-white">⚖️ Balanced</div>
            <div className="text-[10px] text-white/50">T=1.0, All 6</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset(0.2, true, 6, true, 1.0, 'laser')}
            className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
              activeExpId === 'laser'
                ? 'border-red-500 bg-red-500/20 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="font-bold text-red-300">🎯 Laser Focus</div>
            <div className="text-[10px] text-white/50">T=0.20 (Fire 92%)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset(2.0, true, 6, true, 1.0, 'creative')}
            className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
              activeExpId === 'creative'
                ? 'border-purple-500 bg-purple-500/20 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="font-bold text-purple-300">🎨 Creative Chaos</div>
            <div className="text-[10px] text-white/50">T=2.00 (Flatter)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset(1.0, true, 3, false, 1.0, 'top3')}
            className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
              activeExpId === 'top3'
                ? 'border-amber-500 bg-amber-500/20 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="font-bold text-amber-300">🥉 Top-3 Only</div>
            <div className="text-[10px] text-white/50">k=3 (Cuts 3)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset(1.0, false, 6, true, 0.9, 'nucleus')}
            className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
              activeExpId === 'nucleus'
                ? 'border-cyan-500 bg-cyan-500/20 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="font-bold text-cyan-300">🎯 90% Target</div>
            <div className="text-[10px] text-white/50">p=0.90 (Top 4)</div>
          </button>

          <button
            type="button"
            onClick={() => applyPreset(0.5, true, 4, true, 0.85, 'combo')}
            className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
              activeExpId === 'combo'
                ? 'border-emerald-500 bg-emerald-500/20 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="font-bold text-emerald-300">⚡ Real Combo</div>
            <div className="text-[10px] text-white/50">T=0.5, k=4, p=0.85</div>
          </button>
        </div>
      </div>

      {/* 3. The 3 Interactive Sliders (Directly on Top for Instant Live Feedback on Charts Below) */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* Slider 1: Temperature */}
        <div
          className={`rounded-2xl border p-4 transition-all ${
            activeControl === 'temp'
              ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
              : 'border-white/10 bg-black/30'
          }`}
          onClick={() => setActiveControl('temp')}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-red-400" />
              <span className="font-display text-sm font-bold text-white">Temperature (T)</span>
            </div>
            <span className="font-mono text-xs font-bold text-red-300 bg-red-500/20 px-2 py-0.5 rounded">
              {temperature.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-white/60 mb-2.5">
            <strong>Scales logits (l / T):</strong> Low T (&lt;1.0) sharpens top tokens; High T (&gt;1.0) flattens distribution.
          </p>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.05"
            value={temperature}
            onChange={(e) => {
              setTemperature(parseFloat(e.target.value));
              setActiveControl('temp');
              setActiveExpId('custom');
            }}
            className="w-full h-2 cursor-pointer bg-white/20 rounded-lg accent-red-500"
            aria-label="Temperature slider"
          />
          <div className="flex justify-between text-[10px] font-mono text-white/40 mt-1">
            <span>0.1 (Strict)</span>
            <span>1.0 (Default)</span>
            <span>2.0 (Wild)</span>
          </div>
        </div>

        {/* Slider 2: Top-k */}
        <div
          className={`rounded-2xl border p-4 transition-all ${
            activeControl === 'topK'
              ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : 'border-white/10 bg-black/30'
          }`}
          onClick={() => setActiveControl('topK')}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Hash size={16} className="text-amber-400" />
              <span className="font-display text-sm font-bold text-white">Top-k Limit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTopKEnabled(!topKEnabled);
                  setActiveExpId('custom');
                }}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  topKEnabled ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' : 'bg-white/10 text-white/40'
                }`}
              >
                {topKEnabled ? 'ON' : 'OFF'}
              </button>
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                {topKEnabled ? `${topK} tokens` : 'All (6)'}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/60 mb-2.5">
            <strong>Headcount cap:</strong> Keeps the top <em>k</em> highest-scoring candidates; lowers remaining to 0% and rescales.
          </p>
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            disabled={!topKEnabled}
            value={topK}
            onChange={(e) => {
              setTopK(parseInt(e.target.value, 10));
              setActiveControl('topK');
              setActiveExpId('custom');
            }}
            className={`w-full h-2 rounded-lg ${
              topKEnabled ? 'cursor-pointer bg-white/20 accent-amber-500' : 'cursor-not-allowed opacity-30 bg-white/10'
            }`}
            aria-label="Top-k slider"
          />
          <div className="flex justify-between text-[10px] font-mono text-white/40 mt-1">
            <span>1 token</span>
            <span>3 tokens</span>
            <span>6 (All)</span>
          </div>
        </div>

        {/* Slider 3: Top-p */}
        <div
          className={`rounded-2xl border p-4 transition-all ${
            activeControl === 'topP'
              ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
              : 'border-white/10 bg-black/30'
          }`}
          onClick={() => setActiveControl('topP')}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Percent size={16} className="text-cyan-400" />
              <span className="font-display text-sm font-bold text-white">Top-p (Nucleus)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTopPEnabled(!topPEnabled);
                  setActiveExpId('custom');
                }}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  topPEnabled ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'bg-white/10 text-white/40'
                }`}
              >
                {topPEnabled ? 'ON' : 'OFF'}
              </button>
              <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded">
                {topPEnabled ? `${(topP * 100).toFixed(0)}%` : '100%'}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/60 mb-2.5">
            <strong>Cumulative probability target:</strong> Accumulates top tokens until their sum meets or passes <em>p</em>.
          </p>
          <input
            type="range"
            min="0.10"
            max="1.00"
            step="0.05"
            disabled={!topPEnabled}
            value={topP}
            onChange={(e) => {
              setTopP(parseFloat(e.target.value));
              setActiveControl('topP');
              setActiveExpId('custom');
            }}
            className={`w-full h-2 rounded-lg ${
              topPEnabled ? 'cursor-pointer bg-white/20 accent-cyan-500' : 'cursor-not-allowed opacity-30 bg-white/10'
            }`}
            aria-label="Top-p slider"
          />
          <div className="flex justify-between text-[10px] font-mono text-white/40 mt-1">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 4. Core Visual Grid: Probability Bars + Lottery Wheel (Immediate Visual Response on Same Screen) */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Left: Probability Bars & Top-p Progress */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-black/30 p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div>
                <span className="font-display text-sm font-bold text-white uppercase tracking-wider block">
                  1. Probability Distribution (Fixed 0% - 100%)
                </span>
                <span className="text-[11px] text-white/50">
                  <strong className="text-amber-300">Logit</strong> = raw transformer neural score before percentage conversion
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                {result.retainedCount} of 6 active
              </span>
            </div>

            {/* Bars with clear explanation of raw logit scores */}
            <div className="space-y-3 font-mono">
              {result.tokens.map((token) => {
                const percent = token.finalProb * 100;
                const isEligible = token.isEligible;

                return (
                  <div key={token.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-sans font-bold capitalize text-white">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: token.color }} />
                        <span>{token.token}</span>
                        <span
                          className="text-[11px] text-amber-300/80 font-mono font-normal bg-white/5 px-1.5 py-0.2 rounded"
                          title={`Raw Logit: ${token.logit.toFixed(1)}. Scaled logit (logit / T): ${token.scaledLogit.toFixed(2)}. Initial Softmax: ${(token.initialProb * 100).toFixed(1)}%`}
                        >
                          Raw Logit: {token.logit > 0 ? `+${token.logit.toFixed(1)}` : token.logit.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded font-sans ${
                            isEligible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/35'
                          }`}
                        >
                          {isEligible ? 'Active' : 'Excluded'}
                        </span>
                        <span
                          className={`font-bold w-14 text-right ${
                            isEligible ? 'text-white text-xs' : 'text-white/30 line-through text-[11px]'
                          }`}
                        >
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden border border-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${isEligible ? Math.max(percent, 1) : 0}%`,
                          backgroundColor: token.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top-p Cumulative Accumulator Bar */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-sans font-semibold text-white/80">
                Top-p Accumulator Meter:
              </span>
              <span className="font-mono text-cyan-300 text-[11px]">
                {result.topPEnabled && result.topP < 1.0
                  ? `${result.retainedCount} tokens reached ${(result.topPThresholdCrossedAt * 100).toFixed(1)}% (Target: ${(result.topP * 100).toFixed(0)}%)`
                  : 'All tokens admitted (100%)'}
              </span>
            </div>

            <div className="h-3.5 w-full rounded-full bg-black/50 border border-white/15 overflow-hidden flex p-0.5 gap-0.5">
              {result.tokens
                .filter((t) => t.retainedByTopK)
                .sort((a, b) => b.topKProb - a.topKProb)
                .map((token) => {
                  const width = token.topKProb * 100;
                  if (width <= 0) return null;
                  return (
                    <div
                      key={token.id}
                      className={`h-full rounded transition-all duration-500 ${
                        token.isEligible ? 'opacity-100' : 'opacity-20'
                      }`}
                      style={{
                        width: `${width}%`,
                        backgroundColor: token.color,
                      }}
                      title={`${token.token}: ${width.toFixed(1)}% in candidate pool`}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right: Lottery Wheel Simulator & Spin Action */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-black/30 p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div>
                <span className="font-display text-sm font-bold text-white uppercase tracking-wider block">
                  2. Lottery Wheel Simulator
                </span>
                <span className="text-[11px] text-white/50">
                  Slice area corresponds directly to the final percentage chance
                </span>
              </div>
              <button
                type="button"
                onClick={handleRun100Draws}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20 transition-colors shrink-0"
                title="Roll 100 random tokens at once to compare observed outcomes against theoretical odds"
              >
                <BarChart2 size={13} className="text-neon-cyan" />
                Roll 100 Times
              </button>
            </div>

            {/* Wheel SVG */}
            <div className="relative my-2 flex flex-col items-center justify-center select-none">
              {/* Pointer */}
              <div className="absolute top-0 z-20 flex flex-col items-center -translate-y-2 pointer-events-none">
                <div className="h-0 w-0 border-x-7 border-x-transparent border-t-[12px] border-t-white drop-shadow-md" />
                <div className="h-2 w-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00f2ff]" />
              </div>

              <svg
                width={size}
                height={size}
                className="drop-shadow-xl"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 2.2s cubic-bezier(0.12, 0.8, 0.2, 1)' : 'none',
                }}
              >
                <circle cx={center} cy={center} r={radius + 3} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                {slices.map((slice) => {
                  if (slice.sweepAngle >= 359.99) {
                    return <circle key={slice.token.id} cx={center} cy={center} r={radius} fill={slice.token.color} />;
                  }
                  const p1 = getCoordinatesForAngle(slice.startAngle, radius);
                  const p2 = getCoordinatesForAngle(slice.endAngle, radius);
                  const largeArc = slice.sweepAngle > 180 ? 1 : 0;
                  const path = `M ${center} ${center} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
                  const labelCoord = getCoordinatesForAngle(slice.midAngle, radius * 0.65);

                  return (
                    <g key={slice.token.id}>
                      <path d={path} fill={slice.token.color} stroke="#090d16" strokeWidth="1.5" />
                      {slice.sweepAngle > 20 && (
                        <text
                          x={labelCoord.x}
                          y={labelCoord.y}
                          fill="#ffffff"
                          fontSize={slice.sweepAngle > 45 ? '12' : '10'}
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${slice.midAngle + 90}, ${labelCoord.x}, ${labelCoord.y})`}
                          className="drop-shadow capitalize pointer-events-none"
                        >
                          {slice.token.token}
                        </text>
                      )}
                    </g>
                  );
                })}
                <circle cx={center} cy={center} r={16} fill="#090d16" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <circle cx={center} cy={center} r={5} fill="#00f2ff" />
              </svg>
            </div>
          </div>

          {/* Spin Button & Result Display */}
          <div className="mt-3 space-y-2">
            <button
              type="button"
              disabled={isSpinning || eligibleTokens.length === 0}
              onClick={spinWheel}
              className="accent-button w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-cyan via-emerald-400 to-amber-400 py-2.5 text-sm font-bold text-slate-950 shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSpinning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Sampling: Drawing r ~ Uniform(0,1)...
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  🎲 Spin Wheel to Pick Token
                </>
              )}
            </button>

            {/* Explicit Spin Result Output Box */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-white/60">Spin Outcome: </span>
                    {selectedToken ? (
                      <span>
                        <strong className="text-white capitalize">
                          “{selectedToken.token}” ({(selectedToken.finalProb * 100).toFixed(1)}% chance)
                        </strong>
                        <span className="text-neon-cyan font-sans ml-1.5 font-medium">
                          → “The dragon breathed <strong className="capitalize underline">{selectedToken.token}</strong>.”
                        </span>
                      </span>
                    ) : (
                      <span className="text-white/40 italic">Press Spin to draw a random token</span>
                    )}
                  </div>
                </div>
                {selectedToken && (
                  <span
                    className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: selectedToken.color }}
                  />
                )}
              </div>

              {/* Mathematical Algorithm Execution Details */}
              {drawDetails && selectedToken && !isSpinning && (
                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] font-mono text-white/60 flex flex-wrap items-center justify-between gap-1">
                  <span>
                    Algorithm: <strong className="text-amber-300">r = {drawDetails.randomVal.toFixed(4)}</strong> ({drawDetails.randomPercent.toFixed(1)}%)
                  </span>
                  <span>
                    Bracket: [{drawDetails.intervalStart.toFixed(1)}% — {drawDetails.intervalEnd.toFixed(1)}%] → <span className="text-emerald-400 font-bold capitalize">{selectedToken.token}</span>
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-white/50 italic">
              “Wheel visualization represents Inverse Transform Sampling: draws uniform float r in [0, 1) and selects the matching cumulative probability interval.”
            </p>
          </div>
        </div>
      </div>

      {/* 5. Fast Learning Notes (Logit, Temperature Scaling, Softmax & 100% Normalization) */}
      <div className="mb-6 rounded-2xl border border-white/15 bg-black/40 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2.5">
          <BookOpen size={16} className="text-neon-cyan" />
          <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            💡 How the Math Works (Core Concepts Explained)
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs leading-relaxed">
          {/* Card 1: What is a Logit */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-1.5 font-bold text-neon-cyan mb-1 font-sans">
              <span>1. What is a Logit?</span>
            </div>
            <p className="text-white/75 text-[11px]">
              A <strong>logit</strong> is the raw numerical score computed by the transformer network for each candidate token before any probabilities exist (e.g. fire <code className="text-amber-300">+2.0</code>, ice <code className="text-amber-300">-0.5</code>). Higher logit = stronger initial score.
            </p>
          </div>

          {/* Card 2: Where T is Applied & Effect */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-1.5 font-bold text-red-300 mb-1 font-sans">
              <span>2. Temperature Scaling: <code className="font-mono text-[11px]">logit / T</code></span>
            </div>
            <p className="text-white/75 text-[11px]">
              Each logit is divided by <strong>T</strong>. 
              <strong className="text-white"> Low T (&lt;1.0)</strong> stretches score gaps so the top token dominates. 
              <strong className="text-white"> High T (&gt;1.0)</strong> shrinks score gaps toward zero, giving underdog tokens higher chances.
            </p>
          </div>

          {/* Card 3: Softmax Result */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1 font-sans">
              <span>3. Softmax Result</span>
            </div>
            <p className="text-white/75 text-[11px]">
              Softmax applies <code className="font-mono text-[10px] text-amber-200">exp(scaled_logit)</code> and divides by the sum of all exponentials. It converts unbounded logits into positive chances that sum to exactly <strong className="text-white">100%</strong>.
            </p>
          </div>

          {/* Card 4: Normalization After K & P */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 mb-1 font-sans">
              <span>4. Rescaling to 100% (Top-k & Top-p)</span>
            </div>
            <p className="text-white/75 text-[11px]">
              When Top-k or Top-p filters out tokens (giving them <strong className="text-white">0%</strong>), the remaining candidates are <strong>renormalized</strong> (<code className="font-mono text-[10px] text-cyan-200">P / sum(retained)</code>) so the surviving wheel slices add up to <strong className="text-white">100%</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Dynamic Student Insight & Interactive Prediction Challenge */}
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        {/* Dynamic Observation */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-neon-cyan" />
            <h5 className="font-display text-xs font-bold text-white uppercase tracking-wider">
              Live Observation
            </h5>
          </div>
          <p className="text-xs leading-relaxed text-white/80">
            {result.observations[0] || 'Observe how adjusting controls reshapes the lottery wheel slices.'}
          </p>
        </div>

        {/* Prediction Challenge */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-amber-400" />
              <h5 className="font-display text-xs font-bold text-white uppercase tracking-wider">
                Quick Prediction Challenge
              </h5>
            </div>
            <span className="text-[10px] text-white/40">
              Quiz {quizIndex + 1}/{PREDICTION_QUIZZES.length}
            </span>
          </div>

          <p className="text-xs text-white font-semibold mb-2">{currentQuiz.question}</p>

          <div className="grid gap-1.5">
            {currentQuiz.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={quizSubmitted}
                onClick={() => {
                  setSelectedQuizAnswer(opt.id);
                  setQuizSubmitted(true);
                }}
                className={`w-full flex items-center justify-between rounded-lg p-2 text-left text-xs transition-colors ${
                  quizSubmitted
                    ? opt.isCorrect
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-bold'
                      : selectedQuizAnswer === opt.id
                      ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                      : 'bg-white/5 text-white/30'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                }`}
              >
                <span>{opt.text}</span>
                {quizSubmitted && opt.isCorrect && <CheckCircle2 size={14} className="text-emerald-400" />}
                {quizSubmitted && selectedQuizAnswer === opt.id && !opt.isCorrect && (
                  <XCircle size={14} className="text-rose-400" />
                )}
              </button>
            ))}
          </div>

          {quizSubmitted && selectedQuizOpt && (
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-white/70">
              <span>{selectedQuizOpt.feedback}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedQuizAnswer(null);
                  setQuizSubmitted(false);
                  setQuizIndex((prev) => (prev + 1) % PREDICTION_QUIZZES.length);
                }}
                className="text-neon-cyan font-bold hover:underline shrink-0 ml-2"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 7. Clarification Footer */}
      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-white/60">
        <Info size={15} className="text-neon-cyan shrink-0 mt-0.5" />
        <p>
          <strong>Learning note:</strong> This is a simplified simulation using 6 illustrative candidate scores. Real LLMs calculate across thousands of vocabulary tokens. Temperature, top-k, and top-p influence variety; they do not measure truth or correctness.
        </p>
      </div>

      {/* 100 Draws Modal (Simulated Roll 100 Times Experiment) */}
      {showBatchModal && batchResults && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowBatchModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/20 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-neon-cyan" />
                <div>
                  <h4 className="font-display text-base font-bold text-white">100 Simulated Rolls (Monte Carlo Test)</h4>
                  <p className="text-[11px] text-white/50">Comparing observed count vs expected theoretical probability</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="rounded-full bg-white/10 p-1 text-white hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/40 p-3 mb-4 text-xs text-white/70 leading-relaxed">
              <strong>Why roll 100 times?</strong> It demonstrates the Law of Large Numbers. Even if a small slice has only a 10% chance, rolling 100 times will land on it approximately 10 times.
            </div>

            <div className="space-y-2.5 font-mono text-xs mb-5">
              {result.tokens.map((token) => {
                const count = batchResults.counts[token.id] || 0;
                const expected = token.finalProb * 100;
                return (
                  <div key={token.id} className="rounded-xl border border-white/10 bg-black/40 p-2.5">
                    <div className="flex items-center justify-between mb-1 font-sans">
                      <span className="font-bold capitalize text-white flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: token.color }} />
                        {token.token}
                      </span>
                      <div className="text-[11px] font-mono">
                        <strong className="text-neon-cyan">Observed: {count}/100 ({count}%)</strong>
                        <span className="text-white/40 ml-2">Expected: {expected.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${count}%`, backgroundColor: token.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const batch = simulateBatchDraws(result, 100);
                  setBatchResults(batch);
                }}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-all"
              >
                Roll Another 100 Draws
              </button>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="rounded-xl bg-neon-cyan px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-neon-cyan/80 transition-all"
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
