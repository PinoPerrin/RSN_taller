// Modern Semantic Network Analysis (SemNA) & Graph Theory Engine
// Based on Christensen & Kenett (2021), Siew et al. (2019), Steyvers & Tenenbaum (2005), Newman (2006)

import {
  StimulusResponse,
  NormalizationRule,
  ModernGraphResults,
  GraphNode,
  GraphEdge,
} from '../../types';
import { normalizeWord } from './rsnTraditional';

export interface BinaryMatrix {
  words: string[];
  participantIds: string[];
  matrix: number[][]; // [participantIndex][wordIndex]
  frequencies: number[]; // frequency per word
}

/**
 * Builds the binary incidence matrix X of dimensions N x V.
 * X_ij = 1 if participant i mentioned word j, 0 otherwise.
 */
export function buildBinaryResponseMatrix(
  responses: StimulusResponse[],
  rules: NormalizationRule[] = [],
  applyRules: boolean = true
): BinaryMatrix {
  const valid = responses.filter(r => r.associations && r.associations.length > 0);
  const participantIds = valid.map(r => r.sessionId || r.id);

  // Collect all unique words
  const wordSet = new Set<string>();
  const participantWords: Set<string>[] = [];

  for (const resp of valid) {
    const pSet = new Set<string>();
    for (const assoc of resp.associations) {
      const clean = normalizeWord(assoc.rawWord, rules, applyRules, assoc.canonicalWord);
      if (clean) {
        wordSet.add(clean);
        pSet.add(clean);
      }
    }
    participantWords.push(pSet);
  }

  const words = Array.from(wordSet).sort();
  const wordIndexMap = new Map(words.map((w, idx) => [w, idx]));

  const N = valid.length;
  const V = words.length;

  const matrix: number[][] = Array.from({ length: N }, () => new Array(V).fill(0));
  const frequencies: number[] = new Array(V).fill(0);

  for (let i = 0; i < N; i++) {
    for (const w of participantWords[i]) {
      const j = wordIndexMap.get(w);
      if (j !== undefined) {
        matrix[i][j] = 1;
        frequencies[j] += 1;
      }
    }
  }

  return {
    words,
    participantIds,
    matrix,
    frequencies,
  };
}

/**
 * Builds the symmetric co-occurrence matrix C = X^T * X
 * C_jk represents the number of participants where words j and k co-occurred.
 */
export function buildCooccurrenceMatrix(binary: BinaryMatrix): number[][] {
  const V = binary.words.length;
  const C: number[][] = Array.from({ length: V }, () => new Array(V).fill(0));

  for (let i = 0; i < binary.participantIds.length; i++) {
    const row = binary.matrix[i];
    const presentIndices: number[] = [];
    for (let j = 0; j < V; j++) {
      if (row[j] === 1) presentIndices.push(j);
    }

    for (let p1 = 0; p1 < presentIndices.length; p1++) {
      const j = presentIndices[p1];
      for (let p2 = p1 + 1; p2 < presentIndices.length; p2++) {
        const k = presentIndices[p2];
        C[j][k] += 1;
        C[k][j] += 1;
      }
    }
  }

  return C;
}

/**
 * Computes Jaccard Similarity Matrix:
 * J_jk = C_jk / (f_j + f_k - C_jk)
 */
export function calculateJaccardMatrix(C: number[][], frequencies: number[]): number[][] {
  const V = frequencies.length;
  const J: number[][] = Array.from({ length: V }, () => new Array(V).fill(0));

  for (let j = 0; j < V; j++) {
    for (let k = j + 1; k < V; k++) {
      const cooc = C[j][k];
      if (cooc > 0) {
        const union = frequencies[j] + frequencies[k] - cooc;
        const sim = union > 0 ? cooc / union : 0;
        J[j][k] = Math.round(sim * 10000) / 10000;
        J[k][j] = J[j][k];
      }
    }
  }

  return J;
}

/**
 * Computes Graph Density: D = 2E / (V * (V - 1))
 */
export function calculateGraphDensity(nodeCount: number, edgeCount: number): number {
  if (nodeCount <= 1) return 0;
  const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
  return maxEdges > 0 ? Math.round((edgeCount / maxEdges) * 10000) / 10000 : 0;
}

