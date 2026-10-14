import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Project, Stimulus, StimulusResponse, NormalizationRule } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { calculateTraditionalRSN, calculateICG, calculatePearsonMCorrelation } from '../../services/math/rsnTraditional';
import { calculateModernGraph } from '../../services/math/graphAnalysis';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { GitCompare, ChevronDown, CheckCircle2, ArrowRight, Layers, Award } from 'lucide-react';

export const NetworkComparisonPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [stimulusIdA, setStimulusIdA] = useState<string>('');
  const [stimulusIdB, setStimulusIdB] = useState<string>('');

  const [responsesA, setResponsesA] = useState<StimulusResponse[]>([]);
  const [responsesB, setResponsesB] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  useEffect(() => {
    if (!projectId) return;

    storageAdapter.getProject(projectId).then(setProject);
    const unsubStim = storageAdapter.subscribeStimuli(projectId, list => {
      setStimuli(list);
      if (list.length >= 2) {
        setStimulusIdA(list[0].id);
        setStimulusIdB(list[1].id);
      } else if (list.length === 1) {
        setStimulusIdA(list[0].id);
        setStimulusIdB(list[0].id);
      }
    });
    const unsubRules = storageAdapter.subscribeRules(projectId, setRules);

    return () => {
      unsubStim();
      unsubRules();
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !stimulusIdA) return;
    const unsub = storageAdapter.subscribeResponses(projectId, stimulusIdA, setResponsesA);
    return () => unsub();
  }, [projectId, stimulusIdA]);

  useEffect(() => {
    if (!projectId || !stimulusIdB) return;
    const unsub = storageAdapter.subscribeResponses(projectId, stimulusIdB, setResponsesB);
    return () => unsub();
  }, [projectId, stimulusIdB]);

  // Analysis A
  const rsnA = useMemo(() => {
    if (responsesA.length === 0) return null;
    return calculateTraditionalRSN(responsesA, rules, true);
  }, [responsesA, rules]);

  const graphA = useMemo(() => {
    if (responsesA.length === 0) return null;
    return calculateModernGraph(responsesA, rules, true, 1);
  }, [responsesA, rules]);

  // Analysis B
  const rsnB = useMemo(() => {
    if (responsesB.length === 0) return null;
    return calculateTraditionalRSN(responsesB, rules, true);
  }, [responsesB, rules]);

  const graphB = useMemo(() => {
    if (responsesB.length === 0) return null;
    return calculateModernGraph(responsesB, rules, true, 1);
  }, [responsesB, rules]);

  // Comparative Sets
  const wordsA = useMemo(() => new Set(rsnA?.definidoras.map(d => d.word) || []), [rsnA]);
  const wordsB = useMemo(() => new Set(rsnB?.definidoras.map(d => d.word) || []), [rsnB]);

  const sharedWords = useMemo(() => {
    const shared: string[] = [];
    wordsA.forEach(w => {
      if (wordsB.has(w)) shared.push(w);
    });
    return shared;
  }, [wordsA, wordsB]);

  const exclusiveA = useMemo(() => {
    const exclusive: string[] = [];
    wordsA.forEach(w => {
      if (!wordsB.has(w)) exclusive.push(w);
    });
    return exclusive;
  }, [wordsA, wordsB]);

  const exclusiveB = useMemo(() => {
    const exclusive: string[] = [];
    wordsB.forEach(w => {
      if (!wordsA.has(w)) exclusive.push(w);
    });
    return exclusive;
  }, [wordsA, wordsB]);

  const icg = useMemo(() => calculateICG(wordsA, wordsB), [wordsA, wordsB]);

  const pearsonR = useMemo(() => {
    if (!rsnA || !rsnB) return 0;
    return calculatePearsonMCorrelation(rsnA.definidoras, rsnB.definidoras);
  }, [rsnA, rsnB]);

  const stimA = stimuli.find(s => s.id === stimulusIdA);
  const stimB = stimuli.find(s => s.id === stimulusIdB);

  return (
    <AdminLayout activeProjectId={projectId}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[11px] font-extrabold uppercase tracking-wider">
                Módulo Comparativo
              </span>
              <span className="text-xs text-slate-400 font-medium">
                (Contraste clásico y topológico de estímulos)
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Comparación de Redes Semánticas
            </h1>
          </div>

          {/* Stimuli Selectors */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <div className="relative">
              <select
                value={stimulusIdA}
                onChange={e => setStimulusIdA(e.target.value)}
                className="bg-white text-slate-900 text-xs font-bold rounded-xl px-3 py-2 pr-7 border border-slate-200 shadow-xs outline-none cursor-pointer"
              >
                {stimuli.map(s => (
                  <option key={s.id} value={s.id}>
                    Red A: {s.text}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-3 pointer-events-none" />
            </div>

            <span className="text-slate-400 font-black">VS</span>

            <div className="relative">
              <select
                value={stimulusIdB}
                onChange={e => setStimulusIdB(e.target.value)}
                className="bg-white text-slate-900 text-xs font-bold rounded-xl px-3 py-2 pr-7 border border-slate-200 shadow-xs outline-none cursor-pointer"
              >
                {stimuli.map(s => (
                  <option key={s.id} value={s.id}>
                    Red B: {s.text}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Global Comparative Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Palabras Compartidas
            </span>
            <p className="text-2xl font-black text-emerald-600">{sharedWords.length}</p>
            <p className="text-[10px] text-slate-500">
              de {wordsA.size + wordsB.size - sharedWords.length} términos únicos totales
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Consenso Grupal (ICG)
            </span>
            <p className="text-2xl font-black text-slate-900">{icg}%</p>
            <p className="text-[10px] text-slate-500">Similitud de vocabulario de Jaccard</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Correlación Perfiles (r)
            </span>
            <p className="text-2xl font-black text-indigo-600">{pearsonR}</p>
            <p className="text-[10px] text-slate-500">Pearson sobre pesos semánticos M</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Diferencia Tamaño (ΔJ)
            </span>
            <p className="text-2xl font-black text-slate-900">
              {Math.abs((rsnA?.valorJ || 0) - (rsnB?.valorJ || 0))}
            </p>
            <p className="text-[10px] text-slate-500">
              J(A)={rsnA?.valorJ || 0} vs J(B)={rsnB?.valorJ || 0}
            </p>
          </div>
        </div>

        {/* Dual Panel Side-by-Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel A */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-600">
                  Red A
                </span>
                <h3 className="text-xl font-black text-slate-900">{stimA?.text}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-700">N = {rsnA?.participantCount || 0}</span>
                <p className="text-[10px] text-slate-400">participantes</p>
              </div>
            </div>

            {/* Metrics summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Valor J</p>
                <p className="text-base font-black text-slate-900">{rsnA?.valorJ || 0}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">M Máximo</p>
                <p className="text-base font-black text-primary-600">{rsnA?.maxM || 0}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Núcleo</p>
                <p className="text-base font-black text-indigo-600">{rsnA?.nucleoSet.length || 0}</p>
              </div>
            </div>

            {/* Words List with Shared/Exclusive badges */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700">Top Definidoras en Red A:</p>
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                {rsnA?.definidoras.slice(0, 15).map(d => {
                  const isShared = wordsB.has(d.word);
                  return (
                    <div
                      key={d.word}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium border ${
                        isShared
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold'
                          : 'bg-white border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">#{d.rankDistribution ? 1 : ''}</span>
                        <span>{d.word}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">M={d.valorM}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            isShared
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isShared ? 'COMPARTIDA' : 'EXCLUSIVA'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Panel B */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">
                  Red B
                </span>
                <h3 className="text-xl font-black text-slate-900">{stimB?.text}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-700">N = {rsnB?.participantCount || 0}</span>
                <p className="text-[10px] text-slate-400">participantes</p>
              </div>
            </div>

            {/* Metrics summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Valor J</p>
                <p className="text-base font-black text-slate-900">{rsnB?.valorJ || 0}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">M Máximo</p>
                <p className="text-base font-black text-indigo-600">{rsnB?.maxM || 0}</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Núcleo</p>
                <p className="text-base font-black text-emerald-600">{rsnB?.nucleoSet.length || 0}</p>
              </div>
            </div>

            {/* Words List with Shared/Exclusive badges */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700">Top Definidoras en Red B:</p>
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                {rsnB?.definidoras.slice(0, 15).map(d => {
                  const isShared = wordsA.has(d.word);
                  return (
                    <div
                      key={d.word}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium border ${
                        isShared
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold'
                          : 'bg-white border-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">#{d.rankDistribution ? 1 : ''}</span>
                        <span>{d.word}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">M={d.valorM}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            isShared
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isShared ? 'COMPARTIDA' : 'EXCLUSIVA'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
