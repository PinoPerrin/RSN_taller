import { describe, it, expect } from 'vitest';
import {
  buildBinaryResponseMatrix,
  buildCooccurrenceMatrix,
  calculateJaccardMatrix,
  calculateGraphDensity,
  calculateClusteringCoefficient,
  calculateASPL,
  calculateModernGraph,
  calculateBetweennessCentrality,
} from '../graphAnalysis';
import { StimulusResponse } from '../../../types';

describe('Modern Graph Analysis Engine Verification', () => {
  // Test Dataset from Section 21.1
  const syntheticResponses: StimulusResponse[] = [
    {
      id: 'resp-A',
      sessionId: 'session-A',
      projectId: 'proj-1',
      stimulusId: 'stim-dolor',
      stimulusText: 'DOLOR',
      associations: [
        { rawWord: 'Ardor', generationOrder: 1, rank: 1, timing: { word: 'Ardor', confirmedMs: 5000 } },
        { rawWord: 'Miedo', generationOrder: 2, rank: 2, timing: { word: 'Miedo', confirmedMs: 12000 } },
        { rawWord: 'Cansancio', generationOrder: 3, rank: 3, timing: { word: 'Cansancio', confirmedMs: 25000 } },
      ],
      completedAt: '2026-10-13T10:00:00Z',
      totalGenerationTimeMs: 30000,
      rankingTimeMs: 15000,
      wordCount: 3,
    },
    {
      id: 'resp-B',
      sessionId: 'session-B',
      projectId: 'proj-1',
      stimulusId: 'stim-dolor',
      stimulusText: 'DOLOR',
      associations: [
        { rawWord: 'Miedo', generationOrder: 1, rank: 1, timing: { word: 'Miedo', confirmedMs: 4000 } },
        { rawWord: 'Ardor', generationOrder: 2, rank: 2, timing: { word: 'Ardor', confirmedMs: 9000 } },
      ],
      completedAt: '2026-10-13T10:05:00Z',
      totalGenerationTimeMs: 20000,
      rankingTimeMs: 10000,
      wordCount: 2,
    },
    {
      id: 'resp-C',
      sessionId: 'session-C',
      projectId: 'proj-1',
      stimulusId: 'stim-dolor',
      stimulusText: 'DOLOR',
      associations: [
        { rawWord: 'Ardor', generationOrder: 1, rank: 1, timing: { word: 'Ardor', confirmedMs: 6000 } },
        { rawWord: 'Sufrimiento', generationOrder: 2, rank: 2, timing: { word: 'Sufrimiento', confirmedMs: 14000 } },
        { rawWord: 'Miedo', generationOrder: 3, rank: 3, timing: { word: 'Miedo', confirmedMs: 28000 } },
      ],
      completedAt: '2026-10-13T10:10:00Z',
      totalGenerationTimeMs: 35000,
      rankingTimeMs: 12000,
      wordCount: 3,
    },
  ];

  it('correctly builds binary response incidence matrix', () => {
    const binary = buildBinaryResponseMatrix(syntheticResponses, [], true);
    expect(binary.words).toEqual(['ardor', 'cansancio', 'miedo', 'sufrimiento']);
    expect(binary.participantIds.length).toBe(3);

    // ardor appears in all 3 participants (indices 0, 1, 2)
    const ardorIdx = binary.words.indexOf('ardor');
    expect(binary.frequencies[ardorIdx]).toBe(3);

    // cansancio appears only in participant A (index 0)
    const cansancioIdx = binary.words.indexOf('cansancio');
    expect(binary.frequencies[cansancioIdx]).toBe(1);
    expect(binary.matrix[0][cansancioIdx]).toBe(1);
    expect(binary.matrix[1][cansancioIdx]).toBe(0);
    expect(binary.matrix[2][cansancioIdx]).toBe(0);
  });

  it('correctly builds co-occurrence matrix and Jaccard similarity', () => {
    const binary = buildBinaryResponseMatrix(syntheticResponses, [], true);
    const C = buildCooccurrenceMatrix(binary);
    const J = calculateJaccardMatrix(C, binary.frequencies);

    const idxArdor = binary.words.indexOf('ardor');
    const idxMiedo = binary.words.indexOf('miedo');
    const idxCansancio = binary.words.indexOf('cansancio');
    const idxSufrimiento = binary.words.indexOf('sufrimiento');

    // Ardor & Miedo cooccur in all 3 subjects
    expect(C[idxArdor][idxMiedo]).toBe(3);
    expect(J[idxArdor][idxMiedo]).toBe(1.0);

    // Ardor & Cansancio cooccur in subject A only
    expect(C[idxArdor][idxCansancio]).toBe(1);
    // Jaccard = 1 / (3 + 1 - 1) = 1/3 = 0.3333
    expect(J[idxArdor][idxCansancio]).toBeCloseTo(0.3333, 3);

    // Cansancio & Sufrimiento never cooccur
    expect(C[idxCansancio][idxSufrimiento]).toBe(0);
    expect(J[idxCansancio][idxSufrimiento]).toBe(0);
  });

  it('correctly calculates graph density, ASPL, and clustering coefficient', () => {
    const results = calculateModernGraph(syntheticResponses, [], true, 1);

    // 4 nodes, 5 edges
    expect(results.nodeCount).toBe(4);
    expect(results.edgeCount).toBe(5);

    // Density D = 2(5) / (4*3) = 10/12 = 0.8333
    expect(results.density).toBeCloseTo(0.8333, 3);

    // ASPL: 5 pairs with d=1, 1 pair with d=2 (Cansancio to Sufrimiento)
    // L = (5*1 + 1*2) / 6 = 7/6 = 1.1667
    expect(results.averageShortestPathLength).toBeCloseTo(1.1667, 3);

    // Clustering: C(Ardor)=2/3, C(Miedo)=2/3, C(Cansancio)=1, C(Sufrimiento)=1
    // Global CC = (2/3 + 2/3 + 1 + 1) / 4 = 3.3333 / 4 = 0.8333
    expect(results.clusteringCoefficient).toBeCloseTo(0.8333, 3);
  });

  it('correctly computes betweenness centrality for triangle with an ear', () => {
    // 3-node triangle: A-B, B-C, C-A (all betweenness = 0)
    const triangleAdj = [
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
    ];
    const cb = calculateBetweennessCentrality(triangleAdj);
    expect(cb).toEqual([0, 0, 0]);

    // Line of 3: A - B - C (B is between A and C)
    const lineAdj = [
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ];
    const cbLine = calculateBetweennessCentrality(lineAdj);
    // B has betweenness = 1.0 (normalized)
    expect(cbLine[1]).toBe(1.0);
    expect(cbLine[0]).toBe(0.0);
    expect(cbLine[2]).toBe(0.0);
  });
});