/**
 * Computes Local and Global Clustering Coefficients (Watts & Strogatz, 1998; Steyvers & Tenenbaum, 2005)
 */
export function calculateClusteringCoefficient(adj: number[][]): {
  localCC: number[];
  globalCC: number;
} {
  const V = adj.length;
  if (V <= 2) return { localCC: new Array(V).fill(0), globalCC: 0 };

  const localCC: number[] = new Array(V).fill(0);
  let validNodeCount = 0;
  let sumCC = 0;

  for (let i = 0; i < V; i++) {
    const neighbors: number[] = [];
    for (let j = 0; j < V; j++) {
      if (i !== j && adj[i][j] > 0) {
        neighbors.push(j);
      }
    }

    const k = neighbors.length;
    if (k < 2) {
      localCC[i] = 0;
      continue;
    }

    let edgesBetweenNeighbors = 0;
    for (let p1 = 0; p1 < k; p1++) {
      const u = neighbors[p1];
      for (let p2 = p1 + 1; p2 < k; p2++) {
        const v = neighbors[p2];
        if (adj[u][v] > 0) {
          edgesBetweenNeighbors += 1;
        }
      }
    }

    const possibleEdges = (k * (k - 1)) / 2;
    const cc_i = edgesBetweenNeighbors / possibleEdges;
    localCC[i] = Math.round(cc_i * 10000) / 10000;
    sumCC += cc_i;
    validNodeCount += 1;
  }

  const globalCC = validNodeCount > 0 ? Math.round((sumCC / validNodeCount) * 10000) / 10000 : 0;

  return { localCC, globalCC };
}

/**
 * Computes Connected Components using Breadth-First Search (BFS)
 */
export function getConnectedComponents(adj: number[][]): number[][] {
  const V = adj.length;
  const visited = new Array(V).fill(false);
  const components: number[][] = [];

  for (let i = 0; i < V; i++) {
    if (!visited[i]) {
      const comp: number[] = [];
      const queue: number[] = [i];
      visited[i] = true;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);

        for (let next = 0; next < V; next++) {
          if (adj[curr][next] > 0 && !visited[next]) {
            visited[next] = true;
            queue.push(next);
          }
        }
      }
      components.push(comp);
    }
  }

  // Sort components by descending size
  components.sort((a, b) => b.length - a.length);
  return components;
}

/**
 * Computes Average Shortest Path Length (ASPL / L) on the Largest Connected Component (LCC).
 */
export function calculateASPL(adj: number[][], lccNodes?: number[]): number {
  const nodes = lccNodes || Array.from({ length: adj.length }, (_, i) => i);
  const n = nodes.length;
  if (n <= 1) return 0;

  let totalDistance = 0;
  let reachablePairs = 0;

  // BFS from each node in the component
  for (let i = 0; i < n; i++) {
    const src = nodes[i];
    const distMap = new Map<number, number>();
    distMap.set(src, 0);
    const queue = [src];

    while (queue.length > 0) {
      const u = queue.shift()!;
      const d = distMap.get(u)!;

      for (const v of nodes) {
        if (adj[u][v] > 0 && !distMap.has(v)) {
          distMap.set(v, d + 1);
          queue.push(v);
        }
      }
    }

    for (let j = i + 1; j < n; j++) {
      const tgt = nodes[j];
      if (distMap.has(tgt)) {
        totalDistance += distMap.get(tgt)!;
        reachablePairs += 1;
      }
    }
  }

  return reachablePairs > 0 ? Math.round((totalDistance / reachablePairs) * 10000) / 10000 : 0;
}

/**
 * Computes Brandes' Algorithm for Betweenness Centrality
 */
