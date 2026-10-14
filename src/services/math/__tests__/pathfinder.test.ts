import { describe, it, expect } from 'vitest';
import {
  calculateRumelhartWeights,
  transformWeightsToDistances,
  runPathfinder,
  calculateStructuralSimilarity,
  ContingencyCell,
  PathfinderResult,
} from '../pathfinder';

describe('Pathfinder Network (PFNET) & Rumelhart Model Engine', () => {
  it('calculates Rumelhart log-odds association weights correctly', () => {
    // 2-concept test
    const cellPositive: ContingencyCell = {
      n11: 40,
      n10: 10,
      n01: 10,
      n00: 40,
      p11: 0.4,
      p10: 0.1,
      p01: 0.1,
      p00: 0.4,
    };

    const cellIndependent: ContingencyCell = {
      n11: 25,
      n10: 25,
      n01: 25,
      n00: 25,
      p11: 0.25,
      p10: 0.25,
      p01: 0.25,
      p00: 0.25,
    };

    const matrix: ContingencyCell[][] = [
      [
        { n11: 50, n10: 0, n01: 0, n00: 50, p11: 1, p10: 0, p01: 0, p00: 0 },
        cellPositive,
      ],
      [
        cellPositive,
        { n11: 50, n10: 0, n01: 0, n00: 50, p11: 1, p10: 0, p01: 0, p00: 0 },
      ],
    ];

    const weights = calculateRumelhartWeights(matrix);
    // OR = (0.4 * 0.4) / (0.1 * 0.1) = 0.16 / 0.01 = 16. ln(16) ~ 2.772588
    expect(weights[0][1]).toBeCloseTo(2.7726, 3);
    expect(weights[1][0]).toBeCloseTo(2.7726, 3);
    expect(weights[0][0]).toBe(0);
  });

  it('transforms association weights to distances using reciprocals non-destructively', () => {
    const W = [
      [0, 2.0, -1.5, 0],
      [2.0, 0, 4.0, 0.5],
      [-1.5, 4.0, 0, 1.0],
      [0, 0.5, 1.0, 0],
    ];

    const D = transformWeightsToDistances(W, 0.0001);

    expect(D[0][0]).toBe(0);
    expect(D[0][1]).toBeCloseTo(0.5, 4); // 1 / 2.0 = 0.5
    expect(D[0][2]).toBe(Infinity); // negative weight -> Infinity
    expect(D[0][3]).toBe(Infinity); // zero weight -> Infinity
    expect(D[1][2]).toBeCloseTo(0.25, 4); // 1 / 4.0 = 0.25 (closer distance)
    expect(D[1][3]).toBeCloseTo(2.0, 4); // 1 / 0.5 = 2.0
  });

  it('prunes triangle violation in Pathfinder (r = inf, q = 2)', () => {
    // 3 nodes: A (0), B (1), C (2)
    // d(A, B) = 3
    // d(B, C) = 4
    // d(A, C) = 8
    // Under r = inf, path A-B-C length is max(3, 4) = 4.
    // Since direct distance 8 > 4, edge (A, C) must be eliminated.
    const D = [
      [0, 3, 8],
      [3, 0, 4],
      [8, 4, 0],
    ];

    const resInf = runPathfinder(D, 'inf', 2);
    expect(resInf.edgeCount).toBe(2);
    expect(resInf.pfnetAdjacency[0][1]).toBe(true); // A - B
    expect(resInf.pfnetAdjacency[1][2]).toBe(true); // B - C
    expect(resInf.pfnetAdjacency[0][2]).toBe(false); // A - C eliminated!
  });

  it('keeps all edges when q = 1 (no alternative paths considered)', () => {
    const D = [
      [0, 3, 8],
      [3, 0, 4],
      [8, 4, 0],
    ];

    const resQ1 = runPathfinder(D, 'inf', 1);
    expect(resQ1.edgeCount).toBe(3);
    expect(resQ1.pfnetAdjacency[0][2]).toBe(true);
  });

  it('prunes edge under Minkowski r = 1 (taxicab metric)', () => {
    // Under r = 1, path A-B-C length is 3 + 4 = 7.
    // Direct edge is 8. Since 8 > 7, edge (A, C) is eliminated.
    const D = [
      [0, 3, 8],
      [3, 0, 4],
      [8, 4, 0],
    ];

    const resR1 = runPathfinder(D, 1, 2);
    expect(resR1.edgeCount).toBe(2);
    expect(resR1.pfnetAdjacency[0][2]).toBe(false);
  });

  it('calculates the Structural Similarity Index (ISE) accurately', () => {
    const mockNetA: PathfinderResult = {
      concepts: ['A', 'B', 'C', 'D'],
      conceptStats: {},
      contingencyMatrix: [],
      weightsMatrix: [],
      distanceMatrix: [],
      pfnetAdjacencyMatrix: [],
      edges: [
        { source: 'A', target: 'B', sourceIndex: 0, targetIndex: 1, weight: 1, distance: 1 },
        { source: 'B', target: 'C', sourceIndex: 1, targetIndex: 2, weight: 1, distance: 1 },
      ],
      parameters: { r: 'inf', q: 3, smoothing: 0.5, minWeightThreshold: 0.0001 },
      stats: { nodeCount: 4, edgeCount: 2, density: 0.33, totalPossibleEdges: 6 },
    };

    const mockNetB: PathfinderResult = {
      concepts: ['A', 'B', 'C', 'D'],
      conceptStats: {},
      contingencyMatrix: [],
      weightsMatrix: [],
      distanceMatrix: [],
      pfnetAdjacencyMatrix: [],
      edges: [
        { source: 'A', target: 'B', sourceIndex: 0, targetIndex: 1, weight: 1, distance: 1 }, // shared
        { source: 'C', target: 'D', sourceIndex: 2, targetIndex: 3, weight: 1, distance: 1 }, // distinct
      ],
      parameters: { r: 'inf', q: 3, smoothing: 0.5, minWeightThreshold: 0.0001 },
      stats: { nodeCount: 4, edgeCount: 2, density: 0.33, totalPossibleEdges: 6 },
    };

    const sim = calculateStructuralSimilarity(mockNetA, mockNetB);
    // Shared: A---B (1). Union: A---B, B---C, C---D (3). ISE = 1 / 3 ~ 0.333
    expect(sim.globalISE).toBeCloseTo(0.333, 2);
    expect(sim.commonEdgesCount).toBe(1);
    expect(sim.totalUniqueEdgesCount).toBe(3);
    expect(sim.nodeDetails['A'].nodeISE).toBe(1.0); // Both have A connected only to B
  });
});
