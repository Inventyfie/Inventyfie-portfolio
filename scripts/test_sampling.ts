import { calculateSampling, sampleOneToken, simulateBatchDraws } from '../src/lib/llmSampling';

console.log('=== LLM Sampling Verification Script ===\n');

// 1. Low Temperature (T=0.20, k=6, p=1.00)
const lowTemp = calculateSampling({ temperature: 0.2, topKEnabled: true, topK: 6, topPEnabled: true, topP: 1.0 });
const fireLow = lowTemp.tokens.find((t) => t.id === 'fire')!;
console.log(`1. Low Temperature (T=0.20):`);
console.log(`   Fire probability: ${(fireLow.finalProb * 100).toFixed(2)}% (Target: ~91.8%)\n`);

// 2. High Temperature (T=2.00, k=6, p=1.00)
const highTemp = calculateSampling({ temperature: 2.0, topKEnabled: true, topK: 6, topPEnabled: true, topP: 1.0 });
console.log(`2. High Temperature (T=2.00):`);
console.log(`   Top (fire): ${(highTemp.tokens[0].finalProb * 100).toFixed(2)}% | Bottom (ice): ${(highTemp.tokens[5].finalProb * 100).toFixed(2)}%\n`);

// 3. Top-k Challenge (T=1.00, k=3, p=1.00)
const topK3 = calculateSampling({ temperature: 1.0, topKEnabled: true, topK: 3, topPEnabled: false, topP: 1.0 });
const activeTopK = topK3.tokens.filter((t) => t.isEligible).map((t) => t.token);
console.log(`3. Top-k Challenge (k=3):`);
console.log(`   Retained: ${activeTopK.join(', ')} (Target: fire, smoke, sparks)\n`);

// 4. Top-p Challenge (T=1.00, top-k off, p=0.90)
const topP90 = calculateSampling({ temperature: 1.0, topKEnabled: false, topK: 6, topPEnabled: true, topP: 0.90 });
const activeTopP = topP90.tokens.filter((t) => t.isEligible).map((t) => t.token);
console.log(`4. Top-p Challenge (p=0.90):`);
console.log(`   Retained: ${activeTopP.join(', ')} | Cumulative: ${(topP90.topPThresholdCrossedAt * 100).toFixed(1)}% (Target: ~91.0%)\n`);

// 5. Combined Experiment (T=0.50, k=4, p=0.85)
const combined = calculateSampling({ temperature: 0.5, topKEnabled: true, topK: 4, topPEnabled: true, topP: 0.85 });
const fireComb = combined.tokens.find((t) => t.id === 'fire')!;
const smokeComb = combined.tokens.find((t) => t.id === 'smoke')!;
console.log(`5. Combined Stack (T=0.50, k=4, p=0.85):`);
console.log(`   Fire: ${(fireComb.finalProb * 100).toFixed(2)}% (Target: ~73.11%)`);
console.log(`   Smoke: ${(smokeComb.finalProb * 100).toFixed(2)}% (Target: ~26.89%)\n`);

// 6. Test Draw Simulation
const singleDraw = sampleOneToken(combined);
console.log(`6. Sample Single Draw: "${singleDraw.token.token}" (Random roll: ${singleDraw.randomPercent.toFixed(1)}%)`);

const batch = simulateBatchDraws(combined, 100);
console.log(`7. Batch 100 Draws:`, batch.counts);
