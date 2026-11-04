// Mathematical and statistical calculation engine for Traditional RSN
// Based strictly on Figueroa et al. (1981), Reyes-Lagunes (1993), and Valdez Medina (2005)

import {
  StimulusResponse,
  NormalizationRule,
  DefinidoraStats,
  TraditionalRSNResults,
  WeightingMethod,
} from '../../types';

/**
 * Normalizes a word string safely according to the two-tier normalization architecture.
 * Tier 1: Canonical whitespace trimming, single spacing, lowercase unicode conversion.
 * Tier 2: Lookup against project-level normalization dictionary rules (if active).
 */
export function normalizeWord(
  rawWord: string,
  rules: NormalizationRule[] = [],
  applyRules: boolean = true,
  canonicalWord?: string
): string {
  if (!rawWord) return '';

  // Tier 0: Direct manual correction override if active
  if (applyRules && canonicalWord && canonicalWord.trim().length > 0) {
    return canonicalWord.trim().replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase('es');
  }

  // Tier 1: Technical safe normalization
  let cleaned = rawWord
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLocaleLowerCase('es');

  // Tier 2: Semantic dictionary substitution
  if (applyRules && rules.length > 0) {
    const ruleMap = new Map<string, string>();
    for (const r of rules) {
      if (r.active) {
        ruleMap.set(
          r.rawForm.trim().replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase('es'),
          r.canonicalForm.trim().replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase('es')
        );
      }
    }
    if (ruleMap.has(cleaned)) {
      cleaned = ruleMap.get(cleaned)!;
    }
  }

  return cleaned;
}

/**
 * Computes Valor J (Tamaño de la Red - TR)
 * Total count of unique definidoras generated for the stimulus.
 * Formula: J = |V| (Figueroa et al., 1981; Reyes Lagunes, 1993; Valdez Medina, 2005)
 */
export function calculateValorJ(uniqueWords: Set<string> | string[]): number {
  if (Array.isArray(uniqueWords)) {
    return new Set(uniqueWords).size;
  }
  return uniqueWords.size;
}

/**
 * Computes the Weight (Valor Semántico - VS) for a given rank position r.
 * Canonical scheme (default): VS(r) = 11 - r (Reyes Lagunes, 1993; Valdez Medina, 2005).
 * Proportional scheme: VS(r, m) = ((m + 1 - r) / m) * 10
 */
export function getWeightForRank(
  rank: number,
  wordCountForSubject: number,
  method: WeightingMethod = 'canonical',
  maxK: number = 10
): number {
  if (rank < 1) return 0;
  if (method === 'proportional') {
    if (wordCountForSubject <= 0) return 0;
    return ((wordCountForSubject + 1 - rank) / wordCountForSubject) * 10;
  }
  // Canonical scheme
  const weight = maxK + 1 - rank;
  return weight > 0 ? weight : 0;
}

/**
 * Computes Scree Test / Elbow point for Núcleo de la Red (Cattell, 1952; Reyes Lagunes, 1993).
 * Uses maximum orthogonal distance to secant line (Kneedle algorithm) on discrete descending M values.
 */
export function calculateScreeCutoffIndex(sortedMValues: number[]): number {
  const J = sortedMValues.length;
  if (J <= 2) return J;

  const firstM = sortedMValues[0];
  const lastM = sortedMValues[J - 1];

  // If all M values are identical, all belong to the core
  if (firstM === lastM) return J;

  // Calculate successive drops: deltaM[i] = M[i] - M[i+1]
  const deltas: number[] = [];
  for (let i = 0; i < J - 1; i++) {
    deltas.push(sortedMValues[i] - sortedMValues[i + 1]);
  }

  // Look for the largest single drop or the elbow where slope flattens
  // If there is an abrupt drop at step i (e.g. from M[1] to M[2]), the core is before the drop
  let maxDropIdx = 0;
  let maxDrop = -1;

  for (let i = 0; i < deltas.length; i++) {
    if (deltas[i] > maxDrop) {
      maxDrop = deltas[i];
      maxDropIdx = i; // 0-based index of the element before the drop
    }
  }

  // Check if this drop is significantly larger than the subsequent tail slope
  const tailDeltas = deltas.slice(maxDropIdx + 1);
  const avgTailSlope = tailDeltas.length > 0 
    ? tailDeltas.reduce((a, b) => a + b, 0) / tailDeltas.length 
    : 0;

  if (maxDrop > 2 * avgTailSlope && maxDrop > 0.15 * firstM) {
    // Cut right before the drop, i.e., elements 0..maxDropIdx
    return maxDropIdx + 1;
  }

  // Fallback: Perpendicular distance to secant line (Kneedle)
  let maxDistance = -1;
  let cutoffIndex = 1;
  const deltaX = J - 1;
  const deltaY = lastM - firstM;
  const denom = Math.sqrt(deltaY * deltaY + deltaX * deltaX);

  for (let i = 0; i < J; i++) {
    const x = i + 1;
    const y = sortedMValues[i];
    const dist = Math.abs(deltaY * x - deltaX * y + J * firstM - lastM) / denom;
    if (dist > maxDistance) {
      maxDistance = dist;
      cutoffIndex = i + 1;
    }
  }

  return Math.max(1, Math.min(J, cutoffIndex));
}

