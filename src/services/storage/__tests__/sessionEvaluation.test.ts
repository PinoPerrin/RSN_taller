import { describe, it, expect } from 'vitest';
import { evaluateSessionStatus } from '../storageAdapter';
import { ParticipantSession, StimulusResponse, RawAssociation } from '../../../types';

const makeAssoc = (word: string, rank: number): RawAssociation => ({
  rawWord: word,
  canonicalWord: word,
  rank,
  generationOrder: rank,
  timing: {
    word,
    confirmedMs: rank * 1000,
  },
});

describe('evaluateSessionStatus', () => {
  const baseSession: ParticipantSession = {
    id: 'sess_1',
    projectId: 'proj_1',
    anonymousId: 'anon_123',
    status: 'started',
    consentAccepted: true,
    startedAt: '2026-11-04T10:00:00.000Z',
    flags: {
      visibilityLossCount: 0,
      suspiciousTiming: false,
      excludedByAdmin: false,
    },
  };

  it('identifies an empty session with 0 responses', () => {
    const result = evaluateSessionStatus(baseSession, [], 2);
    expect(result.isEmpty).toBe(true);
    expect(result.isCompleted).toBe(false);
    expect(result.isPartial).toBe(false);
    expect(result.answeredCount).toBe(0);
    expect(result.totalAssocs).toBe(0);
  });

  it('identifies a partial session when 1 of 2 stimuli answered', () => {
    const responses: StimulusResponse[] = [
      {
        id: 'resp_1',
        sessionId: 'sess_1',
        stimulusId: 'stim_1',
        stimulusText: 'ESTIMULO 1',
        projectId: 'proj_1',
        associations: [
          makeAssoc('amor', 1),
          makeAssoc('paz', 2),
        ],
        completedAt: '2026-11-04T10:02:00.000Z',
        totalGenerationTimeMs: 45000,
        rankingTimeMs: 15000,
        wordCount: 2,
      },
    ];

    const result = evaluateSessionStatus(baseSession, responses, 2);
    expect(result.isEmpty).toBe(false);
    expect(result.isCompleted).toBe(false);
    expect(result.isPartial).toBe(true);
    expect(result.answeredCount).toBe(1);
    expect(result.totalAssocs).toBe(2);
    expect(result.completedAt).toBe('2026-11-04T10:02:00.000Z');
    expect(result.durationSeconds).toBe(120); // 10:00:00 to 10:02:00 = 120s
  });

  it('identifies a completed session when all stimuli are answered even if session.status is "started"', () => {
    const responses: StimulusResponse[] = [
      {
        id: 'resp_1',
        sessionId: 'sess_1',
        stimulusId: 'stim_1',
        stimulusText: 'ESTIMULO 1',
        projectId: 'proj_1',
        associations: [
          makeAssoc('perro', 1),
          makeAssoc('fiel', 2),
        ],
        completedAt: '2026-11-04T10:02:00.000Z',
        totalGenerationTimeMs: 45000,
        rankingTimeMs: 15000,
        wordCount: 2,
      },
      {
        id: 'resp_2',
        sessionId: 'sess_1',
        stimulusId: 'stim_2',
        stimulusText: 'ESTIMULO 2',
        projectId: 'proj_1',
        associations: [
          makeAssoc('gato', 1),
          makeAssoc('ágil', 2),
        ],
        completedAt: '2026-11-04T10:04:30.000Z',
        totalGenerationTimeMs: 40000,
        rankingTimeMs: 12000,
        wordCount: 2,
      },
    ];

    // Status is 'started' (unhealed session)
    const result = evaluateSessionStatus(baseSession, responses, 2);
    expect(result.isEmpty).toBe(false);
    expect(result.isCompleted).toBe(true);
    expect(result.isPartial).toBe(false);
    expect(result.answeredCount).toBe(2);
    expect(result.totalAssocs).toBe(4);
    expect(result.completedAt).toBe('2026-11-04T10:04:30.000Z');
    expect(result.durationSeconds).toBe(270); // 4m 30s = 270s
  });

  it('respects explicitly completed session status', () => {
    const completedSession: ParticipantSession = {
      ...baseSession,
      status: 'completed',
      completedAt: '2026-11-04T10:05:00.000Z',
      totalDurationMs: 300000,
    };

    const responses: StimulusResponse[] = [
      {
        id: 'resp_1',
        sessionId: 'sess_1',
        stimulusId: 'stim_1',
        stimulusText: 'ESTIMULO 1',
        projectId: 'proj_1',
        associations: [makeAssoc('lealtad', 1)],
        completedAt: '2026-11-04T10:03:00.000Z',
        totalGenerationTimeMs: 30000,
        rankingTimeMs: 10000,
        wordCount: 1,
      },
    ];

    const result = evaluateSessionStatus(completedSession, responses, 1);
    expect(result.isCompleted).toBe(true);
    expect(result.isPartial).toBe(false);
    expect(result.isEmpty).toBe(false);
    expect(result.durationSeconds).toBe(300);
  });
});
