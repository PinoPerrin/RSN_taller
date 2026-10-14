import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Project, Stimulus, StimulusResponse, RawAssociation } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { calculateTraditionalRSN } from '../../services/math/rsnTraditional';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Radio,
  Users,
  Activity,
  Sparkles,
  Play,
  RotateCcw,
  Clock,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';

export const LiveMonitorPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string>('');
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    storageAdapter.getProject(projectId).then(setProject);
    const unsubStim = storageAdapter.subscribeStimuli(projectId, list => {
      setStimuli(list);
      if (list.length > 0 && !selectedStimulusId) setSelectedStimulusId(list[0].id);
    });

    return () => unsubStim();
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !selectedStimulusId) return;
    const unsubResp = storageAdapter.subscribeResponses(
      projectId,
      selectedStimulusId,
      setResponses
    );
    return () => unsubResp();
  }, [projectId, selectedStimulusId]);

  const currentStimulus = stimuli.find(s => s.id === selectedStimulusId);

  // Live Traditional Analysis
  const liveAnalysis = useMemo(() => {
    if (responses.length === 0) return null;
    return calculateTraditionalRSN(responses, [], true);
  }, [responses]);

  // Recent incoming stream
  const incomingWords = useMemo(() => {
    const list: { word: string; time: string; rank: number; session: string }[] = [];
    for (let i = responses.length - 1; i >= 0; i--) {
      const resp = responses[i];
      for (const a of resp.associations) {
        list.push({
          word: a.rawWord,
          time: new Date(resp.completedAt).toLocaleTimeString(),
          rank: a.rank,
          session: resp.sessionId.slice(-4),
        });
        if (list.length >= 25) break;
      }
      if (list.length >= 25) break;
    }
    return list;
  }, [responses]);

  // Simulate incoming test participant
  const handleSimulateParticipant = async () => {
    if (!project || !currentStimulus) return;
    setIsSimulating(true);

    const samplePools: Record<string, string[]> = {
      DOLOR: ['ardor', 'miedo', 'cansancio', 'sufrimiento', 'tristeza', 'enfermedad', 'pena', 'llanto', 'herida', 'sangre'],
      SUFRIMIENTO: ['tristeza', 'llanto', 'angustia', 'soledad', 'desesperación', 'dolor', 'duelo', 'pena', 'depresión'],
      BIENESTAR: ['salud', 'paz', 'felicidad', 'alegría', 'tranquilidad', 'familia', 'amor', 'descanso', 'armonía'],
    };

    const pool = samplePools[currentStimulus.text.toUpperCase()] || ['concepto', 'idea', 'asociación', 'mente', 'pensamiento'];
    // Pick 3 to 6 random words
    const count = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);

    const associations: RawAssociation[] = shuffled.map((word, idx) => ({
      rawWord: word,
      generationOrder: idx + 1,
      rank: idx + 1,
      timing: {
        word,
        confirmedMs: (idx + 1) * 3500,
      },
    }));

    const simResponse: StimulusResponse = {
      id: `sim_resp_${Date.now()}`,
      sessionId: `sim_sess_${Math.random().toString(36).substring(2, 6)}`,
      projectId: project.id,
      stimulusId: currentStimulus.id,
      stimulusText: currentStimulus.text,
      associations,
      completedAt: new Date().toISOString(),
      totalGenerationTimeMs: 25000,
      rankingTimeMs: 10000,
      wordCount: associations.length,
    };

    await storageAdapter.submitResponse(simResponse);
    setTimeout(() => setIsSimulating(false), 300);
  };

  return (
    <AdminLayout activeProjectId={projectId}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-rose-600">
                Monitoreo en Tiempo Real
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Sala en Vivo del Taller
            </h1>
            <p className="text-xs text-slate-500">
              Observa cómo se reciben las respuestas de los participantes y se actualizan los pesos M al instante
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stimulus Selector */}
            <div className="relative">
              <select
                value={selectedStimulusId}
                onChange={e => setSelectedStimulusId(e.target.value)}
                className="bg-white text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 pr-8 border border-slate-200 shadow-xs focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
              >
                {stimuli.map(s => (
                  <option key={s.id} value={s.id}>
                    Estímulo: {s.text}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Simulation button */}
            <button
              onClick={handleSimulateParticipant}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Simula una respuesta entrante de un participante para pruebas"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simular Respuesta</span>
            </button>
          </div>
        </div>

        {/* Live Counters Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Respuestas Recibidas
            </span>
            <p className="text-3xl font-black text-slate-900">{responses.length}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Estímulo activo: "{currentStimulus?.text}"
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Riqueza Léxica (Valor J)
            </span>
            <p className="text-3xl font-black text-primary-600">{liveAnalysis?.valorJ || 0}</p>
            <p className="text-[10px] text-slate-400 mt-1">Definidoras únicas</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Peso Semántico Máximo
            </span>
            <p className="text-3xl font-black text-slate-900">{liveAnalysis?.maxM || 0}</p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              Palabra líder: {liveAnalysis?.definidoras[0]?.word || '—'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Núcleo Identificado
            </span>
            <p className="text-3xl font-black text-indigo-600">
              {liveAnalysis?.nucleoSet.length || 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Corte Scree Test</p>
          </div>
        </div>

        {/* Two Column Live Grid: Leaderboard + Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard: Top Definidoras */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Definidoras Principales en Vivo (Conjunto SAM)
                </h3>
                <p className="text-xs text-slate-400">Actualizado dinámicamente con cada confirmación</p>
              </div>
              <span className="text-xs font-mono font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg">
                Top 10
              </span>
            </div>

            <div className="space-y-2">
              {liveAnalysis?.samSet.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Esperando que los participantes confirmen sus respuestas...
                </div>
              ) : (
                liveAnalysis?.samSet.map((d, idx) => (
                  <div
                    key={d.word}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-all"
                  >
                    <span className="w-6 font-mono font-black text-slate-400 text-xs text-center">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm capitalize">
                          {d.word}
                        </span>
                        {d.isNucleo && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            Núcleo
                          </span>
                        )}
                      </div>
                      {/* Bar indicator */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-primary-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${d.valorFMG}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-sm text-slate-900">M = {d.valorM}</p>
                      <p className="text-[10px] text-slate-400">FMG: {d.valorFMG}%</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stream of Incoming Words */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Flujo de Asociaciones</h3>
                <p className="text-[11px] text-slate-400">Últimas palabras recibidas</p>
              </div>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
              {incomingWords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Sin eventos recientes
                </div>
              ) : (
                incomingWords.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-white text-slate-700 font-mono font-bold text-[10px] flex items-center justify-center border border-slate-200">
                        {item.rank}
                      </span>
                      <span className="font-bold text-slate-800 capitalize">{item.word}</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