export function calculateBetweennessCentrality(adj: number[][]): number[] {
  const V = adj.length;
  const CB: number[] = new Array(V).fill(0);
  if (V <= 2) return CB;

  for (let s = 0; s < V; s++) {
    const S: number[] = [];
    const P: number[][] = Array.from({ length: V }, () => []);
    const sigma: number[] = new Array(V).fill(0);
    sigma[s] = 1;
    const d: number[] = new Array(V).fill(-1);
    d[s] = 0;

    const Q: number[] = [s];
    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);

      for (let w = 0; w < V; w++) {
        if (adj[v][w] > 0) {
          // w found for the first time?
          if (d[w] < 0) {
            d[w] = d[v] + 1;
            Q.push(w);
          }
          // shortest path to w via v?
          if (d[w] === d[v] + 1) {
            sigma[w] += sigma[v];
            P[w].push(v);
          }
        }
      }
    }

    const delta: number[] = new Array(V).fill(0);
    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) {
        CB[w] += delta[w];
      }
    }
  }

  // Undirected graph: divide by 2, and normalize by (V-1)(V-2)/2
  const normFactor = V > 2 ? ((V - 1) * (V - 2)) / 2 : 1;
  return CB.map(val => Math.round(((val / 2) / normFactor) * 10000) / 10000);
}

/**
 * Computes Closeness Centrality (Bavelas / Sabidussi)
 */
export function calculateClosenessCentrality(adj: number[][]): number[] {
  const V = adj.length;
  const CC: number[] = new Array(V).fill(0);
  if (V <= 1) return CC;

  for (let s = 0; s < V; s++) {
    const distMap = new Map<number, number>();
    distMap.set(s, 0);
    const Q = [s];

    while (Q.length > 0) {
      const u = Q.shift()!;
      const d = distMap.get(u)!;

      for (let v = 0; v < V; v++) {
        if (adj[u][v] > 0 && !distMap.has(v)) {
          distMap.set(v, d + 1);
          Q.push(v);
        }
      }
    }

    let reachableSum = 0;
    let reachableCount = 0;
    for (const [node, d] of distMap.entries()) {
      if (node !== s) {
        reachableSum += d;
        reachableCount += 1;
      }
    }

    if (reachableSum > 0 && reachableCount > 0) {
      // Harmonic / Wasserman & Faust normalization for disconnected components:
      // (reachableCount / (V - 1)) * (reachableCount / reachableSum)
      const rawCloseness = reachableCount / reachableSum;
      const componentRatio = reachableCount / (V - 1);
      CC[s] = Math.round(rawCloseness * componentRatio * 10000) / 10000;
    }
  }

  return CC;
}

/**
 * Computes Newman's Modularity Q and Louvain Community Detection (Blondel et al., 2008)
 */
export function detectLouvainCommunities(adj: number[][]): {
  Q: number;
  communities: number[];
} {
  const V = adj.length;
  if (V === 0) return { Q: 0, communities: [] };
  if (V === 1) return { Q: 0, communities: [0] };

  // Calculate degrees and total weight m
  const k: number[] = new Array(V).fill(0);
  let totalWeight2m = 0;

  for (let i = 0; i < V; i++) {
    for (let j = 0; j < V; j++) {
      k[i] += adj[i][j];
      totalWeight2m += adj[i][j];
    }
  }

  if (totalWeight2m === 0) {
    return { Q: 0, communities: Array.from({ length: V }, (_, i) => i) };
  }

  const communities = Array.from({ length: V }, (_, i) => i);

  // Louvain Phase 1: Iterative local greedy modularity optimization
  let improved = true;
  let iterations = 0;
  const maxIterations = 20;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < V; i++) {
      const currentComm = communities[i];
      const ki = k[i];

      // Find neighbor communities
      const neighborComms = new Set<number>();
      for (let j = 0; j < V; j++) {
        if (adj[i][j] > 0) {
          neighborComms.add(communities[j]);
        }
      }

      let bestComm = currentComm;
      let bestGain = 0;

      // Evaluate moving node i to each neighbor community
      for (const targetComm of neighborComms) {
        if (targetComm === currentComm) continue;

        // Calculate modularity gain dQ
        let k_i_in_target = 0;
        let k_i_in_curr = 0;
        let tot_target = 0;
        let tot_curr = 0;

        for (let j = 0; j < V; j++) {
          if (j !== i) {
            if (communities[j] === targetComm) {
              k_i_in_target += adj[i][j];
              tot_target += k[j];
            } else if (communities[j] === currentComm) {
              k_i_in_curr += adj[i][j];
              tot_curr += k[j];
            }
          }
        }

        const deltaQ =
          (k_i_in_target - k_i_in_curr) / totalWeight2m -
          (ki * (tot_target - tot_curr)) / (totalWeight2m * totalWeight2m);

        if (deltaQ > bestGain) {
          bestGain = deltaQ;
          bestComm = targetComm;
        }
      }

      if (bestGain > 1e-6) {
        communities[i] = bestComm;
        improved = true;
      }
    }
  }

  // Renumber communities 0, 1, 2...
  const uniqueComms = Array.from(new Set(communities));
  const commMap = new Map(uniqueComms.map((c, idx) => [c, idx]));
  const renumbered = communities.map(c => commMap.get(c)!);

  // Calculate final modularity Q
  let Q = 0;
  for (let i = 0; i < V; i++) {
    for (let j = 0; j < V; j++) {
      if (renumbered[i] === renumbered[j]) {
        Q += adj[i][j] - (k[i] * k[j]) / totalWeight2m;
      }
    }
  }
  Q = Q / totalWeight2m;

  return {
    Q: Math.round(Q * 10000) / 10000,
    communities: renumbered,
  };
}

