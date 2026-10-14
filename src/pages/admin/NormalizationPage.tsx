import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Project, Stimulus, StimulusResponse, NormalizationRule } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  SpellCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';

export const NormalizationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string>('');
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  // New Rule Form
  const [rawFormInput, setRawFormInput] = useState('');
  const [canonicalInput, setCanonicalInput] = useState('');
  const [reasonInput, setReasonInput] = useState('Sinonimia denotativa');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    storageAdapter.getProject(projectId).then(setProject);
    const unsubStim = storageAdapter.subscribeStimuli(projectId, list => {
      setStimuli(list);
      if (list.length > 0 && !selectedStimulusId) setSelectedStimulusId(list[0].id);
    });
    const unsubRules = storageAdapter.subscribeRules(projectId, setRules);

    return () => {
      unsubStim();
      unsubRules();
    };
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

  // Extract raw word frequency vocabulary from responses
  const rawWordFrequencies = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of responses) {
      for (const a of r.associations) {
        const text = a.rawWord.trim().toLowerCase();
        if (text) {
          map.set(text, (map.get(text) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .map(([word, freq]) => ({ word, freq }))
      .sort((a, b) => b.freq - a.freq);
  }, [responses]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawFormInput.trim() || !canonicalInput.trim() || !projectId) return;

    const newRule: NormalizationRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      rawForm: rawFormInput.trim().toLowerCase(),
      canonicalForm: canonicalInput.trim().toLowerCase(),
      author: project?.researcher || 'Administrador',
      reason: reasonInput,
      createdAt: new Date().toISOString(),
      active: true,
    };

    await storageAdapter.saveRule(newRule);
    setRawFormInput('');
    setCanonicalInput('');
    setIsAdding(false);
  };

  const handleDeleteRule = async (ruleId: string) => {
    await storageAdapter.deleteRule(ruleId);
  };

  const handleQuickPropose = (word: string) => {
    setRawFormInput(word);
    setCanonicalInput(word);
    setIsAdding(true);
  };

  return (
    <AdminLayout activeProjectId={projectId}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-extrabold uppercase tracking-wider">
                Auditoría Semántica
              </span>
              <span className="text-xs text-slate-400 font-medium">
                (Control léxico no destructivo)
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Normalización y Limpieza de Asociaciones
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administra equivalencias y lematizaciones conservando los datos originales inalterables
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Regla de Equivalencia</span>
          </button>
        </div>

        {/* Warning Alert: Methodology */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">Advertencia Metodológica (Reyes-Lagunes, 1993, p. 85):</p>
            <p className="leading-relaxed">
              La unificación de sinónimos o variantes gramaticales conserva el significado denotativo pero puede
              alterar la carga connotativa original que el sujeto atribuyó espontáneamente. Toda regla registrada es
              auditable y reversible.
            </p>
          </div>
        </div>

        {/* Create Rule Drawer / Form */}
        {isAdding && (
          <form
            onSubmit={handleAddRule}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <h3 className="font-bold text-slate-900 text-sm">Nueva Regla de Normalización Semántica</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Forma Original (Variante)</label>
                <input
                  type="text"
                  required
                  placeholder="ej. lastimarse, mamá, cuate"
                  value={rawFormInput}
                  onChange={e => setRawFormInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Forma Canónica (Lema destino)</label>
                <input
                  type="text"
                  required
                  placeholder="ej. lastimar, madre, amigo"
                  value={canonicalInput}
                  onChange={e => setCanonicalInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Justificación Metodológica</label>
                <select
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="Sinonimia denotativa">Sinonimia denotativa</option>
                  <option value="Corrección ortográfica">Corrección ortográfica</option>
                  <option value="Unificación singular/plural">Unificación singular/plural</option>
                  <option value="Variante flexiva verbal">Variante flexiva verbal</option>
                  <option value="Modismo o regionalismo">Modismo o regionalismo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-xs"
              >
                Guardar y Aplicar Regla
              </button>
            </div>
          </form>
        )}

        {/* Dual Layout: Vocabulary Inspection and Active Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Raw Vocabulary in Responses */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Vocabulario Bruto Registrado</h3>
                <p className="text-[11px] text-slate-400">Palabras escritas por los participantes</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                {rawWordFrequencies.length} palabras
              </span>
            </div>

            <div className="max-h-[460px] overflow-y-auto space-y-1.5 pr-1">
              {rawWordFrequencies.map(item => {
                const existingRule = rules.find(r => r.rawForm === item.word);

                return (
                  <div
                    key={item.word}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{item.word}</span>
                      <span className="text-slate-400 text-[10px] ml-2">frecuencia: {item.freq}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {existingRule ? (
                        <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          → {existingRule.canonicalForm}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickPropose(item.word)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                        >
                          Crear regla
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Active Equivalence Rules */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Diccionario de Reglas Activas</h3>
                <p className="text-[11px] text-slate-400">Transformaciones aplicadas al análisis</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                {rules.length} reglas
              </span>
            </div>

            <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
              {rules.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No hay reglas de equivalencia definidas aún.
                </div>
              ) : (
                rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          "{rule.rawForm}"
                        </span>
                        <span className="text-slate-400 font-bold">➔</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          "{rule.canonicalForm}"
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Motivo: <strong>{rule.reason}</strong> • Registrado por {rule.author}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Eliminar y revertir regla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
