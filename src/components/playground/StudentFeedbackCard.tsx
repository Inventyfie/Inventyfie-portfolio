/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, Sparkles, Lightbulb, Play, ArrowRight } from 'lucide-react';
import { PREDICTION_QUIZZES, PredictionQuiz, SamplingResult } from '../../lib/llmSampling';

interface StudentFeedbackCardProps {
  result: SamplingResult;
  onApplyQuizPreset: (preset: PredictionQuiz['applyPreset']) => void;
}

export const StudentFeedbackCard = ({
  result,
  onApplyQuizPreset,
}: StudentFeedbackCardProps) => {
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const quiz = PREDICTION_QUIZZES[activeQuizIndex];
  const selectedOption = quiz.options.find((o) => o.id === selectedOptionId);

  const handleSelectOption = (optId: string) => {
    setSelectedOptionId(optId);
    setHasSubmitted(true);
  };

  const handleNextQuiz = () => {
    setSelectedOptionId(null);
    setHasSubmitted(false);
    setActiveQuizIndex((prev) => (prev + 1) % PREDICTION_QUIZZES.length);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 1. Dynamic Observation Feed */}
      <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Lightbulb size={16} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-white">Live Student Insights</h3>
              <p className="text-xs text-white/60">Automated deductions based on your current settings</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {result.observations.map((obs, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-white/85"
              >
                <Sparkles size={15} className="text-neon-cyan mt-0.5 shrink-0" />
                <span>{obs}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <strong>Key takeaway:</strong> Temperature controls <em>confidence</em>, Top-k controls <em>headcount</em>, and Top-p controls <em>coverage</em>.
        </div>
      </div>

      {/* 2. Interactive Prediction Challenge */}
      <div className="rounded-3xl border border-white/15 bg-white/5 p-5 md:p-6 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <HelpCircle size={16} />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-white">Prediction Challenge</h3>
                <p className="text-xs text-white/60">Test your mental model before running the math</p>
              </div>
            </div>

            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-white/70">
              Quiz {activeQuizIndex + 1} of {PREDICTION_QUIZZES.length}
            </span>
          </div>

          <div className="mb-4">
            <p className="font-display text-sm sm:text-base font-bold text-white mb-1">
              {quiz.question}
            </p>
            <p className="text-xs text-white/60 italic">{quiz.contextHint}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {quiz.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let btnStyle = 'border-white/10 bg-black/30 hover:border-white/20 text-white/80';

              if (hasSubmitted) {
                if (opt.isCorrect) {
                  btnStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold';
                } else if (isSelected && !opt.isCorrect) {
                  btnStyle = 'border-rose-500 bg-rose-500/20 text-rose-200';
                } else {
                  btnStyle = 'border-white/5 bg-black/20 text-white/30 opacity-50';
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={hasSubmitted}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${btnStyle}`}
                >
                  <span>{opt.text}</span>
                  {hasSubmitted && opt.isCorrect && (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  )}
                  {hasSubmitted && isSelected && !opt.isCorrect && (
                    <XCircle size={16} className="text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Action */}
          {hasSubmitted && selectedOption && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3 animate-in fade-in">
              <p className="text-xs leading-relaxed text-white/90">
                {selectedOption.feedback}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onApplyQuizPreset(quiz.applyPreset)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neon-cyan px-3 py-1.5 text-xs font-bold text-slate-950 transition-all hover:bg-neon-cyan/80"
                >
                  <Play size={12} fill="currentColor" /> Apply & See Live on Sliders
                </button>
                <button
                  type="button"
                  onClick={handleNextQuiz}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Next Question <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
