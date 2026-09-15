/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CandidateToken {
  id: string;
  token: string;
  logit: number;
  color: string;
  lightColor: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
}

export const INITIAL_CANDIDATE_TOKENS: CandidateToken[] = [
  {
    id: 'fire',
    token: 'fire',
    logit: 2.0,
    color: '#ef4444', // Red / flame
    lightColor: 'rgba(239, 68, 68, 0.25)',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
    badgeBorder: '#ef4444',
    description: 'The most traditional dragon output in standard fantasy fiction.',
  },
  {
    id: 'smoke',
    token: 'smoke',
    logit: 1.5,
    color: '#f97316', // Orange / heat
    lightColor: 'rgba(249, 115, 22, 0.25)',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    badgeBorder: '#f97316',
    description: 'A very common secondary byproduct accompanying dragon breath.',
  },
  {
    id: 'sparks',
    token: 'sparks',
    logit: 1.0,
    color: '#eab308', // Amber / yellow
    lightColor: 'rgba(234, 179, 8, 0.25)',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    badgeBorder: '#eab308',
    description: 'Crackling embers and fiery particles.',
  },
  {
    id: 'bubbles',
    token: 'bubbles',
    logit: 0.5,
    color: '#06b6d4', // Cyan / aquatic
    lightColor: 'rgba(6, 182, 212, 0.25)',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    badgeBorder: '#06b6d4',
    description: 'Whimsical or aquatic dragon variation.',
  },
  {
    id: 'confetti',
    token: 'confetti',
    logit: 0.0,
    color: '#d946ef', // Fuchsia / party
    lightColor: 'rgba(217, 70, 239, 0.25)',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    badgeBorder: '#d946ef',
    description: 'Playful, unexpected party trick continuation.',
  },
  {
    id: 'ice',
    token: 'ice',
    logit: -0.5,
    color: '#3b82f6', // Blue / frost
    lightColor: 'rgba(59, 130, 246, 0.25)',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    badgeBorder: '#3b82f6',
    description: 'Frost dragon variant, lowest raw logit in this set.',
  },
];

export const PROMPT_CONTEXT = 'The dragon breathed…';

export interface CalculatedTokenState {
  id: string;
  token: string;
  logit: number;
  color: string;
  lightColor: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
  
  // Step 1: Temperature scaling
  scaledLogit: number; // logit / temperature
  
  // Step 2: Softmax
  expValue: number; // exp(scaledLogit - maxScaled)
  initialProb: number; // probability before filtering (0 to 1)
  
  // Step 3 & 4: Top-k filtering & normalization
  topKRank: number; // 1-based rank by initial probability
  retainedByTopK: boolean;
  topKProb: number; // normalized prob within top-k pool
  
  // Step 5 & 6: Top-p filtering & final normalization
  topPRank: number; // 1-based rank in top-p evaluation
  cumulativeTopPProb: number; // cumulative probability in the top-k pool
  isThresholdCrossingToken: boolean; // the token that reached or crossed the p threshold
  retainedByTopP: boolean;
  
  // Final state
  isEligible: boolean; // retainedByTopK && retainedByTopP
  finalProb: number; // final normalized probability (0 to 1)
  status: 'eligible' | 'excluded_top_k' | 'excluded_top_p';
}

export interface SamplingResult {
  temperature: number;
  topKEnabled: boolean;
  topK: number;
  topPEnabled: boolean;
  topP: number;
  
  tokens: CalculatedTokenState[];
  maxScaledLogit: number;
  sumExponentials: number;
  
  retainedCount: number;
  retainedTokens: CalculatedTokenState[];
  excludedTokens: CalculatedTokenState[];
  
  topKThresholdRank: number;
  topPThresholdCrossedAt: number;
  crossingToken: CalculatedTokenState | null;
  dominantToken: CalculatedTokenState;
  
  observations: string[];
}

/**
 * Numerically stable softmax and sequential LLM sampling calculation
 */
