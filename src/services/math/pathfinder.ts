// Pathfinder Network (PFNET) Engine with Rumelhart Probabilistic Association Model
// Based on:
// - Sánchez Miranda, De la Garza González & López Ramírez (2013). Liberabit, 19(2), 223-233.
// - Manual de Usuario SemNet v3.22 (2014), pp. 22-23.
// - Rumelhart, Smolensky, McClelland & Hinton (1986). PDP Vol. 2, Ch. 14.
// - Schvaneveldt, Durso & Mukherji (1982); Schvaneveldt (1990).

import { StimulusResponse, NormalizationRule } from '../../types';
import { normalizeWord } from './rsnTraditional';

export interface ContingencyCell {
  n11: number; // Present in both
  n10: number; // Present in i, absent in j
  n01: number; // Absent in i, present in j
  n00: number; // Absent in both
  p11: number;
  p10: number;
  p01: number;
  p00: number;
}

export interface PathfinderEdge {
  source: string;
  target: string;
  sourceIndex: number;
  targetIndex: number;
  weight: number; // w_ij Rumelhart association weight
  distance: number; // d_ij distance used in PFNET
}

export interface PathfinderResult {
  concepts: string[];
  conceptStats: Record<
    string,
    {
      frequency: number;
      valorM?: number;
      valorFMG?: number;
      degree: number;
      inSAM: boolean;
      stimuliSources: string[];
    }
  >;
  contingencyMatrix: ContingencyCell[][];
  weightsMatrix: number[][]; // w_ij
  distanceMatrix: number[][]; // d_ij
  pfnetAdjacencyMatrix: boolean[][];
  edges: PathfinderEdge[];
  parameters: {
    r: number | 'inf';
    q: number;
    smoothing: number;
    minWeightThreshold: number;
  };
  stats: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    totalPossibleEdges: number;
  };
}

/**
 * Extracts candidate concepts from selected stimuli (e.g. Union of SAM-10 sets).
 */
export function extractConceptsForPathfinder(
  responses: StimulusResponse[],
  rules: NormalizationRule[] = [],
  applyRules: boolean = true,
  maxConceptsPerStimulus: number = 10
): { concepts: string[]; conceptStimuliMap: Map<string, Set<string>> } {
  // Group responses by stimulus
  const stimulusMap = new Map<string, StimulusResponse[]>();
  responses.forEach(r => {
    const list = stimulusMap.get(r.stimulusId) || [];
    list.push(r);
    stimulusMap.set(r.stimulusId, list);
  });

  const selectedConceptsSet = new Set<string>();
  const conceptStimuliMap = new Map<string, Set<string>>();

  stimulusMap.forEach((stimResponses, stimId) => {
    // Calculate frequency & weight per word in this stimulus
    const wordCounts = new Map<string, number>();
    stimResponses.forEach(resp => {
      const seen = new Set<string>();
      resp.associations.forEach(assoc => {
        const clean = normalizeWord(assoc.rawWord, rules, applyRules, assoc.canonicalWord);
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
        }
      });
    });

    // Pick top concepts (SAM group)
    const sorted = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxConceptsPerStimulus);

    sorted.forEach(([word]) => {
      selectedConceptsSet.add(word);
      const stimSet = conceptStimuliMap.get(word) || new Set<string>();
      stimSet.add(stimResponses[0]?.stimulusText || stimId);
      conceptStimuliMap.set(word, stimSet);
    });
  });

  return {
    concepts: Array.from(selectedConceptsSet).sort(),
    conceptStimuliMap,
  };
}

/**
 * Builds the 2x2 contingency matrix for all pairs of concepts.
 * Observation unit: Participant response lists across the selected stimuli.
 * Applies Haldane-Anscombe / Laplace smoothing (default epsilon = 0.5) to prevent division by zero.
 */
