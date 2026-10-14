import { describe, it, expect } from 'vitest';
import {
  calculateValorJ,
  getWeightForRank,
  calculateTraditionalRSN,
  calculateScreeCutoffIndex,
  calculateValorG,
  calculateICG,
  calculatePearsonMCorrelation,
  normalizeWord,
} from '../rsnTraditional';
import { StimulusResponse } from '../../../types';

describe('RSN Traditional Indicators Verification', () => {
  // Test Dataset from Section 21.1: Stimulus "DOLOR"
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

  it('correctly calculates canonical ranking weights (10, 9, 8...)', () => {
    expect(getWeightForRank(1, 3, 'canonical', 10)).toBe(10);
    expect(getWeightForRank(2, 3, 'canonical', 10)).toBe(9);
    expect(getWeightForRank(3, 3, 'canonical', 10)).toBe(8);
    expect(getWeightForRank(10, 10, 'canonical', 10)).toBe(1);
    expect(getWeightForRank(11, 10, 'canonical', 10)).toBe(0);
  });

  it('correctly computes Valor J, M, FMG, SAM, and Núcleo for synthetic DOLOR benchmark', () => {
    const results = calculateTraditionalRSN(syntheticResponses, [], true, 'canonical', 10, 10);

    // 1. Valor J (Network Size)
    expect(results.valorJ).toBe(4);
    expect(results.participantCount).toBe(3);

    // 2. Definidoras and Valor M
    const ardor = results.definidoras.find(d => d.word === 'ardor')!;
    const miedo = results.definidoras.find(d => d.word === 'miedo')!;
    const sufrimiento = results.definidoras.find(d => d.word === 'sufrimiento')!;
    const cansancio = results.definidoras.find(d => d.word === 'cansancio')!;

    expect(ardor).toBeDefined();
    expect(miedo).toBeDefined();
    expect(sufrimiento).toBeDefined();
    expect(cansancio).toBeDefined();

    // M(Ardor) = 10 + 9 + 10 = 29
    expect(ardor.valorM).toBe(29);
    expect(ardor.frequency).toBe(3);
    expect(ardor.valorFMG).toBe(100.0);

    // M(Miedo) = 9 + 10 + 8 = 27
    expect(miedo.valorM).toBe(27);
    expect(miedo.frequency).toBe(3);
    expect(miedo.valorFMG).toBeCloseTo(93.10, 1);

    // M(Sufrimiento) = 9
    expect(sufrimiento.valorM).toBe(9);
    expect(sufrimiento.frequency).toBe(1);
    expect(sufrimiento.valorFMG).toBeCloseTo(31.03, 1);

    // M(Cansancio) = 8
    expect(cansancio.valorM).toBe(8);
    expect(cansancio.frequency).toBe(1);
    expect(cansancio.valorFMG).toBeCloseTo(27.59, 1);

    // 3. SAM Set (all 4 are in SAM since J = 4 <= 10)
    expect(results.samSet.length).toBe(4);
    expect(results.samSet[0].word).toBe('ardor');
    expect(results.samSet[1].word).toBe('miedo');

    // 4. Núcleo de la Red (Scree test cutoff at the elbow between M=27 and M=9)
    expect(results.nucleoSet.map(d => d.word)).toContain('ardor');
    expect(results.nucleoSet.map(d => d.word)).toContain('miedo');
    expect(results.nucleoSet.length).toBe(2);

    // 5. Valor G on SAM
    // G = (29 - 8) / 3 = 7.0
    expect(results.valorG).toBe(7.0);
  });

  it('safely normalizes text without altering accented characters or corrupting words', () => {
    expect(normalizeWord('  Árbol  ')).toBe('árbol');
    expect(normalizeWord('MIEDO')).toBe('miedo');
    expect(normalizeWord('Dolor   fuerte')).toBe('dolor fuerte');

    // Custom normalization rule lookup
    const rules = [
      {
        id: '1',
        projectId: 'p1',
        rawForm: 'cuate',
        canonicalForm: 'amigo',
        author: 'admin',
        reason: 'sinonimia coloquial',
        createdAt: '2026-10-13T00:00:00Z',
        active: true,
      },
    ];
    expect(normalizeWord('cuate', rules, true)).toBe('amigo');
    expect(normalizeWord('cuate', rules, false)).toBe('cuate');
  });

  it('correctly calculates ICG (Índice de Consenso Grupal)', () => {
    const groupA = ['dolor', 'ardor', 'tristeza'];
    const groupB = ['dolor', 'pena', 'llanto', 'tristeza'];
    // Shared: dolor, tristeza (2)
    // Union: dolor, ardor, tristeza, pena, llanto (5)
    // ICG = (2 / 5) * 100 = 40.0%
    expect(calculateICG(groupA, groupB)).toBe(40.0);
  });

  it('handles edge cases: empty responses and single association', () => {
    const emptyResults = calculateTraditionalRSN([], [], true);
    expect(emptyResults.participantCount).toBe(0);
    expect(emptyResults.valorJ).toBe(0);
    expect(emptyResults.definidoras).toEqual([]);

    const singleResponse: StimulusResponse[] = [
      {
        id: 'r1',
        sessionId: 's1',
        projectId: 'p1',
        stimulusId: 'st1',
        stimulusText: 'PAZ',
        associations: [
          { rawWord: 'Tranquilidad', generationOrder: 1, rank: 1, timing: { word: 'Tranquilidad', confirmedMs: 3000 } },
        ],
        completedAt: '2026-10-13T10:00:00Z',
        totalGenerationTimeMs: 3000,
        rankingTimeMs: 1000,
        wordCount: 1,
      },
    ];

    const singleResults = calculateTraditionalRSN(singleResponse, [], true);
    expect(singleResults.valorJ).toBe(1);
    expect(singleResults.maxM).toBe(10);
    expect(singleResults.definidoras[0].valorFMG).toBe(100);
    expect(singleResults.valorG).toBe(0); // Only 1 word
  });
});