export function calculateSampling(params: {
  temperature: number;
  topKEnabled: boolean;
  topK: number;
  topPEnabled: boolean;
  topP: number;
  candidates?: CandidateToken[];
}): SamplingResult {
  const {
    temperature = 1.0,
    topKEnabled = true,
    topK = 6,
    topPEnabled = true,
    topP = 1.0,
    candidates = INITIAL_CANDIDATE_TOKENS,
  } = params;

  // Clamp parameters to safe ranges
  const safeTemp = Math.max(0.01, temperature);
  const safeTopK = Math.max(1, Math.min(candidates.length, Math.round(topK)));
  const safeTopP = Math.max(0.01, Math.min(1.0, topP));

  // Step 1: Scale logits using temperature
  const scaled = candidates.map((c) => ({
    ...c,
    scaledLogit: c.logit / safeTemp,
  }));

  // Step 2: Apply numerically stable softmax
  const maxScaledLogit = Math.max(...scaled.map((s) => s.scaledLogit));
  const exponentials = scaled.map((s) => ({
    ...s,
    expValue: Math.exp(s.scaledLogit - maxScaledLogit),
  }));

  const sumExponentials = exponentials.reduce((sum, item) => sum + item.expValue, 0);

  const withInitialProbs = exponentials.map((item) => ({
    ...item,
    initialProb: sumExponentials > 0 ? item.expValue / sumExponentials : 1 / exponentials.length,
  }));

  // Sort by initial probability descending
  const sortedByProb = [...withInitialProbs].sort((a, b) => b.initialProb - a.initialProb);

  // Step 3: Apply Top-k filtering
  const effectiveK = topKEnabled ? safeTopK : sortedByProb.length;
  const withTopK = sortedByProb.map((token, index) => {
    const topKRank = index + 1;
    const retainedByTopK = topKRank <= effectiveK;
    return {
      ...token,
      topKRank,
      retainedByTopK,
    };
  });

  // Step 4: Normalize the retained top-k probabilities
  const sumTopKRetainedProbs = withTopK
    .filter((t) => t.retainedByTopK)
    .reduce((sum, t) => sum + t.initialProb, 0);

  const withTopKNorm = withTopK.map((token) => ({
    ...token,
    topKProb: token.retainedByTopK && sumTopKRetainedProbs > 0
      ? token.initialProb / sumTopKRetainedProbs
      : 0,
  }));

  // Step 5: Apply Top-p to the retained top-k pool
  // Filter top-k retained tokens, they are already sorted descending
  const retainedTopKTokens = withTopKNorm.filter((t) => t.retainedByTopK);

  let cumulativeSum = 0;
  let thresholdCrossed = false;
  let crossingToken: CalculatedTokenState | null = null;
  const topPDecisionMap = new Map<string, { retainedByTopP: boolean; cumulative: number; isCrossing: boolean; topPRank: number }>();

  retainedTopKTokens.forEach((token, index) => {
    const topPRank = index + 1;
    const prevCumulative = cumulativeSum;
    cumulativeSum += token.topKProb;

    let isRetained = true;
    let isCrossing = false;

    if (topPEnabled) {
      if (topPRank === 1) {
        // Always retain at least one token
        isRetained = true;
        if (cumulativeSum >= safeTopP - 1e-9) {
          thresholdCrossed = true;
          isCrossing = true;
        }
      } else if (!thresholdCrossed) {
        isRetained = true;
        if (cumulativeSum >= safeTopP - 1e-9) {
          thresholdCrossed = true;
          isCrossing = true;
        }
      } else {
        isRetained = false;
      }
    } else {
      isRetained = true;
    }

    if (isCrossing && !crossingToken) {
      // Record the crossing token
      isCrossing = true;
    }

    topPDecisionMap.set(token.id, {
      retainedByTopP: isRetained,
      cumulative: cumulativeSum,
      isCrossing,
      topPRank,
    });
  });

  // Step 6: Final combined calculation & normalization
  const intermediateTokens = withTopKNorm.map((token) => {
    if (!token.retainedByTopK) {
      return {
        ...token,
        topPRank: 0,
        cumulativeTopPProb: 0,
        isThresholdCrossingToken: false,
        retainedByTopP: false,
        isEligible: false,
        status: 'excluded_top_k' as const,
      };
    }

    const decision = topPDecisionMap.get(token.id)!;
    const isEligible = token.retainedByTopK && decision.retainedByTopP;
    const status: 'eligible' | 'excluded_top_k' | 'excluded_top_p' = isEligible
      ? 'eligible'
      : 'excluded_top_p';

    return {
      ...token,
      topPRank: decision.topPRank,
      cumulativeTopPProb: decision.cumulative,
      isThresholdCrossingToken: decision.isCrossing,
      retainedByTopP: decision.retainedByTopP,
      isEligible,
      status,
    };
  });

  // Final normalization of all eligible tokens
  const eligibleTokens = intermediateTokens.filter((t) => t.isEligible);
  const sumEligibleTopKProbs = eligibleTokens.reduce((sum, t) => sum + t.topKProb, 0);

  const finalTokens: CalculatedTokenState[] = intermediateTokens.map((token) => {
    let finalProb = 0;
    if (token.isEligible && sumEligibleTopKProbs > 0) {
      finalProb = token.topKProb / sumEligibleTopKProbs;
    }

    return {
      ...token,
      finalProb,
    };
  });

  // Re-sort tokens in standard display order (matching original candidate order or prob order)
  const idOrderMap = new Map(candidates.map((c, i) => [c.id, i]));
  const orderedFinalTokens = [...finalTokens].sort(
    (a, b) => (idOrderMap.get(a.id) ?? 0) - (idOrderMap.get(b.id) ?? 0),
  );

  // Find crossing token if any
  const foundCrossing = orderedFinalTokens.find((t) => t.isThresholdCrossingToken) || null;

  const retained = orderedFinalTokens.filter((t) => t.isEligible);
  const excluded = orderedFinalTokens.filter((t) => !t.isEligible);
  const dominant = [...retained].sort((a, b) => b.finalProb - a.finalProb)[0] || orderedFinalTokens[0];

  // Dynamic observations for students
  const observations: string[] = [];

  if (safeTemp < 0.35) {
    observations.push(
      `Very low temperature (T=${safeTemp.toFixed(2)}) amplified score differences, making "${dominant.token}" strongly dominant at ${(dominant.finalProb * 100).toFixed(1)}%.`,
    );
  } else if (safeTemp > 1.5) {
    observations.push(
      `High temperature (T=${safeTemp.toFixed(2)}) flattened the distribution, giving lower-scoring candidates significantly higher chances.`,
    );
  } else {
    observations.push(
      `Moderate temperature (T=${safeTemp.toFixed(2)}) preserves relative likelihoods with natural variety.`,
    );
  }

  if (topKEnabled && safeTopK < candidates.length) {
    const excludedByKCount = candidates.length - safeTopK;
    observations.push(
      `Top-k (k=${safeTopK}) strictly eliminated the bottom ${excludedByKCount} candidate${excludedByKCount > 1 ? 's' : ''} from consideration.`,
    );
  }

  if (topPEnabled && safeTopP < 1.0) {
    if (foundCrossing) {
      observations.push(
        `Top-p target (${(safeTopP * 100).toFixed(0)}%) needed ${retained.length} token${retained.length > 1 ? 's' : ''} to reach ${(foundCrossing.cumulativeTopPProb * 100).toFixed(1)}% cumulative probability (crossed by "${foundCrossing.token}").`,
      );
    }
  }

  if (retained.length === 1) {
    observations.push(
      `Only one candidate ("${dominant.token}") remains in the pool. The next token selection is 100% deterministic!`,
    );
  }

  const crossingCumul = foundCrossing ? foundCrossing.cumulativeTopPProb : 1.0;

  return {
    temperature: safeTemp,
    topKEnabled,
    topK: safeTopK,
    topPEnabled,
    topP: safeTopP,
    tokens: orderedFinalTokens,
    maxScaledLogit,
    sumExponentials,
    retainedCount: retained.length,
    retainedTokens: retained,
    excludedTokens: excluded,
    topKThresholdRank: effectiveK,
    topPThresholdCrossedAt: crossingCumul,
    crossingToken: foundCrossing,
    dominantToken: dominant,
    observations,
  };
}