export function buildContingencyMatrix(
  responses: StimulusResponse[],
  concepts: string[],
  rules: NormalizationRule[] = [],
  applyRules: boolean = true,
  smoothing: number = 0.5
): {
  contingencyMatrix: ContingencyCell[][];
  wordOccurrences: number[];
  totalObservations: number;
} {
  const V = concepts.length;
  const conceptIndex = new Map(concepts.map((c, i) => [c, i]));

  // Observation lists: each response is an observation context
  const observations: Set<number>[] = [];
  responses.forEach(r => {
    const present = new Set<number>();
    r.associations.forEach(a => {
      const clean = normalizeWord(a.rawWord, rules, applyRules, a.canonicalWord);
      const idx = conceptIndex.get(clean);
      if (idx !== undefined) {
        present.add(idx);
      }
    });
    observations.push(present);
  });

  const N = observations.length;
  const wordOccurrences = new Array(V).fill(0);

  // Pairwise co-occurrences
  const cooc: number[][] = Array.from({ length: V }, () => new Array(V).fill(0));

  observations.forEach(presentSet => {
    presentSet.forEach(idx => {
      wordOccurrences[idx]++;
    });
    const arr = Array.from(presentSet);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const u = arr[i];
        const v = arr[j];
        cooc[u][v]++;
        cooc[v][u]++;
      }
    }
  });

  const contingencyMatrix: ContingencyCell[][] = Array.from({ length: V }, () =>
    new Array(V)
  );

  for (let i = 0; i < V; i++) {
    for (let j = 0; j < V; j++) {
      if (i === j) {
        contingencyMatrix[i][j] = {
          n11: wordOccurrences[i],
          n10: 0,
          n01: 0,
          n00: N - wordOccurrences[i],
          p11: 1,
          p10: 0,
          p01: 0,
          p00: 0,
        };
        continue;
      }

      const n11_raw = cooc[i][j];
      const n10_raw = wordOccurrences[i] - n11_raw;
      const n01_raw = wordOccurrences[j] - n11_raw;
      const n00_raw = N - n11_raw - n10_raw - n01_raw;

      // Smoothed counts
      const n11 = n11_raw + smoothing;
      const n10 = Math.max(0, n10_raw) + smoothing;
      const n01 = Math.max(0, n01_raw) + smoothing;
      const n00 = Math.max(0, n00_raw) + smoothing;
      const sum = n11 + n10 + n01 + n00;

      contingencyMatrix[i][j] = {
        n11: n11_raw,
        n10: Math.max(0, n10_raw),
        n01: Math.max(0, n01_raw),
        n00: Math.max(0, n00_raw),
        p11: n11 / sum,
        p10: n10 / sum,
        p01: n01 / sum,
        p00: n00 / sum,
      };
    }
  }

  return {
    contingencyMatrix,
    wordOccurrences,
    totalObservations: N,
  };
}

/**
 * Computes Rumelhart association weight w_ij:
 * w_ij = ln( (P11 * P00) / (P10 * P01) )
 * Based on Sánchez et al. (2013), p. 224 and Rumelhart et al. (1986).
 */
export function calculateRumelhartWeights(contingencyMatrix: ContingencyCell[][]): number[][] {
  const V = contingencyMatrix.length;
  const W: number[][] = Array.from({ length: V }, () => new Array(V).fill(0));

  for (let i = 0; i < V; i++) {
    for (let j = 0; j < V; j++) {
      if (i === j) {
        W[i][j] = 0;
        continue;
      }
      const cell = contingencyMatrix[i][j];
      const num = cell.p11 * cell.p00;
      const den = cell.p10 * cell.p01;

      if (den <= 0 || num <= 0) {
        W[i][j] = 0;
      } else {
        const oddsRatio = num / den;
        W[i][j] = Math.log(oddsRatio);
      }
    }
  }

  return W;
}

/**
 * Transforms association weights into Pathfinder distances.
 * Methodological decision documented:
 * - Following Sánchez et al. (2013, p. 227), distances are derived via reciprocals: d_ij = 1 / w_ij.
 * - Non-negativity constraint: PFNET requires d_ij >= 0.
 * - Negative and non-positive weights (w_ij <= 0 or w_ij < minWeightThreshold) indicate
 *   inhibitory or zero association. They are assigned distance = Infinity (no direct link).
 */
export function transformWeightsToDistances(
  weightsMatrix: number[][],
  minWeightThreshold: number = 0.0001
): number[][] {
  const V = weightsMatrix.length;
  const D: number[][] = Array.from({ length: V }, () => new Array(V).fill(Infinity));

  for (let i = 0; i < V; i++) {
    for (let j = 0; j < V; j++) {
      if (i === j) {
        D[i][j] = 0;
      } else {
        const w = weightsMatrix[i][j];
        if (w > minWeightThreshold) {
          D[i][j] = 1 / w;
        } else {
          D[i][j] = Infinity;
        }
      }
    }
  }

  return D;
}

/**
 * Applies the Pathfinder Network (PFNET) algorithm.
 * Parameters:
 * - r: Minkowski parameter in [1, inf]. When r = 'inf', uses maximum distance along path.
 * - q: Maximum number of links in alternative paths considered (default: V - 1).
 *
 * An edge (i, j) is preserved in PFNET if and only if its direct distance d_ij
 * is less than or equal to the minimum Minkowski distance of all paths between i and j
 * having between 2 and q edges.
 */
