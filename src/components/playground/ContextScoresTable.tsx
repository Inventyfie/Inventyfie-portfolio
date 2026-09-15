/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Info, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { SamplingResult, PROMPT_CONTEXT } from '../../lib/llmSampling';

interface ContextScoresTableProps {
  result: SamplingResult;
}

export const ContextScoresTable = ({ result }: ContextScoresTableProps) => {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md">
      {/* Prompt Context Box */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-neon-cyan" />
            <span className="text-xs uppercase tracking-[0.16em] text-neon-cyan font-bold">
              Prompt Context
            </span>
          </div>
          <span className="text-xs text-white/50">Next token prediction task</span>
        </div>
        <p className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
          “{PROMPT_CONTEXT}” <span className="inline-block h-6 w-2.5 translate-y-1 bg-neon-cyan animate-pulse" />
        </p>
      </div>

      {/* Table Header / Summary */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold text-white">Token Candidates & Score Breakdown</h3>
          <p className="text-xs text-white/60">
            Compare original transformer logits, temperature scaling, initial softmax, and final pool chances
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-400 font-semibold">
            {result.retainedCount} of 6 eligible
          </span>
        </div>
      </div>

      {/* Scores Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead className="border-b border-white/10 bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3 font-semibold">Candidate Token</th>
              <th className="px-4 py-3 font-semibold text-right">Original Logit</th>
              <th className="px-4 py-3 font-semibold text-right">Scaled Logit (l/T)</th>
              <th className="px-4 py-3 font-semibold text-right">Softmax (Before)</th>
              <th className="px-4 py-3 font-semibold text-center">Eligibility</th>
              <th className="px-4 py-3 font-semibold text-right">Final Probability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {result.tokens.map((token) => {
              const isEligible = token.isEligible;
              const isExcludedByK = token.status === 'excluded_top_k';
              const isExcludedByP = token.status === 'excluded_top_p';

              return (
                <tr
                  key={token.id}
                  className={`transition-colors ${
                    isEligible
                      ? 'bg-white/[0.02] hover:bg-white/[0.06] text-white'
                      : 'bg-black/40 text-white/35 opacity-60'
                  }`}
                >
                  {/* Token & Color Pill */}
                  <td className="px-4 py-3 font-sans font-medium">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 rounded-md shadow-sm shrink-0"
                        style={{ backgroundColor: token.color }}
                      />
                      <span className="font-display text-sm font-bold capitalize">
                        {token.token}
                      </span>
                    </div>
                  </td>

                  {/* Original Logit */}
                  <td className="px-4 py-3 text-right">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-white/90">
                      {token.logit > 0 ? `+${token.logit.toFixed(1)}` : token.logit.toFixed(1)}
                    </span>
                  </td>

                  {/* Scaled Logit */}
                  <td className="px-4 py-3 text-right text-amber-300/90">
                    {token.scaledLogit > 0
                      ? `+${token.scaledLogit.toFixed(2)}`
                      : token.scaledLogit.toFixed(2)}
                  </td>

                  {/* Softmax Prob (Before) */}
                  <td className="px-4 py-3 text-right text-white/80">
                    {(token.initialProb * 100).toFixed(2)}%
                  </td>

                  {/* Eligibility Status */}
                  <td className="px-4 py-3 text-center">
                    {isEligible ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-sans font-semibold text-emerald-400">
                        <CheckCircle size={12} /> Eligible
                      </span>
                    ) : isExcludedByK ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-sans font-semibold text-amber-400">
                        <XCircle size={12} /> Excluded (Top-k)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-sans font-semibold text-rose-400">
                        <XCircle size={12} /> Excluded (Top-p)
                      </span>
                    )}
                  </td>

                  {/* Final Probability */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-bold ${
                        isEligible
                          ? 'text-neon-cyan bg-neon-cyan/10 px-2.5 py-1 rounded-md text-sm'
                          : 'text-white/20'
                      }`}
                    >
                      {(token.finalProb * 100).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Educational Note */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/70">
        <Info size={16} className="mt-0.5 shrink-0 text-neon-cyan" />
        <p>
          <strong>Educational note:</strong> These logit scores are illustrative examples invented for high-school learning. They do not represent the private weights or vocabulary architecture of any commercial AI vendor.
        </p>
      </div>
    </div>
  );
};