/**
 * Weighted random sample a single token according to final probabilities
 */
export function sampleOneToken(result: SamplingResult, randomValue?: number): {
  token: CalculatedTokenState;
  randomPercent: number;
} {
  const eligible = result.tokens.filter((t) => t.isEligible && t.finalProb > 0);
  if (eligible.length === 0) {
    return { token: result.tokens[0], randomPercent: 0 };
  }

  // Sort eligible descending by final probability for stable sampling
  const sortedEligible = [...eligible].sort((a, b) => b.finalProb - a.finalProb);
  const r = typeof randomValue === 'number' ? randomValue : Math.random();

  let cumulative = 0;
  for (const token of sortedEligible) {
    cumulative += token.finalProb;
    if (r <= cumulative || token === sortedEligible[sortedEligible.length - 1]) {
      return {
        token,
        randomPercent: r * 100,
      };
    }
  }

  return { token: sortedEligible[0], randomPercent: r * 100 };
}

/**
 * Perform N draws to demonstrate empirical frequency vs theoretical probability
 */
export function simulateBatchDraws(
  result: SamplingResult,
  drawsCount = 100,
): {
  counts: Record<string, number>;
  frequencies: Record<string, number>;
  totalDraws: number;
} {
  const counts: Record<string, number> = {};
  INITIAL_CANDIDATE_TOKENS.forEach((c) => {
    counts[c.id] = 0;
  });

  const eligible = result.tokens.filter((t) => t.isEligible && t.finalProb > 0);
  if (eligible.length === 0) {
    return { counts, frequencies: {}, totalDraws: drawsCount };
  }

  const sortedEligible = [...eligible].sort((a, b) => b.finalProb - a.finalProb);

  for (let i = 0; i < drawsCount; i++) {
    const r = Math.random();
    let cumulative = 0;
    let pickedId = sortedEligible[0].id;
    for (const t of sortedEligible) {
      cumulative += t.finalProb;
      if (r <= cumulative || t === sortedEligible[sortedEligible.length - 1]) {
        pickedId = t.id;
        break;
      }
    }
    counts[pickedId] = (counts[pickedId] || 0) + 1;
  }

  const frequencies: Record<string, number> = {};
  Object.keys(counts).forEach((id) => {
    frequencies[id] = (counts[id] / drawsCount) * 100;
  });

  return {
    counts,
    frequencies,
    totalDraws: drawsCount,
  };
}