export function runPathfinder(
  initialDistances: number[][],
  r: number | 'inf' = 'inf',
  qParam?: number
): {
  pfnetAdjacency: boolean[][];
  shortestPaths: number[][];
  edgeCount: number;
} {
  const V = initialDistances.length;
  const q = Math.max(1, Math.min(V - 1, qParam !== undefined ? qParam : V - 1));

  // Helper for Minkowski sum of two lengths
  const minkowskiSum = (d1: number, d2: number): number => {
    if (d1 === Infinity || d2 === Infinity) return Infinity;
    if (r === 'inf') {
      return Math.max(d1, d2);
    }
    const rNum = typeof r === 'number' ? r : 1;
    return Math.pow(Math.pow(d1, rNum) + Math.pow(d2, rNum), 1 / rNum);
  };

  // D_k[i][j] represents the shortest Minkowski distance of paths from i to j using exactly or up to k edges.
  // We initialize D_1 = initialDistances
  let currentD: number[][] = initialDistances.map(row => [...row]);

  // Overall minimum path distance for paths of 2 to q steps
  const altMinD: number[][] = Array.from({ length: V }, () => new Array(V).fill(Infinity));

  // Iteratively compute distances for paths of length 2 up to q
  for (let step = 2; step <= q; step++) {
    const nextD: number[][] = Array.from({ length: V }, () => new Array(V).fill(Infinity));

    for (let i = 0; i < V; i++) {
      for (let j = 0; j < V; j++) {
        if (i === j) {
          nextD[i][j] = 0;
          continue;
        }

        let best = Infinity;
        for (let m = 0; m < V; m++) {
          if (m === i || m === j) continue;
          const d_im = currentD[i][m];
          const d_mj = initialDistances[m][j];
          if (d_im < Infinity && d_mj < Infinity) {
            const combined = minkowskiSum(d_im, d_mj);
            if (combined < best) {
              best = combined;
            }
          }
        }
        nextD[i][j] = best;
        if (best < altMinD[i][j]) {
          altMinD[i][j] = best;
        }
      }
    }

    currentD = nextD;
  }

  // Edge retention rule:
  // Edge (i, j) is kept iff d_ij < Infinity and no alternative path of 2..q links has strictly shorter distance.
  // Using an epsilon for floating point comparison.
  const EPSILON = 1e-9;
  const pfnetAdjacency: boolean[][] = Array.from({ length: V }, () => new Array(V).fill(false));
  let edgeCount = 0;

  for (let i = 0; i < V; i++) {
    for (let j = i + 1; j < V; j++) {
      const directDist = initialDistances[i][j];
      if (directDist < Infinity) {
        const altDist = altMinD[i][j];
        // If the direct distance is less than or practically equal to the best alternative path, retain edge
        if (directDist <= altDist + EPSILON) {
          pfnetAdjacency[i][j] = true;
          pfnetAdjacency[j][i] = true;
          edgeCount++;
        }
      }
    }
  }

  return {
    pfnetAdjacency,
    shortestPaths: altMinD,
    edgeCount,
  };
}

/**
 * Full Pipeline for Pathfinder Network Analysis.
 */
