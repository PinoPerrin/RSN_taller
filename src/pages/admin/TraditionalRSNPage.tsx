import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, Stimulus, StimulusResponse, NormalizationRule, DefinidoraStats } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { calculateTraditionalRSN } from '../../services/math/rsnTraditional';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Info,
  TrendingDown,
  Layers,
  Award,
  Hash,
  Users,
  SlidersHorizontal,
  ChevronDown,
  HelpCircle,
  Eye,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const TraditionalRSNPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string>('');
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  // View & Analysis Settings
  const [applyNormalization, setApplyNormalization] = useState(true);
  const [sortColumn, setSortColumn] = useState<keyof DefinidoraStats>('valorM');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTab, setSelectedTab] = useState<'table' | 'scree' | 'radar'>('table');
  const [infoModalKey, setInfoModalKey] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    storageAdapter.getProject(projectId).then(setProject);
    const unsubStim = storageAdapter.subscribeStimuli(projectId, list => {
      setStimuli(list);
      if (list.length > 0 && !selectedStimulusId) {
        setSelectedStimulusId(list[0].id);
      }
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

  // Compute Traditional RSN Indicators
  const analysis = useMemo(() => {
    if (responses.length === 0) return null;
    return calculateTraditionalRSN(
      responses,
      rules,
      applyNormalization,
      project?.settings.weightingMethod || 'canonical',
      project?.settings.maxAssociations || 10,
      10
    );
  }, [responses, rules, applyNormalization, project]);

  // Sorted Definidoras
  const sortedDefinidoras = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.definidoras].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'desc' ? valB - valA : valA - valB;
      }
      return sortDirection === 'desc'
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });
  }, [analysis, sortColumn, sortDirection]);

  const handleSort = (column: keyof DefinidoraStats) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const currentStimulus = stimuli.find(s => s.id === selectedStimulusId);

  // Scree Chart Data
  const screeChartData = useMemo(() => {
    if (!analysis) return [];
    return analysis.definidoras.map((d, idx) => ({
      index: idx + 1,
      word: d.word,
      valorM: d.valorM,
      isCutoff: idx + 1 === analysis.screeCutoffIndex,
      isNucleo: d.isNucleo,
    }));
  }, [analysis]);

  // Radar / Spider Chart Data (Vargas-Garduño et al., 2014)
  const radarChartData = useMemo(() => {
    if (!analysis) return [];
    return analysis.nucleoSet.map(d => ({
      word: d.word,
      fmg: d.valorFMG,
    }));
  }, [analysis]);

  return (
    <AdminLayout activeProjectId={projectId}>
      <div className="space-y-6">
        {/* Top Header & Stimulus Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 rounded-md text-[11px] font-extrabold uppercase tracking-wider">
                Tradición RSN Mexicana
              </span>
              <span className="text-xs text-slate-400 font-medium">
                (Figueroa et al., Reyes-Lagunes, Valdez Medina)
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Análisis Tradicional de RSN
            </h1>
          </div>

          {/* Controls: Stimulus Selector & Normalization Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Stimulus Dropdown */}
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

            {/* Normalization Toggle */}
            <button
              onClick={() => setApplyNormalization(!applyNormalization)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                applyNormalization
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
              title="Alternar aplicación de reglas del diccionario semántico"
            >
              {applyNormalization ? (
                <ToggleRight className="w-4 h-4 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-slate-400" />
              )}
              <span>{applyNormalization ? 'Normalizado' : 'Datos brutos'}</span>
            </button>
          </div>
        </div>

        {/* Traditional Metrics Dashboard Cards */}
        {analysis && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* 1. Participantes N */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Muestra (N)</span>
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{analysis.participantCount}</p>
              <p className="text-[10px] text-slate-400">Participantes analizados</p>
            </div>

            {/* 2. Valor J (Tamaño de la Red) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1 relative group">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Valor J (TR)</span>
                <button
                  type="button"
                  onClick={() => setInfoModalKey('valorJ')}
                  className="text-slate-400 hover:text-primary-600"
                  title="Definición y fórmula"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-2xl font-black text-primary-600">{analysis.valorJ}</p>
              <p className="text-[10px] text-slate-500">Definidoras únicas totales</p>
            </div>

            {/* 3. Valor M Máximo */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">M Máximo (PS)</span>
                <button
                  type="button"
                  onClick={() => setInfoModalKey('valorM')}
                  className="text-slate-400 hover:text-primary-600"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-2xl font-black text-slate-900">{analysis.maxM}</p>
              <p className="text-[10px] text-slate-500 truncate">
                Palabra: <strong>{analysis.definidoras[0]?.word}</strong>
              </p>
            </div>

            {/* 4. Núcleo de la Red (Scree Test) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Núcleo (NR)</span>
                <button
                  type="button"
                  onClick={() => setInfoModalKey('nucleo')}
                  className="text-slate-400 hover:text-primary-600"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-2xl font-black text-indigo-600">{analysis.nucleoSet.length}</p>
              <p className="text-[10px] text-slate-500">Palabras en quiebre asintótico</p>
            </div>

            {/* 5. Valor G (Dispersión SAM) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Valor G</span>
                <button
                  type="button"
                  onClick={() => setInfoModalKey('valorG')}
                  className="text-slate-400 hover:text-primary-600"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-2xl font-black text-slate-900">{analysis.valorG}</p>
              <p className="text-[10px] text-slate-500">Gradiente de caída SAM</p>
            </div>
          </div>
        )}

        {/* Main Tabbed Analysis Area */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Tab Navigation */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTab('table')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTab === 'table'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tabla Canónica de Definidoras
              </button>
              <button
                onClick={() => setSelectedTab('scree')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTab === 'scree'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Curva Scree Test (Cattell)
              </button>
              <button
                onClick={() => setSelectedTab('radar')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTab === 'radar'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Gráfico Radial de Distancias (FMG)
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Esquema de Ponderación:{' '}
              <span className="font-bold text-slate-800">
                {project?.settings.weightingMethod === 'proportional' ? 'Proporcional' : 'Canónico (10 a 1)'}
              </span>
            </div>
          </div>

          {/* TAB 1: Canonical Results Table */}
          {selectedTab === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-6 cursor-pointer hover:text-slate-900" onClick={() => handleSort('word')}>
                      Definidora {sortColumn === 'word' && (sortDirection === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('frequency')}>
                      Frecuencia (FA) {sortColumn === 'frequency' && (sortDirection === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('valorM')}>
                      Peso Semántico (M) {sortColumn === 'valorM' && (sortDirection === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('valorFMG')}>
                      FMG % (DSC) {sortColumn === 'valorFMG' && (sortDirection === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('meanRank')}>
                      Jerarquía Media (r̄) {sortColumn === 'meanRank' && (sortDirection === 'desc' ? '▼' : '▲')}
                    </th>
                    <th className="py-3 px-4 text-center">Conjunto SAM</th>
                    <th className="py-3 px-6 text-center">Núcleo de Red</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {sortedDefinidoras.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No hay respuestas registradas para este concepto todavía.
                      </td>
                    </tr>
                  ) : (
                    sortedDefinidoras.map((def, idx) => (
                      <tr key={def.word} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono text-[11px] w-5">#{idx + 1}</span>
                            <span className="text-sm">{def.word}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                          {def.frequency}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-primary-700 text-sm">
                          {def.valorM}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                          {def.valorFMG.toFixed(2)}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                          {def.meanRank.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {def.isSAM ? (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-extrabold border border-indigo-200">
                              SAM
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          {def.isNucleo ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-extrabold border border-emerald-200">
                              Núcleo
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Scree Test Chart */}
          {selectedTab === 'scree' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">Criterio de Punto de Quiebre (Scree Test)</p>
                  <p className="text-slate-500">
                    Corte asintótico identificado en la posición{' '}
                    <strong>#{analysis?.screeCutoffIndex}</strong> (Núcleo conformado por{' '}
                    <strong>{analysis?.nucleoSet.length}</strong> palabras).
                  </p>
                </div>
              </div>

              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={screeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="index"
                      label={{ value: 'Rango de definidora (orden descendente)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                    />
                    <YAxis label={{ value: 'Peso Semántico (M)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, _name: any, item: any) => [
                        `${val} puntos (FMG: ${item.payload.valorM})`,
                        `#${item.payload.index} ${item.payload.word}`,
                      ]}
                    />
                    {analysis && analysis.screeCutoffIndex > 0 && (
                      <ReferenceLine
                        x={analysis.screeCutoffIndex}
                        stroke="#059669"
                        strokeDasharray="4 4"
                        label={{
                          value: `Punto de Quiebre (#${analysis.screeCutoffIndex})`,
                          position: 'top',
                          fill: '#059669',
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="valorM"
                      stroke="#0e8ce9"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#0e8ce9' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 3: Radial / Spider Chart */}
          {selectedTab === 'radar' && (
            <div className="p-6 space-y-4">
              <div className="text-center max-w-sm mx-auto">
                <p className="font-bold text-slate-800 text-sm">
                  Gráfica Radial de Distancias Semánticas FMG %
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualización de telaraña según la tradición de Vargas-Garduño et al. (2014) y Reyes-Lagunes (1993)
                </p>
              </div>

              <div className="h-96 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="word" tick={{ fill: '#334155', fontSize: 12, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" />
                    <Radar
                      name="FMG %"
                      dataKey="fmg"
                      stroke="#0e8ce9"
                      fill="#38a8f8"
                      fillOpacity={0.4}
                    />
                    <Tooltip formatter={(val: any) => [`${val}%`, 'Distancia Semántica (FMG)']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Modal for Indicators */}
      {infoModalKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {infoModalKey === 'valorJ' && 'Valor J — Tamaño de la Red (TR)'}
                {infoModalKey === 'valorM' && 'Valor M — Peso Semántico (PS)'}
                {infoModalKey === 'nucleo' && 'Núcleo de la Red (NR) — Scree Test'}
                {infoModalKey === 'valorG' && 'Valor G — Densidad / Dispersión del SAM'}
              </h3>
              <button
                onClick={() => setInfoModalKey(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              {infoModalKey === 'valorJ' && (
                <>
                  <p>
                    <strong>Definición:</strong> Número total de palabras definidoras diferentes producidas por el grupo para el estímulo.
                  </p>
                  <p className="font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                    J = |V| = total de definidoras únicas
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Fuente: Figueroa et al. (1981, p. 113); Reyes Lagunes (1993, p. 83); Valdez Medina (2005, p. 72).
                  </p>
                </>
              )}

              {infoModalKey === 'valorM' && (
                <>
                  <p>
                    <strong>Definición:</strong> Peso semántico obtenido sumando el producto de la frecuencia en cada posición por el valor ponderado (escala de 10 a 1).
                  </p>
                  <p className="font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                    M(j) = Σ f(j, r) × (11 - r)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Fuente: Reyes Lagunes (1993, pp. 83–84); Valdez Medina (2005, pp. 72–73).
                  </p>
                </>
              )}

              {infoModalKey === 'nucleo' && (
                <>
                  <p>
                    <strong>Definición:</strong> Subconjunto de definidoras delimitado por el punto de quiebre (Scree Test de Cattell) donde la pendiente se vuelve asintótica respecto al eje horizontal.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Fuente: Cattell (1952); Reyes Lagunes (1993, p. 84); Vera-Noriega et al. (2005, p. 447).
                  </p>
                </>
              )}

              {infoModalKey === 'valorG' && (
                <>
                  <p>
                    <strong>Definición:</strong> Promedio de las diferencias sucesivas entre los valores M de las 10 definidoras del conjunto SAM.
                  </p>
                  <p className="font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                    G = (M₁ - M₁₀) / 9
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Fuente: Figueroa et al. (1981b, citado en Valdez Medina, 2005, p. 78).
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
