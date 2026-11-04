import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Project, Stimulus, RawAssociation, ParticipantSession, StimulusResponse } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { ensureAnonymousAuth } from '../../services/firebase';
import { WelcomePage } from './WelcomePage';
import { InstructionsPage } from './InstructionsPage';
import { GenerationPhase } from './GenerationPhase';
import { RankingPhase } from './RankingPhase';
import { ThankYouPage } from './ThankYouPage';
import { Loader2, AlertCircle, Lock } from 'lucide-react';

type ParticipantStage = 'welcome' | 'instructions' | 'generation' | 'ranking' | 'thankyou';

export const ParticipantContainer: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentStage, setCurrentStage] = useState<ParticipantStage>('welcome');
  const [currentStimulusIndex, setCurrentStimulusIndex] = useState(0);

  // Temporary state for the current stimulus
  const [currentGeneratedAssocs, setCurrentGeneratedAssocs] = useState<RawAssociation[]>([]);
  const [generationTimeMs, setGenerationTimeMs] = useState(0);

  // Anonymous session state
  const [session, setSession] = useState<ParticipantSession | null>(null);

  useEffect(() => {
    if (!projectId) {
      setError('Identificador de proyecto no proporcionado');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        await ensureAnonymousAuth();
        const proj = await storageAdapter.getProject(projectId);
        if (!proj) {
          setError('El estudio o proyecto solicitado no existe.');
          setLoading(false);
          return;
        }

        setProject(proj);

        // Fetch stimuli explicitly before ending loading state to avoid premature "Sin conceptos registrados"
        const stimList = await storageAdapter.getStimuli(proj.id);
        let list = [...stimList];
        if (proj.settings?.randomizeStimuli) {
          list.sort(() => Math.random() - 0.5);
        } else {
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
        }
        setStimuli(list);
        setLoading(false);

        // Subscribe to stimuli for subsequent real-time changes
        const unsubscribe = storageAdapter.subscribeStimuli(proj.id, updatedList => {
          if (updatedList && updatedList.length > 0) {
            let sorted = [...updatedList];
            if (proj.settings?.randomizeStimuli) {
              sorted.sort(() => Math.random() - 0.5);
            } else {
              sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
            }
            setStimuli(sorted);
          }
        });

        // Initialize Anonymous Session
        const anonId = `anon_${Math.random().toString(36).substring(2, 9)}`;
        const newSession: ParticipantSession = {
          id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          projectId: proj.id,
          anonymousId: anonId,
          status: 'started',
          consentAccepted: true,
          startedAt: new Date().toISOString(),
          flags: {
            visibilityLossCount: 0,
            suspiciousTiming: false,
            excludedByAdmin: false,
          },
        };
        setSession(newSession);
        await storageAdapter.createSession(newSession);

        return () => unsubscribe();
      } catch (err: any) {
        setError(err.message || 'Error cargando el estudio');
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Cargando estudio...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Estudio no disponible</h1>
        <p className="text-xs text-slate-600 mb-6">{error || 'No se pudo encontrar el proyecto especificado.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  // Check project status
  if (project.status === 'draft') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Estudio en Preparación</h1>
        <p className="text-xs text-slate-600">
          Este proyecto se encuentra actualmente en estado de borrador y aún no está abierto al público.
        </p>
      </div>
    );
  }

  if (project.status === 'paused') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Estudio Pausado</h1>
        <p className="text-xs text-slate-600">
          La recepción de nuevas participaciones se encuentra temporalmente suspendida por el administrador.
        </p>
      </div>
    );
  }

  if (project.status === 'closed' || project.status === 'archived') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Estudio Finalizado</h1>
        <p className="text-xs text-slate-600">
          El periodo de recolección de respuestas para esta investigación ha concluido. ¡Agradecemos tu interés!
        </p>
      </div>
    );
  }

  // Guard: Verify study has at least one stimulus configured
  if (stimuli.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Sin conceptos registrados</h1>
        <p className="text-xs text-slate-600 mb-6">
          Este estudio aún no tiene palabras estímulo o conceptos configurados por el administrador.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const currentStimulus = stimuli[currentStimulusIndex] || stimuli[0];

  // Stage Transitions
  const handleStartFromWelcome = () => {
    setCurrentStage('instructions');
  };

  const handleStartFromInstructions = () => {
    if (!stimuli || stimuli.length === 0) {
      setError('No hay conceptos registrados para este estudio.');
      return;
    }
    setCurrentStage('generation');
  };

  const handleGenerationComplete = (associations: RawAssociation[], totalTimeMs: number) => {
    setCurrentGeneratedAssocs(associations);
    setGenerationTimeMs(totalTimeMs);

    // If user generated 0 associations, transition immediately to next stimulus or completion
    if (associations.length === 0) {
      handleAdvanceStimulus();
      return;
    }

    setCurrentStage('ranking');
  };

  const handleRankingConfirm = async (rankedAssociations: RawAssociation[], rankingTimeMs: number) => {
    if (!session || !currentStimulus) return;

    const responseRecord: StimulusResponse = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.id,
      projectId: project.id,
      stimulusId: currentStimulus.id,
      stimulusText: currentStimulus.text,
      associations: rankedAssociations,
      completedAt: new Date().toISOString(),
      totalGenerationTimeMs: generationTimeMs,
      rankingTimeMs,
      wordCount: rankedAssociations.length,
    };

    // Save response securely
    await storageAdapter.submitResponse(responseRecord);

    // If this was the last stimulus, mark session completed in database
    if (currentStimulusIndex + 1 >= stimuli.length) {
      const completedAt = new Date().toISOString();
      const totalDurationMs = Math.max(1000, Date.now() - new Date(session.startedAt).getTime());
      try {
        await storageAdapter.completeSession(session.id, {
          projectId: project.id,
          completedAt,
          totalDurationMs,
        });
      } catch (e) {
        console.warn('Error completing session in storage:', e);
      }
    }

    handleAdvanceStimulus();
  };

  const handleAdvanceStimulus = () => {
    if (currentStimulusIndex + 1 < stimuli.length) {
      setCurrentStimulusIndex(prev => prev + 1);
      setCurrentGeneratedAssocs([]);
      setGenerationTimeMs(0);
      setCurrentStage('generation');
    } else {
      setCurrentStage('thankyou');
    }
  };

  return (
    <>
      {currentStage === 'welcome' && (
        <WelcomePage
          project={project}
          stimuli={stimuli}
          onStart={handleStartFromWelcome}
        />
      )}

      {currentStage === 'instructions' && (
        <InstructionsPage
          timeLimitSeconds={Math.max(10, currentStimulus?.timeLimitSeconds || project.settings?.timeLimitSeconds || 60)}
          maxAssociations={Math.max(1, currentStimulus?.maxAssociations || project.settings?.maxAssociations || 10)}
          onProceed={handleStartFromInstructions}
        />
      )}

      {currentStage === 'generation' && (
        currentStimulus ? (
          <GenerationPhase
            key={currentStimulus.id || `stim-${currentStimulusIndex}`}
            stimulus={currentStimulus}
            currentStimulusIndex={currentStimulusIndex}
            totalStimuli={stimuli.length}
            maxWords={Math.max(1, currentStimulus.maxAssociations || project.settings?.maxAssociations || 10)}
            timeLimitSeconds={Math.max(10, currentStimulus.timeLimitSeconds || project.settings?.timeLimitSeconds || 60)}
            onComplete={handleGenerationComplete}
          />
        ) : (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600">Cargando concepto...</p>
          </div>
        )
      )}

      {currentStage === 'ranking' && (
        currentStimulus ? (
          <RankingPhase
            key={`ranking-${currentStimulus.id}-${currentStimulusIndex}`}
            stimulus={currentStimulus}
            associations={currentGeneratedAssocs}
            currentStimulusIndex={currentStimulusIndex}
            totalStimuli={stimuli.length}
            onConfirm={handleRankingConfirm}
          />
        ) : (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600">Cargando jerarquización...</p>
          </div>
        )
      )}

      {currentStage === 'thankyou' && <ThankYouPage project={project} />}
    </>
  );
};
