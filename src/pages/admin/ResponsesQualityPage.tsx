import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ParticipantSession, StimulusResponse, Stimulus } from '../../types';
import { storageAdapter, localDB } from '../../services/storage/storageAdapter';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  EyeOff,
  Filter,
  Search,
  UserX,
  UserCheck,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

export const ResponsesQualityPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [sessions, setSessions] = useState<ParticipantSession[]>([]);
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'flagged' | 'excluded'>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Exclusion modal
  const [excludingSession, setExcludingSession] = useState<ParticipantSession | null>(null);
  const [exclusionReason, setExclusionReason] = useState('');

  const currentProjectId = projectId || 'proj-taller-rsn';

  useEffect(() => {
    const unsubSessions = storageAdapter.subscribeSessions(currentProjectId, setSessions);
    const unsubResponses = storageAdapter.subscribeResponses(currentProjectId, undefined, setResponses);
    const unsubStimuli = storageAdapter.subscribeStimuli(currentProjectId, setStimuli);

    return () => {
      unsubSessions();
      unsubResponses();
      unsubStimuli();
    };
  }, [currentProjectId]);

  // Overall Quality Metrics
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const completionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

  const totalWordsProduced = responses.reduce((acc, r) => acc + r.associations.length, 0);
  const avgWordsPerResponse = responses.length > 0 ? (totalWordsProduced / responses.length).toFixed(1) : '0';

  const flaggedSessions = sessions.filter(
    s => s.flags?.visibilityLossCount > 2 || s.flags?.suspiciousTiming
  );
  const excludedSessions = sessions.filter(s => s.flags?.excludedByAdmin);

  // Filtered Sessions List
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.anonymousId.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'completed') return s.status === 'completed' && !s.flags?.excludedByAdmin;
    if (statusFilter === 'flagged') return s.flags?.suspiciousTiming || s.flags?.visibilityLossCount > 2;
    if (statusFilter === 'excluded') return s.flags?.excludedByAdmin;
    return true;
  });

  const handleToggleExclude = (session: ParticipantSession) => {
    if (session.flags?.excludedByAdmin) {
      // Re-include
      storageAdapter.updateSessionFlags(session.id, {
        excludedByAdmin: false,
        exclusionReason: undefined,
      });
    } else {
      // Open modal for reason
      setExcludingSession(session);
      setExclusionReason('Incumplimiento de criterios temporales o atencionales');
    }
  };

  const confirmExclusion = async () => {
    if (!excludingSession) return;
    await storageAdapter.updateSessionFlags(excludingSession.id, {
      excludedByAdmin: true,
      exclusionReason: exclusionReason.trim() || 'Exclusión manual por investigador',
    });
    setExcludingSession(null);
  };

  return (
    <AdminLayout activeProjectId={currentProjectId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-600" />
              Auditoría de Participantes y Calidad de Datos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de tiempos de respuesta, atención, banderas de atipicidad y exclusión metodológica reversible.
            </p>
          </div>
        </div>

        {/* Quality Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tasa de Finalización
            </span>
            <p className="text-2xl font-black text-slate-900">{completionRate.toFixed(1)}%</p>
            <p className="text-[11px] text-slate-500 font-medium">
              {completedSessions.length} de {totalSessions} iniciaron y completaron
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Media de Palabras
            </span>
            <p className="text-2xl font-black text-slate-900">{avgWordsPerResponse}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              palabras / estímulo (esperado: 5 a 10)
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Alertas de Atención
            </span>
            <p className="text-2xl font-black text-amber-600">{flaggedSessions.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              cambios de pestaña o tiempos atípicos
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Excluidos del Análisis
            </span>
            <p className="text-2xl font-black text-rose-600">{excludedSessions.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              preservados en BD sin alterar cálculo
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por código anónimo de participante..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'completed', 'flagged', 'excluded'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' && `Todos (${sessions.length})`}
                {tab === 'completed' && `Completos (${completedSessions.length})`}
                {tab === 'flagged' && `Con Alertas (${flaggedSessions.length})`}
                {tab === 'excluded' && `Excluidos (${excludedSessions.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="py-3 px-4">Participante</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Tiempos y Atención</th>
                  <th className="py-3 px-4">Respuestas</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No se encontraron participantes bajo los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map(session => {
                    const sessionResponses = responses.filter(r => r.sessionId === session.id);
                    const isExpanded = expandedSessionId === session.id;
                    const isExcluded = session.flags?.excludedByAdmin;
                    const hasFlags = session.flags?.visibilityLossCount > 2 || session.flags?.suspiciousTiming;

                    return (
                      <React.Fragment key={session.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${isExcluded ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{session.anonymousId}</span>
                              {isExcluded && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                  Excluido
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-sans font-normal block mt-0.5">
                              {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                session.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : session.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {session.status === 'completed' ? 'Finalizado' : 'En progreso'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  {session.totalDurationMs
                                    ? `${(session.totalDurationMs / 1000).toFixed(0)} seg total`
                                    : 'En curso'}
                                </span>
                              </div>
                              {hasFlags && (
                                <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>
                                    {session.flags.visibilityLossCount > 0 &&
                                      `${session.flags.visibilityLossCount} salidas de pestaña`}
                                    {session.flags.suspiciousTiming && ' • Tiempos < 1s'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900">
                              {sessionResponses.length}
                            </span>
                            <span className="text-slate-400 font-normal"> / {stimuli.length} estímulos</span>
                            <div className="text-[11px] text-slate-500">
                              {sessionResponses.reduce((acc, r) => acc + r.associations.length, 0)} asociaciones
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium inline-flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Ocultar' : 'Detalle'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            <button
                              onClick={() => handleToggleExclude(session)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors ${
                                isExcluded
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              }`}
                              title={isExcluded ? 'Reincorporar participante al análisis' : 'Excluir del análisis'}
                            >
                              {isExcluded ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>Reactivar</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3 h-3" />
                                  <span>Excluir</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Row with Associations Detail */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={5} className="p-4 border-t border-slate-100">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                                    Desglose de Asociaciones Registradas
                                  </h4>
                                  {isExcluded && (
                                    <span className="text-xs text-rose-600 font-medium italic">
                                      Motivo de exclusión: "{session.flags?.exclusionReason}"
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {sessionResponses.map(resp => (
                                    <div
                                      key={resp.id}
                                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-xs text-primary-700">
                                          {resp.stimulusText}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {(resp.totalGenerationTimeMs / 1000).toFixed(1)}s gen • {(resp.rankingTimeMs / 1000).toFixed(1)}s jerarq
                                        </span>
                                      </div>

                                      <div className="space-y-1">
                                        {resp.associations.map(assoc => (
                                          <div
                                            key={assoc.rank}
                                            className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-100"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="w-4 h-4 rounded bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                                                {assoc.rank}
                                              </span>
                                              <span className="font-semibold text-slate-800 uppercase">
                                                {assoc.rawWord}
                                              </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                              {(assoc.timing.confirmedMs / 1000).toFixed(1)}s
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exclusion Reason Modal */}
        {excludingSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Excluir Participante del Análisis
                </h3>
              </div>

              <p className="text-xs text-slate-600">
                El participante <strong className="font-mono">{excludingSession.anonymousId}</strong> será
                omitido del cálculo de los indicadores grupales (J, M, FMG, SAM, Grafos). Sus datos
                permanecen íntegros en el registro y la exclusión es reversible.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Motivo Metodológico:</label>
                <textarea
                  rows={3}
                  value={exclusionReason}
                  onChange={e => setExclusionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setExcludingSession(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmExclusion}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Confirmar Exclusión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
