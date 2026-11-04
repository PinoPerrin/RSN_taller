import { describe, it, expect } from 'vitest';
import {
  generateSemanticInterpretation,
  computeDataFingerprint,
} from '../semanticInterpretationService';
import { Stimulus, StimulusResponse } from '../../../types';

describe('AI-Assisted Semantic Interpretation Module', () => {
  const stim1: Stimulus = {
    id: 'stim-1',
    projectId: 'proj-test',
    text: 'PERRO',
    order: 1,
  };

  const stim2: Stimulus = {
    id: 'stim-2',
    projectId: 'proj-test',
    text: 'GATO',
    order: 2,
  };

  // Dataset with shared words (lealtad, compania, carino) and exclusive words (ladrar, maullar)
  const testResponses: StimulusResponse[] = [
    // Responses for PERRO
    {
      id: 'resp-p1',
      sessionId: 'sess-1',
      projectId: 'proj-test',
      stimulusId: 'stim-1',
      stimulusText: 'PERRO',
      associations: [
        { rawWord: 'lealtad', generationOrder: 1, rank: 1, timing: { word: 'lealtad', confirmedMs: 3000 } },
        { rawWord: 'amigo', generationOrder: 2, rank: 2, timing: { word: 'amigo', confirmedMs: 6000 } },
        { rawWord: 'compania', generationOrder: 3, rank: 3, timing: { word: 'compania', confirmedMs: 9000 } },
        { rawWord: 'ladrar', generationOrder: 4, rank: 4, timing: { word: 'ladrar', confirmedMs: 12000 } },
      ],
      completedAt: '2026-11-03T10:00:00Z',
      totalGenerationTimeMs: 15000,
      rankingTimeMs: 8000,
      wordCount: 4,
    },
    {
      id: 'resp-p2',
      sessionId: 'sess-2',
      projectId: 'proj-test',
      stimulusId: 'stim-1',
      stimulusText: 'PERRO',
      associations: [
        { rawWord: 'lealtad', generationOrder: 1, rank: 1, timing: { word: 'lealtad', confirmedMs: 2500 } },
        { rawWord: 'fiel', generationOrder: 2, rank: 2, timing: { word: 'fiel', confirmedMs: 5000 } },
        { rawWord: 'carino', generationOrder: 3, rank: 3, timing: { word: 'carino', confirmedMs: 8000 } },
      ],
      completedAt: '2026-11-03T10:05:00Z',
      totalGenerationTimeMs: 12000,
      rankingTimeMs: 6000,
      wordCount: 3,
    },
    // Responses for GATO
    {
      id: 'resp-g1',
      sessionId: 'sess-1',
      projectId: 'proj-test',
      stimulusId: 'stim-2',
      stimulusText: 'GATO',
      associations: [
        { rawWord: 'independiente', generationOrder: 1, rank: 1, timing: { word: 'independiente', confirmedMs: 4000 } },
        { rawWord: 'carino', generationOrder: 2, rank: 2, timing: { word: 'carino', confirmedMs: 7000 } },
        { rawWord: 'maullar', generationOrder: 3, rank: 3, timing: { word: 'maullar', confirmedMs: 11000 } },
        { rawWord: 'compania', generationOrder: 4, rank: 4, timing: { word: 'compania', confirmedMs: 14000 } },
      ],
      completedAt: '2026-11-03T10:10:00Z',
      totalGenerationTimeMs: 16000,
      rankingTimeMs: 9000,
      wordCount: 4,
    },
    {
      id: 'resp-g2',
      sessionId: 'sess-2',
      projectId: 'proj-test',
      stimulusId: 'stim-2',
      stimulusText: 'GATO',
      associations: [
        { rawWord: 'agil', generationOrder: 1, rank: 1, timing: { word: 'agil', confirmedMs: 3000 } },
        { rawWord: 'independiente', generationOrder: 2, rank: 2, timing: { word: 'independiente', confirmedMs: 6000 } },
        { rawWord: 'carino', generationOrder: 3, rank: 3, timing: { word: 'carino', confirmedMs: 9000 } },
      ],
      completedAt: '2026-11-03T10:15:00Z',
      totalGenerationTimeMs: 13000,
      rankingTimeMs: 7000,
      wordCount: 3,
    },
  ];

  it('should generate complete psychometric reports for both stimuli and the comparative section', async () => {
    const report = await generateSemanticInterpretation({
      projectId: 'proj-test',
      stimuli: [stim1, stim2],
      responses: testResponses,
      rules: [],
      applyCorrections: true,
    });

    expect(report).toBeDefined();
    expect(report.projectId).toBe('proj-test');

    // Stimulus 1 Report Verification
    const r1 = report.stimulusReport1;
    expect(r1.stimulusText).toBe('PERRO');
    expect(r1.participantCount).toBe(2);
    expect(r1.valorJ).toBeGreaterThanOrEqual(4);
    expect(r1.semanticCores.centralWords.length).toBeGreaterThan(0);
    expect(r1.semanticCores.proposedSemanticFields.length).toBeGreaterThan(0);
    expect(r1.connotation.psychometricDisclaimer).toContain('Nota de rigor psicométrico');
    expect(r1.pathfinderAnalysis.metricDocumentation.wMeaning).toContain('fuerza asociativa');
    expect(r1.synthesis.length).toBeGreaterThan(50);

    // Stimulus 2 Report Verification
    const r2 = report.stimulusReport2;
    expect(r2.stimulusText).toBe('GATO');
    expect(r2.participantCount).toBe(2);
    expect(r2.valorJ).toBeGreaterThanOrEqual(4);
    expect(r2.semanticCores.centralWords.length).toBeGreaterThan(0);

    // Comparative Report Verification
    const comp = report.comparativeReport;
    expect(comp.quantitativeTable.sharedCount).toBeGreaterThan(0);
    expect(comp.quantitativeTable.jaccardIndex).toBeGreaterThan(0);
    expect(comp.sharedWordsAnalysis.text).toContain('palabras compartidas');
    expect(comp.comparativeSynthesis.length).toBeGreaterThan(100);
    expect(comp.limitations.length).toBeGreaterThanOrEqual(3);
  });

  it('should correctly partition shared words according to relative importance', async () => {
    const report = await generateSemanticInterpretation({
      projectId: 'proj-test',
      stimuli: [stim1, stim2],
      responses: testResponses,
      rules: [],
      applyCorrections: true,
    });

    const comp = report.comparativeReport;
    // 'carino' and 'compania' were evoked in both
    const allShared = [
      ...comp.sharedWordsAnalysis.similarImportance,
      ...comp.sharedWordsAnalysis.higherInStimulus1,
      ...comp.sharedWordsAnalysis.higherInStimulus2,
    ];

    expect(allShared.some(w => w.word === 'carino' || w.word === 'compania')).toBe(true);
  });

  it('should compute deterministic fingerprints and detect when responses change', () => {
    const fp1 = computeDataFingerprint(testResponses);
    const fp2 = computeDataFingerprint(testResponses);
    expect(fp1).toBe(fp2);

    const modified = [
      ...testResponses,
      {
        id: 'resp-new',
        sessionId: 'sess-3',
        projectId: 'proj-test',
        stimulusId: 'stim-1',
        stimulusText: 'PERRO',
        associations: [{ rawWord: 'protector', generationOrder: 1, rank: 1, timing: { word: 'protector', confirmedMs: 4000 } }],
        completedAt: '2026-11-03T11:00:00Z',
        totalGenerationTimeMs: 10000,
        rankingTimeMs: 5000,
        wordCount: 1,
      },
    ];

    const fp3 = computeDataFingerprint(modified);
    expect(fp3).not.toBe(fp1);
  });

  it('should handle disjoint networks (0 shared words) gracefully without crashing', async () => {
    const disjointResponses: StimulusResponse[] = [
      {
        id: 'resp-a',
        sessionId: 'sess-a',
        projectId: 'proj-test',
        stimulusId: 'stim-1',
        stimulusText: 'PERRO',
        associations: [{ rawWord: 'ladrar', generationOrder: 1, rank: 1, timing: { word: 'ladrar', confirmedMs: 3000 } }],
        completedAt: '2026-11-03T10:00:00Z',
        totalGenerationTimeMs: 5000,
        rankingTimeMs: 3000,
        wordCount: 1,
      },
      {
        id: 'resp-b',
        sessionId: 'sess-b',
        projectId: 'proj-test',
        stimulusId: 'stim-2',
        stimulusText: 'GATO',
        associations: [{ rawWord: 'maullar', generationOrder: 1, rank: 1, timing: { word: 'maullar', confirmedMs: 3000 } }],
        completedAt: '2026-11-03T10:00:00Z',
        totalGenerationTimeMs: 5000,
        rankingTimeMs: 3000,
        wordCount: 1,
      },
    ];

    const report = await generateSemanticInterpretation({
      projectId: 'proj-test',
      stimuli: [stim1, stim2],
      responses: disjointResponses,
      rules: [],
      applyCorrections: true,
    });

    expect(report.comparativeReport.quantitativeTable.sharedCount).toBe(0);
    expect(report.comparativeReport.quantitativeTable.jaccardIndex).toBe(0);
    expect(report.comparativeReport.limitations.length).toBeGreaterThan(0);
  });
});