export interface GuidedExperiment {
  id: string;
  badge: string;
  title: string;
  formula: string;
  temperature: number;
  topKEnabled: boolean;
  topK: number;
  topPEnabled: boolean;
  topP: number;
  explanation: string;
  expectedOutcome: string;
}

export const GUIDED_EXPERIMENTS: GuidedExperiment[] = [
  {
    id: 'low-temperature',
    badge: 'Low Temperature',
    title: 'Laser Focus (T = 0.20)',
    formula: 'T = 0.20, k = 6, p = 1.00',
    temperature: 0.2,
    topKEnabled: true,
    topK: 6,
    topPEnabled: true,
    topP: 1.0,
    explanation:
      'Dividing by a small number (0.2) drastically inflates the difference between logits. Exponentiation makes "fire" overwhelmingly likely (~91.8%), making the model nearly deterministic.',
    expectedOutcome: 'Fire receives ~91.8% of the probability wheel. Other candidates virtually vanish.',
  },
  {
    id: 'high-temperature',
    badge: 'High Temperature',
    title: 'Creative Chaos (T = 2.00)',
    formula: 'T = 2.00, k = 6, p = 1.00',
    temperature: 2.0,
    topKEnabled: true,
    topK: 6,
    topPEnabled: true,
    topP: 1.0,
    explanation:
      'Dividing by a large number (2.0) shrinks the logit gaps toward zero. The softmax curve flattens out, giving rare candidates like confetti and ice meaningful chances.',
    expectedOutcome: 'A flat, competitive distribution where underdog tokens can easily win the lottery.',
  },
  {
    id: 'top-k-challenge',
    badge: 'Top-k Filtering',
    title: 'The Top-3 Podium (k = 3)',
    formula: 'T = 1.00, k = 3, p = 1.00',
    temperature: 1.0,
    topKEnabled: true,
    topK: 3,
    topPEnabled: false,
    topP: 1.0,
    explanation:
      'Top-k strictly retains only the top 3 scoring candidates: fire, smoke, and sparks. The bottom 3 (bubbles, confetti, ice) are immediately cut from the lottery and their slices redistributed.',
    expectedOutcome: 'Only fire, smoke, and sparks remain in the lottery wheel, normalized to 100%.',
  },
  {
    id: 'top-p-challenge',
    badge: 'Top-p Nucleus',
    title: 'Dynamic Threshold (p = 0.90)',
    formula: 'T = 1.00, top-k off, p = 0.90',
    temperature: 1.0,
    topKEnabled: false,
    topK: 6,
    topPEnabled: true,
    topP: 0.9,
    explanation:
      'Top-p accumulates candidate probabilities in descending order: fire (41.4%) + smoke (25.1%) + sparks (15.2%) = 81.8% (<90%). Adding bubbles (+9.2%) reaches 91.0%, satisfying the 90% target. Confetti and ice are excluded.',
    expectedOutcome: 'Fire, smoke, sparks, and bubbles are kept, covering 91.0% cumulative probability.',
  },
  {
    id: 'combined-experiment',
    badge: 'Real-World Stack',
    title: 'Combined Pipeline (T=0.5, k=4, p=0.85)',
    formula: 'T = 0.50, k = 4, p = 0.85',
    temperature: 0.5,
    topKEnabled: true,
    topK: 4,
    topPEnabled: true,
    topP: 0.85,
    explanation:
      'First, T=0.5 sharpens logits. Next, k=4 trims the pool to 4 candidates. Then, p=0.85 evaluates the normalized top-4: fire (64.39%) + smoke (23.69%) = 88.08% (>= 85%). Threshold is crossed, excluding sparks and bubbles!',
    expectedOutcome: 'Final pool contains only Fire (~73.11%) and Smoke (~26.89%).',
  },
];