/**
 * Computes Valor G (Figueroa et al., 1981b; Valdez Medina, 2005, p. 78)
 * Average difference between consecutive descending M values in SAM.
 * Telescoping sum formula: G = (M_1 - M_k) / (k - 1)
 */
export function calculateValorG(samMValues: number[]): number {
  if (!samMValues || samMValues.length <= 1) return 0;
  const k = samMValues.length;
  const diffSum = samMValues[0] - samMValues[k - 1];
  return diffSum / (k - 1);
}

/**
 * Main function: Computes complete traditional RSN analysis for a set of responses.
 */
export function calculateTraditionalRSN(
  responses: StimulusResponse[],
  rules: NormalizationRule[] = [],
  applyRules: boolean = true,
  weightingMethod: WeightingMethod = 'canonical',
  maxK: number = 10,
  samSize: number = 10
): TraditionalRSNResults {
  const validResponses = responses.filter(r => r.associations && r.associations.length > 0);
  const participantCount = validResponses.length;

  if (participantCount === 0) {
    return {
      stimulusId: responses[0]?.stimulusId || '',
      stimulusText: responses[0]?.stimulusText || '',
      participantCount: 0,
      valorJ: 0,
      maxM: 0,
      valorG: 0,
      screeCutoffIndex: 0,
      definidoras: [],
      samSet: [],
      nucleoSet: [],
      weightingSchemeUsed: weightingMethod,
      normalized: applyRules,
      calculatedAt: new Date().toISOString(),
    };
  }

  // Aggregate frequencies and weights per definidora
  interface WordAggregate {
    frequency: number;
    valorM: number;
    rankSum: number;
    rankDistribution: Record<number, number>;
  }

  const wordMap = new Map<string, WordAggregate>();

  for (const resp of validResponses) {
    const wordCount = resp.associations.length;
    // Track words seen in this participant to avoid double counting if duplicate exists
    const seenInResponse = new Set<string>();

    for (const assoc of resp.associations) {
      const cleanWord = normalizeWord(assoc.rawWord, rules, applyRules, assoc.canonicalWord);
      if (!cleanWord) continue;

      if (!seenInResponse.has(cleanWord)) {
        seenInResponse.add(cleanWord);

        let agg = wordMap.get(cleanWord);
        if (!agg) {
          agg = {
            frequency: 0,
            valorM: 0,
            rankSum: 0,
            rankDistribution: {},
          };
          wordMap.set(cleanWord, agg);
        }

        agg.frequency += 1;
        const weight = getWeightForRank(assoc.rank, wordCount, weightingMethod, maxK);
        agg.valorM += weight;
        agg.rankSum += assoc.rank;
        agg.rankDistribution[assoc.rank] = (agg.rankDistribution[assoc.rank] || 0) + 1;
      }
    }
  }

  const valorJ = wordMap.size;
  if (valorJ === 0) {
    return {
      stimulusId: validResponses[0].stimulusId,
      stimulusText: validResponses[0].stimulusText,
      participantCount,
      valorJ: 0,
      maxM: 0,
      valorG: 0,
      screeCutoffIndex: 0,
      definidoras: [],
      samSet: [],
      nucleoSet: [],
      weightingSchemeUsed: weightingMethod,
      normalized: applyRules,
      calculatedAt: new Date().toISOString(),
    };
  }

  // Convert to array and sort according to canonical tie-breaking rules
  // Rule 1: Highest Valor M
  // Rule 2: Highest frequency in rank 1
  // Rule 3: Highest frequency in rank 2... 10
  // Rule 4: Alphabetical order
  const rawList = Array.from(wordMap.entries()).map(([word, agg]) => ({
    word,
    frequency: agg.frequency,
    relativeFrequency: agg.frequency / participantCount,
    valorM: Math.round(agg.valorM * 1000) / 1000,
    meanRank: Math.round((agg.rankSum / agg.frequency) * 1000) / 1000,
    rankDistribution: agg.rankDistribution,
  }));

  rawList.sort((a, b) => {
    if (b.valorM !== a.valorM) {
      return b.valorM - a.valorM;
    }
    // Tie break by rank frequencies
    for (let r = 1; r <= maxK; r++) {
      const freqA = a.rankDistribution[r] || 0;
      const freqB = b.rankDistribution[r] || 0;
      if (freqB !== freqA) return freqB - freqA;
    }
    return a.word.localeCompare(b.word);
  });

  const maxM = rawList[0].valorM;

  // Calculate FMG for each definidora
  const definidorasWithFMG = rawList.map(item => ({
    ...item,
    valorFMG: maxM > 0 ? Math.round((item.valorM / maxM) * 10000) / 100 : 0,
  }));

  // Scree cutoff
  const sortedMValues = definidorasWithFMG.map(d => d.valorM);
  const screeCutoffIndex = calculateScreeCutoffIndex(sortedMValues);

  // Mark SAM and Núcleo
  // Canonical rule for SAM tie at boundary: include all words tied at the boundary
  let effectiveSAMThreshold = samSize;
  if (definidorasWithFMG.length > samSize) {
    const boundaryM = definidorasWithFMG[samSize - 1].valorM;
    while (
      effectiveSAMThreshold < definidorasWithFMG.length &&
      definidorasWithFMG[effectiveSAMThreshold].valorM === boundaryM
    ) {
      effectiveSAMThreshold++;
    }
  }

  const fullDefinidoras: DefinidoraStats[] = definidorasWithFMG.map((item, idx) => ({
    ...item,
    isSAM: idx < effectiveSAMThreshold,
    isNucleo: idx < screeCutoffIndex,
  }));

  const samSet = fullDefinidoras.filter(d => d.isSAM);
  const nucleoSet = fullDefinidoras.filter(d => d.isNucleo);

  // Valor G on SAM
  const samMValues = samSet.map(d => d.valorM);
  const valorG = Math.round(calculateValorG(samMValues) * 1000) / 1000;

  return {
    stimulusId: validResponses[0].stimulusId,
    stimulusText: validResponses[0].stimulusText,
    participantCount,
    valorJ,
    maxM,
    valorG,
    screeCutoffIndex,
    definidoras: fullDefinidoras,
    samSet,
    nucleoSet,
    weightingSchemeUsed: weightingMethod,
    normalized: applyRules,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Computes individual indicators: S, F, L, H, C (Valdez Medina, 2005, p. 79)
 */
export function calculateIndividualScores(
  response: StimulusResponse,
  samSet: DefinidoraStats[],
  rules: NormalizationRule[] = [],
  applyRules: boolean = true
): { valorS: number; valorL: number; valorC: number } {
  const words = response.associations.map(a => normalizeWord(a.rawWord, rules, applyRules, a.canonicalWord));
  const valorS = new Set(words).size;

  const samMap = new Map<string, number>();
  const samOrderMap = new Map<string, number>();
  samSet.forEach((item, idx) => {
    samMap.set(item.word, item.valorM);
    samOrderMap.set(item.word, idx + 1); // 1-based rank in SAM
  });

  let valorL = 0;
  let valorCPts = 0;

  response.associations.forEach(assoc => {
    const w = normalizeWord(assoc.rawWord, rules, applyRules, assoc.canonicalWord);
    if (samMap.has(w)) {
      valorL += samMap.get(w)!;
      const samRank = samOrderMap.get(w)!;
      const diff = Math.abs(assoc.rank - samRank);
      const pts = Math.max(0, 9 - diff);
      valorCPts += pts;
    }
  });

  // Valor C as percentage of max 90 pts
  const valorC = Math.round((valorCPts / 90) * 10000) / 100;

  return {
    valorS,
    valorL,
    valorC,
  };
}

/**
 * Computes Group Consensus Index (ICG) between two sets of definidoras (Reyes Lagunes, 1993, p. 84)
 * Formula: ICG = (|A ∩ B| / |A ∪ B|) * 100
 */
export function calculateICG(wordsA: Set<string> | string[], wordsB: Set<string> | string[]): number {
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;

  let intersectionCount = 0;
  for (const w of setA) {
    if (setB.has(w)) {
      intersectionCount++;
    }
  }

  return Math.round((intersectionCount / union.size) * 10000) / 100;
}

/**
 * Computes Pearson correlation coefficient (r) between two semantic M profiles (Valdez Medina, 2005, p. 77)
 */
export function calculatePearsonMCorrelation(
  definidorasA: DefinidoraStats[],
  definidorasB: DefinidoraStats[]
): number {
  const mapA = new Map(definidorasA.map(d => [d.word, d.valorM]));
  const mapB = new Map(definidorasB.map(d => [d.word, d.valorM]));

  const allWords = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
  if (allWords.length <= 1) return 0;

  const vecA = allWords.map(w => mapA.get(w) || 0);
  const vecB = allWords.map(w => mapB.get(w) || 0);

  const meanA = vecA.reduce((sum, v) => sum + v, 0) / vecA.length;
  const meanB = vecB.reduce((sum, v) => sum + v, 0) / vecB.length;

  let num = 0;
  let denA = 0;
  let denB = 0;

  for (let i = 0; i < allWords.length; i++) {
    const diffA = vecA[i] - meanA;
    const diffB = vecB[i] - meanB;
    num += diffA * diffB;
    denA += diffA * diffA;
    denB += diffB * diffB;
  }

  const den = Math.sqrt(denA * denB);
  if (den === 0) return 0;

  return Math.round((num / den) * 10000) / 10000;
}
