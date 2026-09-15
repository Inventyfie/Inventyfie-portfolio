/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Sliders, FlaskConical, HelpCircle, Layers, AlertCircle } from 'lucide-react';
import {
  calculateSampling,
  GuidedExperiment,
  PredictionQuiz,
  SamplingResult,
} from '../../lib/llmSampling';
import { SamplingControls } from './SamplingControls';
import { PipelineStepper } from './PipelineStepper';
import { ContextScoresTable } from './ContextScoresTable';
import { ProbabilityBars } from './ProbabilityBars';
import { ProbabilityLotteryWheel } from './ProbabilityLotteryWheel';
import { TopPCumulativeMeter } from './TopPCumulativeMeter';
import { GuidedExperiments } from './GuidedExperiments';
import { StudentFeedbackCard } from './StudentFeedbackCard';

interface SamplingPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'studio' | 'pipeline' | 'experiments' | 'quiz';

export const SamplingPlaygroundModal = ({
  isOpen,
  onClose,
}: SamplingPlaygroundModalProps) => {
  // Playground state
  const [temperature, setTemperature] = useState(1.0);
  const [topKEnabled, setTopKEnabled] = useState(true);
  const [topK, setTopK] = useState(6);
  const [topPEnabled, setTopPEnabled] = useState(true);
  const [topP, setTopP] = useState(1.0);
  const [activeControl, setActiveControl] = useState<'temp' | 'topK' | 'topP' | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('studio');

  // Handle Escape key to close playground without disrupting the article behind it
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // prevent closing underlying article
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  // Calculate sampling result memoized
  const samplingResult: SamplingResult = useMemo(() => {
    return calculateSampling({
      temperature,
      topKEnabled,
      topK,
      topPEnabled,
      topP,
    });
  }, [temperature, topKEnabled, topK, topPEnabled, topP]);

  const handleReset = () => {
    setTemperature(1.0);
    setTopKEnabled(true);
    setTopK(6);
    setTopPEnabled(true);
    setTopP(1.0);
    setActiveControl(null);
  };

  const handleApplyExperiment = (exp: GuidedExperiment) => {
    setTemperature(exp.temperature);
    setTopKEnabled(exp.topKEnabled);
    setTopK(exp.topK);
    setTopPEnabled(exp.topPEnabled);
    setTopP(exp.topP);
    setActiveControl('temp');
    setActiveTab('studio');
  };

  const handleApplyQuizPreset = (preset: PredictionQuiz['applyPreset']) => {
    setTemperature(preset.temperature);
    setTopKEnabled(preset.topKEnabled);
    setTopK(preset.topK);
    setTopPEnabled(preset.topPEnabled);
    setTopP(preset.topP);
    setActiveControl('temp');
    setActiveTab('studio');
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/85 p-2 sm:p-4 md:p-6 backdrop-blur-lg flex items-center justify-center animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Interactive LLM Sampling Playground"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col h-full max-h-[96vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-white/20 bg-slate-950/98 shadow-[0_0_80px_rgba(0,242,255,0.15)] text-white">
        {/* Sticky Top Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/15 bg-slate-950/90 px-4 py-3.5 sm:px-6 md:py-4 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/30 border border-neon-cyan/40 text-neon-cyan shadow-[0_0_20px_rgba(0,242,255,0.25)]">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-neon-cyan/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-neon-cyan">
                  Interactive Lab
                </span>
                <span className="hidden sm:inline text-xs text-white/50">
                  How AI Chooses Its Next Word
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold leading-tight text-white">
                Temperature, Top-k & Top-p Playground
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white"
              aria-label="Close interactive playground"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Tab Navigation Bar */}
        <div className="flex shrink-0 overflow-x-auto border-b border-white/10 bg-black/40 px-4 sm:px-6 py-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold transition-all ${
              activeTab === 'studio'
                ? 'bg-neon-cyan text-slate-950 shadow-md font-bold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sliders size={15} /> All-in-One Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold transition-all ${
              activeTab === 'pipeline'
                ? 'bg-neon-cyan text-slate-950 shadow-md font-bold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Layers size={15} /> Step-by-Step Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('experiments')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold transition-all ${
              activeTab === 'experiments'
                ? 'bg-purple-500 text-white shadow-md font-bold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FlaskConical size={15} /> Guided Scenarios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold transition-all ${
              activeTab === 'quiz'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HelpCircle size={15} /> Prediction Challenges
          </button>
        </div>

        {/* Scrollable Playground Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {/* Always Visible Core Sliders */}
          <section aria-label="Sampling Controls">
            <SamplingControls
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
              onReset={handleReset}
              activeControl={activeControl}
              setActiveControl={setActiveControl}
            />
          </section>

          {/* Conditional / Tabbed Content */}
          {activeTab === 'studio' && (
            <>
              {/* 1. Animated Processing Pipeline */}
              <section aria-label="Processing Pipeline">
                <PipelineStepper
                  result={samplingResult}
                  activeControl={activeControl}
                  onSampleToken={() => {}}
                />
              </section>

              {/* 2. Visualizations Grid: Probability Bars + Lottery Wheel */}
              <section aria-label="Dynamic Visualizations" className="grid gap-6 lg:grid-cols-2">
                <ProbabilityBars result={samplingResult} />
                <ProbabilityLotteryWheel result={samplingResult} />
              </section>

              {/* 3. Top-p Cumulative Meter */}
              <section aria-label="Top-p Cumulative Meter">
                <TopPCumulativeMeter result={samplingResult} />
              </section>

              {/* 4. Token Context & Scores Matrix */}
              <section aria-label="Token Scores Table">
                <ContextScoresTable result={samplingResult} />
              </section>

              {/* 5. Live Student Observations & Prediction Quiz */}
              <section aria-label="Student Insights & Challenges">
                <StudentFeedbackCard
                  result={samplingResult}
                  onApplyQuizPreset={handleApplyQuizPreset}
                />
              </section>

              {/* 6. Quick Access to Guided Experiments */}
              <section aria-label="Guided Experiments">
                <GuidedExperiments
                  currentResult={samplingResult}
                  onApplyExperiment={handleApplyExperiment}
                />
              </section>
            </>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              <PipelineStepper
                result={samplingResult}
                activeControl={activeControl}
                onSampleToken={() => {}}
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <ProbabilityBars result={samplingResult} />
                <TopPCumulativeMeter result={samplingResult} />
              </div>
              <ContextScoresTable result={samplingResult} />
            </div>
          )}

          {activeTab === 'experiments' && (
            <div className="space-y-6">
              <GuidedExperiments
                currentResult={samplingResult}
                onApplyExperiment={handleApplyExperiment}
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <ProbabilityBars result={samplingResult} />
                <ProbabilityLotteryWheel result={samplingResult} />
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-6">
              <StudentFeedbackCard
                result={samplingResult}
                onApplyQuizPreset={handleApplyQuizPreset}
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <ProbabilityBars result={samplingResult} />
                <TopPCumulativeMeter result={samplingResult} />
              </div>
            </div>
          )}

          {/* Important Clarification Note */}
          <footer className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 text-xs leading-relaxed text-white/70">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-neon-cyan" />
              <div>
                <p className="font-semibold text-white mb-1">Important Clarification for Learners</p>
                <p>
                  This is a simplified learning simulation using invented scores. Real LLMs use much larger vocabularies, and available controls and their processing order can vary between implementations. Temperature, top-k and top-p influence token selection; they do not measure truth or guarantee factual answers.
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>,
    document.body,
  );
};
