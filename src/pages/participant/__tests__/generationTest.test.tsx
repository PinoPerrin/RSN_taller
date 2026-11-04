import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { GenerationPhase } from '../GenerationPhase';
import { InstructionsPage } from '../InstructionsPage';
import { WelcomePage } from '../WelcomePage';
import { ThankYouPage } from '../ThankYouPage';
import { RankingPhase } from '../RankingPhase';
import { INITIAL_PROJECT, INITIAL_STIMULI } from '../../../services/storage/mockData';

describe('Participant Flow Components SSR / Render test', () => {
  it('renders WelcomePage without crashing', () => {
    const html = renderToString(
      <WelcomePage
        project={INITIAL_PROJECT}
        stimuli={INITIAL_STIMULI}
        onStart={() => {}}
      />
    );
    expect(html).toContain('Taller de Redes Semánticas Naturales');
  });

  it('renders InstructionsPage without crashing', () => {
    const html = renderToString(
      <InstructionsPage
        timeLimitSeconds={60}
        maxAssociations={10}
        onProceed={() => {}}
      />
    );
    expect(html).toContain('Instrucciones de la Actividad');
  });

  it('renders GenerationPhase without crashing', () => {
    const html = renderToString(
      <GenerationPhase
        stimulus={INITIAL_STIMULI[0]}
        currentStimulusIndex={0}
        totalStimuli={3}
        maxWords={10}
        timeLimitSeconds={60}
        onComplete={() => {}}
      />
    );
    expect(html).toContain('DOLOR');
    expect(html).toContain('Fase 1: Asociación libre');
  });

  it('renders RankingPhase without crashing', () => {
    const html = renderToString(
      <RankingPhase
        stimulus={INITIAL_STIMULI[0]}
        associations={[
          { rawWord: 'ardor', generationOrder: 1, rank: 1, timing: { word: 'ardor', confirmedMs: 1000 } }
        ]}
        currentStimulusIndex={0}
        totalStimuli={3}
        onConfirm={() => {}}
      />
    );
    expect(html).toContain('DOLOR');
    expect(html).toContain('Fase 2: Jerarquización');
  });

  it('renders ThankYouPage without crashing', () => {
    const html = renderToString(
      <ThankYouPage project={INITIAL_PROJECT} />
    );
    expect(html).toContain('Participación Completada');
  });
});
