/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlaskConical, ArrowRight, Check, Zap } from 'lucide-react';
import { GUIDED_EXPERIMENTS, GuidedExperiment, SamplingResult } from '../../lib/llmSampling';

interface GuidedExperimentsProps {
  currentResult: SamplingResult;
  onApplyExperiment: (exp: GuidedExperiment) => void;
}

export const GuidedExperiments = ({
  currentResult,
  onApplyExperiment,
}: GuidedExperimentsProps) => {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <FlaskConical size={18} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Guided Learning Experiments</h3>
            <p className="text-xs text-white/60">
              Click any card to instantly load pre-configured high-school lab scenarios
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDED_EXPERIMENTS.map((exp) => {
          // Check if current settings match this experiment
          const isTempMatch = Math.abs(currentResult.temperature - exp.temperature) < 0.02;
          const isTopKMatch =
            (!exp.topKEnabled && !currentResult.topKEnabled) ||
            (exp.topKEnabled && currentResult.topKEnabled && currentResult.topK === exp.topK);
          const isTopPMatch =
            (!exp.topPEnabled && !currentResult.topPEnabled) ||
            (exp.topPEnabled && currentResult.topPEnabled && Math.abs(currentResult.topP - exp.topP) < 0.02);

          const isActive = isTempMatch && isTopKMatch && isTopPMatch;

          return (
            <div
              key={exp.id}
              className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                isActive
                  ? 'border-purple-500 bg-purple-500/15 shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-purple-400'
                  : 'border-white/10 bg-black/30 hover:border-white/25 hover:bg-white/[0.04]'
              }`}
            >
              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
                    {exp.badge}
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Check size={12} /> Active
                    </span>
                  )}
                </div>

                <h4 className="font-display text-base font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                  {exp.title}
                </h4>

                <code className="mb-3 inline-block font-mono text-xs text-neon-cyan bg-white/5 px-2 py-0.5 rounded">
                  {exp.formula}
                </code>

                <p className="mb-3 text-xs leading-relaxed text-white/75">
                  {exp.explanation}
                </p>

                <div className="mb-4 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-[11px] text-white/60">
                  <strong className="text-white/80">Expected:</strong> {exp.expectedOutcome}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onApplyExperiment(exp)}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isActive ? (
                  <>
                    <Zap size={14} /> Currently Applied
                  </>
                ) : (
                  <>
                    Load Scenario <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