export interface PredictionQuiz {
  id: string;
  question: string;
  contextHint: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
  applyPreset: {
    temperature: number;
    topKEnabled: boolean;
    topK: number;
    topPEnabled: boolean;
    topP: number;
  };
}

export const PREDICTION_QUIZZES: PredictionQuiz[] = [
  {
    id: 'quiz-temp-drop',
    question: 'If we lower the Temperature from 1.0 to 0.2, will the tallest bar (fire) grow or shrink?',
    contextHint: 'Think about how dividing logits by 0.2 changes the ratio before exponentiation.',
    options: [
      {
        id: 'grow',
        text: 'Grow much taller & become more dominant',
        isCorrect: true,
        feedback: 'Correct! Lowering temperature amplifies differences, sending the top token towards 90%+ probability.',
      },
      {
        id: 'shrink',
        text: 'Shrink down to match the shorter bars',
        isCorrect: false,
        feedback: 'Not quite. Shrinking happens when temperature is increased, flattening the differences.',
      },
      {
        id: 'same',
        text: 'Stay exactly the same height',
        isCorrect: false,
        feedback: 'Incorrect. Temperature directly scales logits and changes probability percentages.',
      },
    ],
    applyPreset: {
      temperature: 0.2,
      topKEnabled: true,
      topK: 6,
      topPEnabled: false,
      topP: 1.0,
    },
  },
  {
    id: 'quiz-topk-sparks',
    question: 'If Top-k is set to k = 2, can "sparks" (rank #3) ever be selected on the wheel?',
    contextHint: 'Top-k is a strict filter applied before token selection.',
    options: [
      {
        id: 'no',
        text: 'No, it is strictly excluded (0% chance)',
        isCorrect: true,
        feedback: 'Spot on! Top-k is a hard cutoff. Only the top 2 (fire and smoke) survive into the lottery.',
      },
      {
        id: 'yes-rare',
        text: 'Yes, if the wheel spins fast enough',
        isCorrect: false,
        feedback: 'No. Once excluded by Top-k, its final probability is set to exactly 0%.',
      },
      {
        id: 'yes-luck',
        text: 'Yes, because its original logit was positive',
        isCorrect: false,
        feedback: 'No. Even with a positive logit, being outside rank 2 means 100% elimination.',
      },
    ],
    applyPreset: {
      temperature: 1.0,
      topKEnabled: true,
      topK: 2,
      topPEnabled: false,
      topP: 1.0,
    },
  },
  {
    id: 'quiz-topp-overshoot',
    question: 'Why does Top-p with p = 0.90 often retain 91.0% instead of exactly 90.0%?',
    contextHint: 'Can a language model keep half of a word token?',
    options: [
      {
        id: 'indivisible',
        text: 'Tokens are indivisible — the crossing token is added in full',
        isCorrect: true,
        feedback: 'Exactly right! We cannot partially include half of a token; the whole candidate must be admitted.',
      },
      {
        id: 'bug',
        text: 'It is a mathematical precision or rounding bug',
        isCorrect: false,
        feedback: 'No, it is by design. The algorithm keeps adding full tokens until the target is reached or surpassed.',
      },
      {
        id: 'bonus',
        text: 'The model gives a 1% safety buffer to top tokens',
        isCorrect: false,
        feedback: 'No safety buffer is used. The cumulative sum simply steps up discrete token percentages.',
      },
    ],
    applyPreset: {
      temperature: 1.0,
      topKEnabled: false,
      topK: 6,
      topPEnabled: true,
      topP: 0.9,
    },
  },
];
