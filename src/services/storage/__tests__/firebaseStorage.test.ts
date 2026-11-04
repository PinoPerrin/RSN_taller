import { describe, it, expect } from 'vitest';
import { storageAdapter, localDB } from '../storageAdapter';
import { isFirebaseConfigured, firebaseConfig } from '../../firebase';
import { StimulusResponse, ParticipantSession, RawAssociation } from '../../../types';

const makeAssoc = (rawWord: string, rank: number, generationOrder: number = rank): RawAssociation => ({
  rawWord,
  canonicalWord: rawWord,
  rank,
  generationOrder,
  timing: {
    word: rawWord,
    confirmedMs: 1000 * generationOrder,
  },
});

describe('Firebase and Storage Integration Verification', () => {
  it('should have valid official Firebase configuration', () => {
    expect(isFirebaseConfigured).toBe(true);
    expect(firebaseConfig.projectId).toBe('rsn-taller');
    expect(firebaseConfig.authDomain).toBe('rsn-taller.firebaseapp.com');
    expect(firebaseConfig.apiKey).toBe('AIzaSyBPNnSIyw8v-Cz36VWS3hmht4SZDhTJ0h0');
    expect(firebaseConfig.storageBucket).toBe('rsn-taller.firebasestorage.app');
  });

  it('should retrieve default project and stimuli', async () => {
    const project = await storageAdapter.getProject('proj-taller-rsn');
    expect(project).toBeDefined();
    expect(project?.id).toBe('proj-taller-rsn');
    expect(project?.status).toBe('published');
  });

  it('should validate ranking bijection 1 to m without duplicates', async () => {
    const invalidResponse: StimulusResponse = {
      id: 'resp_test_invalid',
      sessionId: 'sess_test',
      projectId: 'proj-taller-rsn',
      stimulusId: 'stim-1',
      stimulusText: 'DOLOR',
      associations: [
        makeAssoc('tristeza', 1),
        makeAssoc('pena', 1), // DUPLICATE RANK
      ],
      completedAt: new Date().toISOString(),
      totalGenerationTimeMs: 5000,
      rankingTimeMs: 3000,
      wordCount: 2,
    };

    const res = await storageAdapter.submitResponse(invalidResponse);
    expect(res.success).toBe(false);
    expect(res.message).toContain('duplicadas');
  });

  it('should validate ranking completeness with no gaps', async () => {
    const gapResponse: StimulusResponse = {
      id: 'resp_test_gap',
      sessionId: 'sess_test',
      projectId: 'proj-taller-rsn',
      stimulusId: 'stim-1',
      stimulusText: 'DOLOR',
      associations: [
        makeAssoc('tristeza', 1),
        makeAssoc('pena', 3, 2), // GAP (missing rank 2)
      ],
      completedAt: new Date().toISOString(),
      totalGenerationTimeMs: 5000,
      rankingTimeMs: 3000,
      wordCount: 2,
    };

    const res = await storageAdapter.submitResponse(gapResponse);
    expect(res.success).toBe(false);
    expect(res.message).toContain('Falta la posición');
  });

  it('should correctly accept and store two distinct participant sessions and responses', async () => {
    // Participant 1
    const session1: ParticipantSession = {
      id: 'sess_participant_1',
      projectId: 'proj-taller-rsn',
      anonymousId: 'anon_user_1',
      status: 'started',
      consentAccepted: true,
      startedAt: new Date().toISOString(),
      flags: { visibilityLossCount: 0, suspiciousTiming: false, excludedByAdmin: false },
    };
    await storageAdapter.createSession(session1);

    const response1: StimulusResponse = {
      id: 'resp_p1_stim1',
      sessionId: session1.id,
      projectId: 'proj-taller-rsn',
      stimulusId: 'stim-1',
      stimulusText: 'DOLOR',
      associations: [
        makeAssoc('llanto', 1),
        makeAssoc('sufrimiento', 2),
      ],
      completedAt: new Date().toISOString(),
      totalGenerationTimeMs: 8000,
      rankingTimeMs: 4000,
      wordCount: 2,
    };
    const submit1 = await storageAdapter.submitResponse(response1);
    expect(submit1.success).toBe(true);

    // Participant 2 (Different session, different device)
    const session2: ParticipantSession = {
      id: 'sess_participant_2',
      projectId: 'proj-taller-rsn',
      anonymousId: 'anon_user_2',
      status: 'started',
      consentAccepted: true,
      startedAt: new Date().toISOString(),
      flags: { visibilityLossCount: 1, suspiciousTiming: false, excludedByAdmin: false },
    };
    await storageAdapter.createSession(session2);

    const response2: StimulusResponse = {
      id: 'resp_p2_stim1',
      sessionId: session2.id,
      projectId: 'proj-taller-rsn',
      stimulusId: 'stim-1',
      stimulusText: 'DOLOR',
      associations: [
        makeAssoc('enfermedad', 1),
        makeAssoc('tristeza', 2),
        makeAssoc('ardor', 3),
      ],
      completedAt: new Date().toISOString(),
      totalGenerationTimeMs: 12000,
      rankingTimeMs: 6000,
      wordCount: 3,
    };
    const submit2 = await storageAdapter.submitResponse(response2);
    expect(submit2.success).toBe(true);

    // Verify both responses are kept separated without mixing
    const allResponses = localDB.getResponses('proj-taller-rsn', 'stim-1');
    const p1Resp = allResponses.find(r => r.sessionId === 'sess_participant_1');
    const p2Resp = allResponses.find(r => r.sessionId === 'sess_participant_2');

    expect(p1Resp).toBeDefined();
    expect(p2Resp).toBeDefined();
    expect(p1Resp?.associations[0].rawWord).toBe('llanto');
    expect(p2Resp?.associations[0].rawWord).toBe('enfermedad');
    expect(p1Resp?.sessionId).not.toBe(p2Resp?.sessionId);
  }, 15000);

  it('should pause and resume a project properly via setProjectStatus', async () => {
    // 1. Pause project
    await storageAdapter.setProjectStatus('proj-taller-rsn', 'paused');
    const paused = await storageAdapter.getProject('proj-taller-rsn');
    expect(paused?.status).toBe('paused');

    // 2. Resume / publish project
    await storageAdapter.setProjectStatus('proj-taller-rsn', 'published');
    const published = await storageAdapter.getProject('proj-taller-rsn');
    expect(published?.status).toBe('published');
  });

  it('should create and list a new project via saveProject', async () => {
    const newProjId = 'proj-test-new-1';
    await storageAdapter.saveProject({
      id: newProjId,
      publicId: newProjId,
      title: 'Estudio de Prueba Creación',
      description: 'Descripción de prueba',
      researcher: 'Investigador',
      institution: 'UNAM',
      objective: 'Objetivo de prueba',
      language: 'es',
      privacyNotice: 'Aviso',
      consentText: 'Consentimiento',
      welcomeMessage: 'Bienvenida',
      thankYouMessage: 'Gracias',
      status: 'draft',
      version: 1,
      settings: {
        maxAssociations: 10,
        timeLimitSeconds: 60,
        randomizeStimuli: false,
        allowMultiwordExpressions: false,
        weightingMethod: 'canonical',
        defaultCutoffCriterion: 'scree_test',
        requireFullRanking: true,
        allowAnonymous: true,
        collectDemographics: false,
        demographicFields: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const retrieved = await storageAdapter.getProject(newProjId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Estudio de Prueba Creación');

    // Verify it is present in localDB projects list
    const allProjects = localDB.getProjects();
    const found = allProjects.find(p => p.id === newProjId);
    expect(found).toBeDefined();
  });

  it('should fetch stimuli for a project and delete a project permanently without resurrection', async () => {
    const projToDelete = 'proj-test-to-delete';
    await storageAdapter.saveProject({
      id: projToDelete,
      publicId: projToDelete,
      title: 'Estudio Temporal para Eliminar',
      description: 'Prueba de eliminación permanente',
      researcher: 'Investigador',
      institution: 'Laboratorio',
      objective: 'Objetivo',
      language: 'es',
      privacyNotice: 'Aviso',
      consentText: 'Consentimiento',
      welcomeMessage: 'Bienvenida',
      thankYouMessage: 'Gracias',
      status: 'draft',
      version: 1,
      settings: {
        maxAssociations: 10,
        timeLimitSeconds: 60,
        randomizeStimuli: false,
        allowMultiwordExpressions: false,
        weightingMethod: 'canonical',
        defaultCutoffCriterion: 'scree_test',
        requireFullRanking: true,
        allowAnonymous: true,
        collectDemographics: false,
        demographicFields: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await storageAdapter.saveStimulus({
      id: 'stim-del-1',
      projectId: projToDelete,
      text: 'PERRO',
      order: 1,
    });

    const stimsBefore = await storageAdapter.getStimuli(projToDelete);
    expect(stimsBefore.length).toBeGreaterThan(0);
    expect(stimsBefore[0].text).toBe('PERRO');

    // Delete the project
    await storageAdapter.deleteProject(projToDelete);

    // Verify it cannot be retrieved by getProject
    const afterDelete = await storageAdapter.getProject(projToDelete);
    expect(afterDelete).toBeNull();

    // Verify it does not appear in localDB
    const inLocal = localDB.getProjects().find(p => p.id === projToDelete);
    expect(inLocal).toBeUndefined();

    // Verify getStimuli returns empty
    const stimsAfter = await storageAdapter.getStimuli(projToDelete);
    expect(stimsAfter).toEqual([]);
  });
});