export function analyzePathfinder(
  responses: StimulusResponse[],
  targetConcepts: string[],
  rules: NormalizationRule[] = [],
  applyRules: boolean = true,
  options?: {
    r?: number | 'inf';
    q?: number;
    smoothing?: number;
    minWeightThreshold?: number;
    conceptStimuliMap?: Map<string, Set<string>>;
    conceptStatsMap?: Map<string, { frequency: number; valorM: number; valorFMG: number; inSAM: boolean }>;
  }
): PathfinderResult {
  const r = options?.r !== undefined ? options.r : 'inf';
  const smoothing = options?.smoothing !== undefined ? options.smoothing : 0.5;
  const minWeightThreshold = options?.minWeightThreshold !== undefined ? options.minWeightThreshold : 0.0001;
  const V = targetConcepts.length;
  const q = options?.q !== undefined ? options.q : Math.max(1, V - 1);

  // Step 1: Contingency
  const { contingencyMatrix, wordOccurrences } = buildContingencyMatrix(
    responses,
    targetConcepts,
    rules,
    applyRules,
    smoothing
  );

  // Step 2: Rumelhart weights
  const weightsMatrix = calculateRumelhartWeights(contingencyMatrix);

  // Step 3: Distances
  const distanceMatrix = transformWeightsToDistances(weightsMatrix, minWeightThreshold);

  // Step 4: Pathfinder
  const { pfnetAdjacency, edgeCount } = runPathfinder(distanceMatrix, r, q);

  // Compile edges list
  const edges: PathfinderEdge[] = [];
  const degrees = new Array(V).fill(0);

  for (let i = 0; i < V; i++) {
    for (let j = i + 1; j < V; j++) {
      if (pfnetAdjacency[i][j]) {
        degrees[i]++;
        degrees[j]++;
        edges.push({
          source: targetConcepts[i],
          target: targetConcepts[j],
          sourceIndex: i,
          targetIndex: j,
          weight: Math.round(weightsMatrix[i][j] * 1000) / 1000,
          distance: Math.round(distanceMatrix[i][j] * 1000) / 1000,
        });
      }
    }
  }

  // Concept stats
  const conceptStats: PathfinderResult['conceptStats'] = {};
  targetConcepts.forEach((c, idx) => {
    const customStats = options?.conceptStatsMap?.get(c);
    const stimuliSources = Array.from(options?.conceptStimuliMap?.get(c) || []);
    conceptStats[c] = {
      frequency: customStats?.frequency || wordOccurrences[idx] || 0,
      valorM: customStats?.valorM,
      valorFMG: customStats?.valorFMG,
      degree: degrees[idx],
      inSAM: customStats?.inSAM ?? true,
      stimuliSources,
    };
  });

  const totalPossibleEdges = (V * (V - 1)) / 2;
  const density = totalPossibleEdges > 0 ? edgeCount / totalPossibleEdges : 0;

  return {
    concepts: targetConcepts,
    conceptStats,
    contingencyMatrix,
    weightsMatrix,
    distanceMatrix,
    pfnetAdjacencyMatrix: pfnetAdjacency,
    edges,
    parameters: {
      r,
      q,
      smoothing,
      minWeightThreshold,
    },
    stats: {
      nodeCount: V,
      edgeCount,
      density: Math.round(density * 10000) / 10000,
      totalPossibleEdges,
    },
  };
}

/**
 * Structural Similarity Index (ISE) between two Pathfinder Networks
 * Based on Sánchez et al. (2013), p. 227 and Table 3.
 * Global ISE = |Edges_A ∩ Edges_B| / |Edges_A ∪ Edges_B|
 * Node ISE = |Neighbors_A(v) ∩ Neighbors_B(v)| / |Neighbors_A(v) ∪ Neighbors_B(v)|
 */
export function calculateStructuralSimilarity(
  netA: PathfinderResult,
  netB: PathfinderResult
): {
  globalISE: number;
  commonEdgesCount: number;
  totalUniqueEdgesCount: number;
  nodeDetails: Record<
    string,
    {
      commonLinks: number;
      totalLinks: number;
      nodeISE: number;
      neighborsA: string[];
      neighborsB: string[];
    }
  >;
} {
  // Edge representation as "word1---word2" (alphabetically sorted)
  const edgeKey = (w1: string, w2: string) => (w1 < w2 ? `${w1}---${w2}` : `${w2}---${w1}`);

  const setA = new Set(netA.edges.map(e => edgeKey(e.source, e.target)));
  const setB = new Set(netB.edges.map(e => edgeKey(e.source, e.target)));

  let common = 0;
  setA.forEach(e => {
    if (setB.has(e)) common++;
  });

  const unionSize = new Set([...Array.from(setA), ...Array.from(setB)]).size;
  const globalISE = unionSize > 0 ? Math.round((common / unionSize) * 1000) / 1000 : 0;

  // Node by node details
  const allNodes = Array.from(new Set([...netA.concepts, ...netB.concepts])).sort();
  const nodeDetails: ReturnType<typeof calculateStructuralSimilarity>['nodeDetails'] = {};

  allNodes.forEach(node => {
    const neighA = new Set<string>();
    netA.edges.forEach(e => {
      if (e.source === node) neighA.add(e.target);
      if (e.target === node) neighA.add(e.source);
    });

    const neighB = new Set<string>();
    netB.edges.forEach(e => {
      if (e.source === node) neighB.add(e.target);
      if (e.target === node) neighB.add(e.source);
    });

    let nodeCommon = 0;
    neighA.forEach(v => {
      if (neighB.has(v)) nodeCommon++;
    });

    const nodeUnion = new Set([...Array.from(neighA), ...Array.from(neighB)]).size;
    const nodeISE = nodeUnion > 0 ? Math.round((nodeCommon / nodeUnion) * 100) / 100 : 0;

    nodeDetails[node] = {
      commonLinks: nodeCommon,
      totalLinks: nodeUnion,
      nodeISE,
      neighborsA: Array.from(neighA).sort(),
      neighborsB: Array.from(neighB).sort(),
    };
  });

  return {
    globalISE,
    commonEdgesCount: common,
    totalUniqueEdgesCount: unionSize,
    nodeDetails,
  };
}