/**
 * Master Modern Graph Analysis Pipeline
 */
export function calculateModernGraph(
  responses: StimulusResponse[],
  rules: NormalizationRule[] = [],
  applyRules: boolean = true,
  edgeThreshold: number = 1 // minimum cooccurrence count
): ModernGraphResults {
  const binary = buildBinaryResponseMatrix(responses, rules, applyRules);
  const C = buildCooccurrenceMatrix(binary);
  const Jaccard = calculateJaccardMatrix(C, binary.frequencies);

  const V = binary.words.length;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Filtered adjacency matrix for network topology calculation
  const filteredAdj: number[][] = Array.from({ length: V }, () => new Array(V).fill(0));

  for (let j = 0; j < V; j++) {
    for (let k = j + 1; k < V; k++) {
      const count = C[j][k];
      if (count >= edgeThreshold) {
        filteredAdj[j][k] = count;
        filteredAdj[k][j] = count;
        edges.push({
          source: binary.words[j],
          target: binary.words[k],
          weight: count,
          jaccard: Jaccard[j][k],
        });
      }
    }
  }

  // Topologies
  const density = calculateGraphDensity(V, edges.length);
  const { localCC, globalCC } = calculateClusteringCoefficient(filteredAdj);
  const betweenness = calculateBetweennessCentrality(filteredAdj);
  const closeness = calculateClosenessCentrality(filteredAdj);
  const { Q: modularityQ, communities } = detectLouvainCommunities(filteredAdj);

  // Components and ASPL
  const components = getConnectedComponents(filteredAdj);
  const componentCount = components.length;
  const largestComponent = components[0] || [];
  const largestComponentRatio = V > 0 ? Math.round((largestComponent.length / V) * 10000) / 100 : 0;
  const aspl = calculateASPL(filteredAdj, largestComponent);

  let totalDegree = 0;

  for (let i = 0; i < V; i++) {
    let degree = 0;
    let strength = 0;
    for (let j = 0; j < V; j++) {
      if (filteredAdj[i][j] > 0) {
        degree += 1;
        strength += filteredAdj[i][j];
      }
    }
    totalDegree += degree;

    nodes.push({
      id: binary.words[i],
      label: binary.words[i],
      frequency: binary.frequencies[i],
      degree,
      weightedDegree: strength,
      betweennessCentrality: betweenness[i] || 0,
      closenessCentrality: closeness[i] || 0,
      communityId: communities[i] !== undefined ? communities[i] : 0,
    });
  }

  const averageDegree = V > 0 ? Math.round((totalDegree / V) * 100) / 100 : 0;
  const communityCount = new Set(communities).size;

  return {
    stimulusId: responses[0]?.stimulusId || '',
    nodes,
    edges,
    nodeCount: V,
    edgeCount: edges.length,
    density,
    averageDegree,
    averageShortestPathLength: aspl,
    clusteringCoefficient: globalCC,
    modularityQ,
    communityCount,
    componentCount,
    largestComponentRatio,
    calculatedAt: new Date().toISOString(),
  };
}
