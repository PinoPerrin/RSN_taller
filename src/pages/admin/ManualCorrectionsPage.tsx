import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, Stimulus, StimulusResponse, NormalizationRule } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Edit3,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Search,
  Sparkles,
  Save,
  RotateCcw,
  Users,
  Layers,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Network,
} from 'lucide-react';

interface WordRow {
  originalWord: string;
  normalizedOriginal: string;
  frequency: number;
  ranks: number[];
  currentCorrection: string;
  isModified: boolean;
  participantCount: number;
}

export const ManualCorrectionsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const currentProjectId = projectId || '';

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string>('all');
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  // Toggle for including corrections in analyses
  const [includeInAnalysis, setIncludeInAnalysis] = useState<boolean>(true);

  // View state
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'participants'>('vocabulary');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'corrected' | 'uncorrected'>('all');

  // Draft corrections map: originalWordLower -> correctedWord
  const [correctionsDraft, setCorrectionsDraft] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Load project, stimuli, responses, and rules
  useEffect(() => {
    storageAdapter.getProject(currentProjectId).then(p => {
      if (p) {
        setProject(p);
        if (p.settings?.includeCorrectionsInAnalysis !== undefined) {
          setIncludeInAnalysis(p.settings.includeCorrectionsInAnalysis);
        }
      }
    });

    const unsubStim = storageAdapter.subscribeStimuli(currentProjectId, list => {
      setStimuli(list);
    });

    const unsubResp = storageAdapter.subscribeResponses(currentProjectId, undefined, setResponses);
    const unsubRules = storageAdapter.subscribeRules(currentProjectId, setRules);

    return () => {
      unsubStim();
      unsubResp();
      unsubRules();
    };
  }, [currentProjectId]);

  // Sync draft corrections from existing responses and rules
  useEffect(() => {
    const map: Record<string, string> = {};

    // 1. Load from pre-existing rules
    rules.forEach(r => {
      if (r.active && r.rawForm && r.canonicalForm) {
        map[r.rawForm.trim().toLowerCase()] = r.canonicalForm.trim().toLowerCase();
      }
    });

    // 2. Load from canonicalWord in responses
    responses.forEach(resp => {
      resp.associations.forEach(assoc => {
        const orig = assoc.rawWord.trim().toLowerCase();
        if (assoc.canonicalWord && assoc.canonicalWord.trim()) {
          map[orig] = assoc.canonicalWord.trim().toLowerCase();
        }
      });
    });

    setCorrectionsDraft(map);
  }, [responses, rules]);

  // Filter responses by selected stimulus
  const targetResponses = useMemo(() => {
    if (selectedStimulusId === 'all') return responses;
    return responses.filter(r => r.stimulusId === selectedStimulusId);
  }, [responses, selectedStimulusId]);

  // Extract unique words from target responses
  const vocabularyRows = useMemo<WordRow[]>(() => {
    const map = new Map<string, {
      originalWord: string;
      frequency: number;
      ranks: number[];
      sessions: Set<string>;
    }>();

    targetResponses.forEach(resp => {
      resp.associations.forEach(assoc => {
        const norm = assoc.rawWord.trim().toLowerCase();
        if (!norm) return;

        let entry = map.get(norm);
        if (!entry) {
          entry = {
            originalWord: assoc.rawWord.trim(),
            frequency: 0,
            ranks: [],
            sessions: new Set<string>(),
          };
          map.set(norm, entry);
        }

        entry.frequency += 1;
        entry.ranks.push(assoc.rank);
        entry.sessions.add(resp.sessionId || resp.id);
      });
    });

    const rows: WordRow[] = [];
    map.forEach((entry, normKey) => {
      const correction = correctionsDraft[normKey] || '';
      rows.push({
        originalWord: entry.originalWord,
        normalizedOriginal: normKey,
        frequency: entry.frequency,
        ranks: entry.ranks,
        currentCorrection: correction,
        isModified: Boolean(correction && correction !== normKey),
        participantCount: entry.sessions.size,
      });
    });

    // Sort by frequency descending (most frequent words first)
    return rows.sort((a, b) => b.frequency - a.frequency);
  }, [targetResponses, correctionsDraft]);

  // Filter rows by search and correction filter mode
  const filteredVocabulary = useMemo(() => {
    return vocabularyRows.filter(row => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        row.originalWord.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.currentCorrection.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Mode filter
      if (filterMode === 'corrected') return row.isModified;
      if (filterMode === 'uncorrected') return !row.isModified;
      return true;
    });
  }, [vocabularyRows, searchQuery, filterMode]);

  // Stats
  const totalUniqueWords = vocabularyRows.length;
  const totalCorrectedWords = vocabularyRows.filter(r => r.isModified).length;
  const totalAssociationsCount = targetResponses.reduce((acc, r) => acc + r.associations.length, 0);

  // Handle inline correction text change
  const handleWordChange = (normKey: string, newValue: string) => {
    setCorrectionsDraft(prev => ({
      ...prev,
      [normKey]: newValue.trim().toLowerCase(),
    }));
  };

  // Revert single word correction
  const handleRevertWord = (normKey: string) => {
    setCorrectionsDraft(prev => {
      const next = { ...prev };
      delete next[normKey];
      return next;
    });
  };

  // Quick single-word save
  const handleSaveSingleWord = async (originalWord: string, normKey: string) => {
    const correction = correctionsDraft[normKey] || '';
    setSaveStatus('saving');
    try {
      await storageAdapter.saveManualWordCorrection(
        currentProjectId,
        normKey,
        correction
      );
      setSaveStatus('saved');
      setStatusMessage(`"${originalWord}" actualizada correctamente.`);
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setStatusMessage('Ocurrió un error al guardar la corrección.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Master Save All Corrections
  const handleSaveAllCorrections = async () => {
    setSaveStatus('saving');
    try {
      for (const row of vocabularyRows) {
        const correction = correctionsDraft[row.normalizedOriginal] || '';
        await storageAdapter.saveManualWordCorrection(
          currentProjectId,
          row.normalizedOriginal,
          correction
        );
      }
      setSaveStatus('saved');
      setStatusMessage('¡Todas las correcciones se guardaron y aplicaron exitosamente!');
      setTimeout(() => setSaveStatus('idle'), 3500);
    } catch {
      setSaveStatus('error');
      setStatusMessage('Error al guardar algunas correcciones.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Toggle "Incluir correcciones en los análisis"
  const handleToggleIncludeInAnalysis = async () => {
    const nextVal = !includeInAnalysis;
    setIncludeInAnalysis(nextVal);
    setSaveStatus('saving');
    try {
      await storageAdapter.setIncludeCorrectionsInAnalysis(currentProjectId, nextVal);
      setSaveStatus('saved');
      setStatusMessage(
        nextVal
          ? 'Correcciones ACTIVADAS en todos los análisis y reportes.'
          : 'Correcciones DESACTIVADAS. Los análisis ahora usan las palabras originales.'
      );
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setStatusMessage('Error al cambiar el estado del análisis.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Revert all corrections
  const handleRevertAll = async () => {
    if (!window.confirm('¿Seguro que deseas restablecer todas las correcciones manuales y volver al texto original de los participantes?')) {
      return;
    }
    setSaveStatus('saving');
    try {
      for (const row of vocabularyRows) {
        await storageAdapter.saveManualWordCorrection(currentProjectId, row.normalizedOriginal, '');
      }
      setCorrectionsDraft({});
      setSaveStatus('saved');
      setStatusMessage('Se han restablecido todas las palabras al texto original.');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setStatusMessage('Error al restablecer correcciones.');
    }
  };

  return (
    <AdminLayout activeProjectId={currentProjectId}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Edit3 className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Corrección Manual de Respuestas
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Edita y unifica fácilmente las palabras escritas por los participantes para el taller de mañana sin necesidad de configurar reglas lingüísticas complejas.
            </p>
          </div>

          {/* Quick Analysis Navigation Link */}
          <div className="flex items-center gap-2">
            <Link
              to={`/admin/projects/${currentProjectId}/traditional`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <Network className="w-4 h-4 text-primary-600" />
              <span>Ver Análisis RSN</span>
            </Link>
          </div>
        </div>

        {/* Master Control Card: "Incluir correcciones en los análisis" */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-indigo-100/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900">
                  Incluir correcciones en los análisis
                </span>
                {includeInAnalysis ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ACTIVADO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-700 border border-slate-300">
                    <XCircle className="w-3.5 h-3.5" />
                    DESACTIVADO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                {includeInAnalysis
                  ? 'Las palabras corregidas se están utilizando automáticamente en el cálculo de Valor M, FMG, Núcleo de Red, Conjuntos SAM, Red Pathfinder, Gráficos y Exportaciones.'
                  : 'Los análisis están mostrando las palabras originales tal como las teclearon los alumnos, ignorando las correcciones.'}
              </p>
            </div>

            <button
              onClick={handleToggleIncludeInAnalysis}
              className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all flex-shrink-0 ${
                includeInAnalysis
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              {includeInAnalysis ? (
                <>
                  <ToggleRight className="w-5 h-5 text-emerald-200" />
                  <span>Correcciones Activas</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                  <span>Activar Correcciones</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback status banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                saveStatus === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {saveStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
                <span>{statusMessage}</span>
              </div>
              <button onClick={() => setStatusMessage('')} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
          )}

          {/* KPI Mini-Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Respuestas
              </span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{targetResponses.length}</p>
              <p className="text-[11px] text-slate-500">{totalAssociationsCount} palabras totales</p>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vocabulario Único
              </span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{totalUniqueWords}</p>
              <p className="text-[11px] text-slate-500">palabras distintas</p>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Palabras Corregidas
              </span>
              <p className="text-xl font-black text-indigo-600 mt-0.5">{totalCorrectedWords}</p>
              <p className="text-[11px] text-indigo-700 font-medium">
                {totalUniqueWords > 0 ? `${Math.round((totalCorrectedWords / totalUniqueWords) * 100)}% unificadas` : '0%'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Estado en Análisis
              </span>
              <p
                className={`text-xl font-black mt-0.5 ${
                  includeInAnalysis ? 'text-emerald-600' : 'text-slate-600'
                }`}
              >
                {includeInAnalysis ? 'Aplicadas' : 'Originales'}
              </p>
              <p className="text-[11px] text-slate-500">en toda la plataforma</p>
            </div>
          </div>
        </div>

        {/* Stimulus Selector & View Mode Switcher */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Stimulus Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 mr-1 flex-shrink-0">
                Concepto:
              </span>
              <button
                onClick={() => setSelectedStimulusId('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                  selectedStimulusId === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Todos los conceptos
              </button>
              {stimuli.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStimulusId(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                    selectedStimulusId === s.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {s.text}
                </button>
              ))}
            </div>

            {/* View switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl flex-shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('vocabulary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'vocabulary'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Vista por Vocabulario (Recomendada)
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'participants'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Vista por Participante
              </button>
            </div>
          </div>

          {/* Search, Filter Mode and Global Save Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar palabra original o corregida..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter mode chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({vocabularyRows.length})
              </button>
              <button
                onClick={() => setFilterMode('corrected')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  filterMode === 'corrected'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Corregidas ({totalCorrectedWords})
              </button>
              <button
                onClick={() => setFilterMode('uncorrected')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  filterMode === 'uncorrected'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sin Corregir ({totalUniqueWords - totalCorrectedWords})
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRevertAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors"
                title="Restablecer todas las correcciones"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              <button
                onClick={handleSaveAllCorrections}
                disabled={saveStatus === 'saving'}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveStatus === 'saving' ? 'Guardando...' : 'Guardar todo'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* View 1: Fast Vocabulary Table (Default & Recommended) */}
        {activeTab === 'vocabulary' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Diccionario Rápido de Palabras ({filteredVocabulary.length} mostradas)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Escribe la palabra corregida en el campo. Se aplicará automáticamente a todas las respuestas de todos los participantes.
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Presiona Enter o haz clic en ✓ para guardar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-6">Palabra Original (Participantes)</th>
                    <th className="py-3 px-4 text-center">Frecuencia</th>
                    <th className="py-3 px-4 text-center">Jerarquías</th>
                    <th className="py-3 px-2 text-center"></th>
                    <th className="py-3 px-6">Palabra Corregida / Unificada</th>
                    <th className="py-3 px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredVocabulary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Edit3 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-bold text-slate-600">No hay palabras que coincidan</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Prueba cambiando el filtro de búsqueda o el concepto seleccionado.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredVocabulary.map(row => {
                      const isCorrected = row.isModified;
                      return (
                        <tr
                          key={row.normalizedOriginal}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCorrected ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          {/* Original Word */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm font-mono">
                                {row.originalWord}
                              </span>
                              {isCorrected && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                  Modificada
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {row.participantCount} {row.participantCount === 1 ? 'participante' : 'participantes'}
                            </span>
                          </td>

                          {/* Frequency */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-xs bg-slate-100 text-slate-800">
                              {row.frequency}
                            </span>
                          </td>

                          {/* Hierarchy positions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap max-w-xs mx-auto">
                              {Array.from(new Set(row.ranks))
                                .sort((a, b) => a - b)
                                .slice(0, 5)
                                .map(r => (
                                  <span
                                    key={r}
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      r === 1
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    #{r}
                                  </span>
                                ))}
                              {row.ranks.length > 5 && (
                                <span className="text-[10px] text-slate-400">+{row.ranks.length - 5}</span>
                              )}
                            </div>
                          </td>

                          {/* Arrow indicator */}
                          <td className="py-3.5 px-2 text-center text-slate-300">
                            <ArrowRight className="w-4 h-4 mx-auto" />
                          </td>

                          {/* Editable Correction Input */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2 max-w-md">
                              <input
                                type="text"
                                value={correctionsDraft[row.normalizedOriginal] ?? ''}
                                placeholder={row.originalWord}
                                onChange={e => handleWordChange(row.normalizedOriginal, e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleSaveSingleWord(row.originalWord, row.normalizedOriginal);
                                  }
                                }}
                                className={`w-full px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                                  isCorrected
                                    ? 'bg-white border-indigo-400 text-indigo-900 focus:ring-2 focus:ring-indigo-500 shadow-xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 focus:bg-white focus:border-indigo-400'
                                }`}
                              />
                              {isCorrected && (
                                <button
                                  onClick={() => handleRevertWord(row.normalizedOriginal)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                                  title="Revertir a original"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Individual Save Action */}
                          <td className="py-3.5 px-6 text-right">
                            <button
                              onClick={() => handleSaveSingleWord(row.originalWord, row.normalizedOriginal)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg font-bold text-xs transition-colors"
                              title="Guardar esta palabra"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Guardar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 2: Detailed Participant View */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Vista por Participante:</span> Cada tarjeta representa las palabras que un alumno escribió y jerarquizó. Puedes editar palabras específicas de un participante si deseas una corrección puntual.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {targetResponses.map((resp, rIdx) => (
                <div
                  key={resp.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Participante #{rIdx + 1}
                      </span>
                      <p className="font-mono text-xs text-slate-700 font-semibold truncate max-w-[140px]">
                        ID: {resp.sessionId?.slice(-6) || resp.id.slice(-6)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {resp.stimulusText}
                    </span>
                  </div>

                  {/* List of associations */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {resp.associations.map(assoc => {
                      const norm = assoc.rawWord.trim().toLowerCase();
                      const corrected = correctionsDraft[norm] || assoc.canonicalWord || '';
                      const isModified = Boolean(corrected && corrected !== norm);

                      return (
                        <div
                          key={`${assoc.generationOrder}_${assoc.rawWord}`}
                          className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                            isModified
                              ? 'bg-indigo-50/40 border-indigo-200'
                              : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                                assoc.rank === 1
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {assoc.rank}
                            </span>
                            <span className="font-bold text-slate-800">{assoc.rawWord}</span>
                          </div>

                          {/* Quick correction chip */}
                          {isModified ? (
                            <span className="inline-flex items-center gap-1 font-bold text-indigo-700 text-[11px]">
                              → {corrected}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sin cambio</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManualCorrectionsPage;
