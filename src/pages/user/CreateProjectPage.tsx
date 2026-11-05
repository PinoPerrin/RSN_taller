import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserLayout } from '../../components/layout/UserLayout';
import { useAuth } from '../../context/AuthContext';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { Project, Stimulus, WeightingMethod, CutoffCriterion } from '../../types';
import {
  PlusCircle,
  FolderKanban,
  Trash2,
  Plus,
  ArrowRight,
  Sliders,
  Sparkles,
  Info,
  Clock,
  ListOrdered,
  CheckCircle2,
} from 'lucide-react';

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [researcher, setResearcher] = useState(profile?.nombre || user?.displayName || '');
  const [institution, setInstitution] = useState(profile?.institucion || '');

  // Stimuli
  const [stimuliTexts, setStimuliTexts] = useState<string[]>(['', '']);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(60);
  const [maxAssociations, setMaxAssociations] = useState(10);
  const [weightingMethod, setWeightingMethod] = useState<WeightingMethod>('canonical');
  const [defaultCutoffCriterion, setDefaultCutoffCriterion] = useState<CutoffCriterion>('scree_test');
  const [randomizeStimuli, setRandomizeStimuli] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddStimulus = () => {
    setStimuliTexts(prev => [...prev, '']);
  };

  const handleRemoveStimulus = (idx: number) => {
    if (stimuliTexts.length <= 1) return;
    setStimuliTexts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleStimulusChange = (idx: number, val: string) => {
    setStimuliTexts(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor escribe un título para el proyecto.');
      return;
    }

    const validStimuli = stimuliTexts.map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    if (validStimuli.length === 0) {
      setError('Debes ingresar al menos un concepto estímulo.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const publicId = `pub_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      const newProject: Project = {
        id: projectId,
        publicId,
        ownerUid: user?.uid,
        ownerEmail: user?.email || undefined,
        title: title.trim(),
        description: description.trim(),
        researcher: researcher.trim() || 'Investigador',
        institution: institution.trim() || 'Institución Académica',
        objective: 'Estudio de Redes Semánticas Naturales',
        language: 'es',
        privacyNotice: 'Los datos recolectados se utilizarán exclusivamente con fines de investigación académica.',
        consentText: 'Al participar en este estudio, acepto voluntariamente responder a los conceptos estímulo presentados.',
        welcomeMessage: 'Bienvenido. A continuación se te presentarán palabras estímulo para que escribas y jerarquices tus asociaciones.',
        thankYouMessage: '¡Muchas gracias por tu valiosa participación en este estudio semántico!',
        status: 'published',
        version: 1,
        settings: {
          maxAssociations,
          timeLimitSeconds,
          randomizeStimuli,
          allowMultiwordExpressions: false,
          weightingMethod,
          defaultCutoffCriterion,
          requireFullRanking: true,
          allowAnonymous: true,
          collectDemographics: false,
          demographicFields: [],
          includeCorrectionsInAnalysis: true,
        },
        createdAt: now,
        updatedAt: now,
      };

      // 1. Save project
      await storageAdapter.saveProject(newProject);

      // 2. Save stimuli
      for (let i = 0; i < validStimuli.length; i++) {
        const stim: Stimulus = {
          id: `stim_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          projectId,
          text: validStimuli[i],
          order: i + 1,
          timeLimitSeconds,
          maxAssociations,
        };
        await storageAdapter.saveStimulus(stim);
      }

      navigate(`/app/projects/${projectId}/live`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la red semántica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-primary-600" />
              <span>Nueva Red Semántica</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura tus conceptos estímulo y parámetros metodológicos para recolectar datos en vivo.
            </p>
          </div>
          <Link
            to="/app/projects"
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Identificación del Proyecto */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
              1. Datos Generales del Estudio
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Título del Estudio o Proyecto *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Ej. Redes Semánticas del Dolor y Sufrimiento en Adultos Jóvenes"
                className="w-full text-xs rounded-xl border border-slate-250 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Descripción o Justificación
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Breve resumen del objetivo de investigación o contexto académico..."
                className="w-full text-xs rounded-xl border border-slate-250 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Investigador(a) / Responsable
                </label>
                <input
                  type="text"
                  value={researcher}
                  onChange={e => setResearcher(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-250 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institución
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-250 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Estímulos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
                  2. Conceptos Estímulo a Evaluar
                </h2>
                <p className="text-xs text-slate-500">
                  Palabras o conceptos disparadores que verán los participantes (ej. DOLOR, ALIVIO).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddStimulus}
                className="px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border border-primary-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Concepto</span>
              </button>
            </div>

            <div className="space-y-3">
              {stimuliTexts.map((text, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center font-bold text-xs text-slate-400">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={text}
                    onChange={e => handleStimulusChange(idx, e.target.value)}
                    required
                    placeholder={`Concepto Estímulo #${idx + 1} (ej. ${idx === 0 ? 'DOLOR' : 'SUFRIMIENTO'})`}
                    className="flex-1 text-xs uppercase font-bold tracking-wide rounded-xl border border-slate-250 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {stimuliTexts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStimulus(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Eliminar concepto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {stimuliTexts.length === 2 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Modo dos estímulos:</strong> Se habilitará automáticamente la visualización Pathfinder con <strong>nodos bicolor</strong> y la <strong>interpretación semántica comparativa</strong> asistida por IA.
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Parámetros Metodológicos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
              3. Parámetros Metodológicos y Temporales
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tiempo límite por estímulo</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={15}
                    max={300}
                    value={timeLimitSeconds}
                    onChange={e => setTimeLimitSeconds(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-slate-250 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-xs text-slate-500 font-semibold">segundos</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Estándar metodológico: 60 seg.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
                  <span>Máximo de palabras definidoras</span>
                </label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={maxAssociations}
                  onChange={e => setMaxAssociations(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-250 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Recomendado: 10 palabras (m = 10).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ponderación de Rangos (VS)</span>
                </label>
                <select
                  value={weightingMethod}
                  onChange={e => setWeightingMethod(e.target.value as WeightingMethod)}
                  className="w-full text-xs rounded-xl border border-slate-250 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="canonical">Canónico: VS(r) = 11 - r</option>
                  <option value="proportional">Proporcional normalizado</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Canónico Valdez Medina (1998).</p>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                <input
                  type="checkbox"
                  checked={randomizeStimuli}
                  onChange={e => setRandomizeStimuli(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span>Aleatorizar el orden de presentación de los estímulos para cada participante</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to="/app/projects"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <span>Creando red...</span>
              ) : (
                <>
                  <span>Crear y Abrir Sala QR</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </UserLayout>
  );
};
