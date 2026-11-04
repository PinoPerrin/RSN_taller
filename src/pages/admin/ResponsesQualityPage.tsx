import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ParticipantSession, StimulusResponse, Stimulus } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  UserX,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const ResponsesQualityPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [sessions, setSessions] = useState<ParticipantSession[]>([]);
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'flagged' | 'excluded' | 'empty'>('all');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Exclusion modal
  const [excludingSession, setExcludingSession] = useState<ParticipantSession | null>(null);
  const [exclusionReason, setExclusionReason] = useState('');

  // Delete modal (single session)
  const [deletingSession, setDeletingSession] = useState<ParticipantSession | null>(null);

  // Bulk delete empty sessions modal
  const [showDeleteEmptyModal, setShowDeleteEmptyModal] = useState(false);

  // Loading state for actions
  const [isActionLoading, setIsActionLoading] = useState(false);

  const currentProjectId = projectId || '';

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

  // Format date and time deterministically: DD/MM/YYYY HH:mm:ss
  const formatFullDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
    } catch {
      return '—';
    }
  };

  // Check if a session has no responses or 0 associations
  const isSessionEmpty = (sessionId: string) => {
    const sResps = responses.filter(r => r.sessionId === sessionId);
    if (sResps.length === 0) return true;
    const totalAssoc = sResps.reduce((acc, r) => acc + (r.associations?.length || 0), 0);
    return totalAssoc === 0;
  };

  // Overall Quality Metrics
  const totalSessions = sessions.length;
  const emptySessions = sessions.filter(s => isSessionEmpty(s.id));
  const completedSessions = sessions.filter(s => s.status === 'completed' && !s.flags?.excludedByAdmin && !isSessionEmpty(s.id));
  const completionRate = totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

  const totalWordsProduced = responses.reduce((acc, r) => acc + (r.associations?.length || 0), 0);
  const avgWordsPerResponse = responses.length > 0 ? (totalWordsProduced / responses.length).toFixed(1) : '0';

  const flaggedSessions = sessions.filter(
    s => s.flags?.visibilityLossCount > 2 || s.flags?.suspiciousTiming
  );
  const excludedSessions = sessions.filter(s => s.flags?.excludedByAdmin);

  // Filtered Sessions List
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.anonymousId.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'completed') return s.status === 'completed' && !s.flags?.excludedByAdmin && !isSessionEmpty(s.id);
    if (statusFilter === 'flagged') return s.flags?.suspiciousTiming || s.flags?.visibilityLossCount > 2;
    if (statusFilter === 'excluded') return s.flags?.excludedByAdmin;
    if (statusFilter === 'empty') return isSessionEmpty(s.id);
    return true;
  });

  // Handle Exclusion Toggle (Methodological: keeps record but excludes from calculation)
  const handleToggleExclude = async (session: ParticipantSession) => {
    if (session.flags?.excludedByAdmin) {
      // Re-include immediately
      try {
        await storageAdapter.updateSessionFlags(
          session.id,
          {
            excludedByAdmin: false,
            exclusionReason: '',
          },
          currentProjectId
        );
        // Immediate local state update
        setSessions(prev =>
          prev.map(s =>
            s.id === session.id
              ? { ...s, flags: { ...s.flags, excludedByAdmin: false, exclusionReason: undefined } }
              : s
          )
        );
      } catch (err) {
        console.error('Error re-incorporating session:', err);
      }
    } else {
      // Open modal to specify reason
      setExcludingSession(session);
      setExclusionReason('Incumplimiento de criterios temporales o atencionales');
    }
  };

  const confirmExclusion = async () => {
    if (!excludingSession) return;
    const reason = exclusionReason.trim() || 'Exclusión manual por investigador';
    try {
      setIsActionLoading(true);
      await storageAdapter.updateSessionFlags(
        excludingSession.id,
        {
          excludedByAdmin: true,
          exclusionReason: reason,
        },
        currentProjectId
      );
      // Immediate local state update
      setSessions(prev =>
        prev.map(s =>
          s.id === excludingSession.id
            ? { ...s, flags: { ...s.flags, excludedByAdmin: true, exclusionReason: reason } }
            : s
        )
      );
    } catch (err) {
      console.error('Error excluding session:', err);
    } finally {
      setIsActionLoading(false);
      setExcludingSession(null);
    }
  };

  // Handle Single Session Permanent Deletion
  const confirmDeleteSession = async () => {
    if (!deletingSession) return;
    const sId = deletingSession.id;
    try {
      setIsActionLoading(true);
      await storageAdapter.deleteSession(sId, currentProjectId);
      // Immediate local state update
      setSessions(prev => prev.filter(s => s.id !== sId));
      setResponses(prev => prev.filter(r => r.sessionId !== sId));
      if (expandedSessionId === sId) {
        setExpandedSessionId(null);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    } finally {
      setIsActionLoading(false);
      setDeletingSession(null);
    }
  };

  // Handle Bulk Empty Sessions Deletion
  const confirmDeleteAllEmpty = async () => {
    try {
      setIsActionLoading(true);
      await storageAdapter.deleteEmptySessions(currentProjectId);
      const emptyIds = new Set(emptySessions.map(s => s.id));
      // Immediate local state update
      setSessions(prev => prev.filter(s => !emptyIds.has(s.id)));
      setResponses(prev => prev.filter(r => !emptyIds.has(r.sessionId)));
      if (expandedSessionId && emptyIds.has(expandedSessionId)) {
        setExpandedSessionId(null);
      }
    } catch (err) {
      console.error('Error deleting empty sessions:', err);
    } finally {
      setIsActionLoading(false);
      setShowDeleteEmptyModal(false);
    }
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
              Supervisión de tiempos, fecha y hora de registro, atención, exclusión metodológica y depuración de registros.
            </p>
          </div>

          {/* Quick Bulk Action Button: Clean Empty Sessions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowDeleteEmptyModal(true)}
              disabled={emptySessions.length === 0 || isActionLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs ${
                emptySessions.length > 0
                  ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                  : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title={
                emptySessions.length > 0
                  ? `Borrar de una sola vez los ${emptySessions.length} participantes que no registraron respuestas`
                  : 'No hay registros vacíos para borrar'
              }
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Borrar registros vacíos ({emptySessions.length})</span>
            </button>
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
              Registros Vacíos / Excluidos
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-700">{emptySessions.length}</span>
              <span className="text-xs text-slate-400">vacíos</span>
              <span className="text-sm font-bold text-slate-300">•</span>
              <span className="text-xl font-black text-rose-600">{excludedSessions.length}</span>
              <span className="text-xs text-rose-500">excluidos</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              sin alterar el cálculo grupal
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
            {(['all', 'completed', 'flagged', 'excluded', 'empty'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' && `Todos (${sessions.length})`}
                {tab === 'completed' && `Completos (${completedSessions.length})`}
                {tab === 'flagged' && `Con Alertas (${flaggedSessions.length})`}
                {tab === 'excluded' && `Excluidos (${excludedSessions.length})`}
                {tab === 'empty' && `Vacíos (${emptySessions.length})`}
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
                  <th className="py-3 px-4">Fecha y Hora de Llenado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Tiempos y Atención</th>
                  <th className="py-3 px-4">Respuestas</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No se encontraron participantes bajo los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map(session => {
                    const sessionResponses = responses.filter(r => r.sessionId === session.id);
                    const isExpanded = expandedSessionId === session.id;
                    const isExcluded = session.flags?.excludedByAdmin;
                    const isEmpty = isSessionEmpty(session.id);
                    const hasFlags = session.flags?.visibilityLossCount > 2 || session.flags?.suspiciousTiming;
                    const totalAssocs = sessionResponses.reduce((acc, r) => acc + (r.associations?.length || 0), 0);

                    return (
                      <React.Fragment key={session.id}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${isExcluded ? 'bg-rose-50/30' : isEmpty ? 'bg-slate-50/40' : ''}`}>
                          {/* Columna 1: Participante y badges */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  session.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : session.status === 'in_progress'
                                    ? 'bg-blue-500'
                                    : 'bg-amber-400'
                                }`}
                              />
                              <span>{session.anonymousId}</span>
                              {isExcluded && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold font-sans">
                                  Excluido
                                </span>
                              )}
                              {isEmpty && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold font-sans">
                                  Sin respuestas
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Columna 2: Fecha y Hora completa (Fecha + Hora) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-xs font-sans">
                              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                                <span>{formatFullDateTime(session.startedAt)}</span>
                              </div>
                              {session.completedAt ? (
                                <div className="flex items-center gap-1.5 text-emerald-700 text-[10.5px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Fin: {formatFullDateTime(session.completedAt)}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">En curso / Incompleto</span>
                              )}
                            </div>
                          </td>

                          {/* Columna 3: Estado */}
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

                          {/* Columna 4: Tiempos y Atención */}
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

                          {/* Columna 5: Respuestas */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900">
                              {sessionResponses.length}
                            </span>
                            <span className="text-slate-400 font-normal"> / {stimuli.length} estímulos</span>
                            <div className="text-[11px] text-slate-500">
                              {totalAssocs} asociaciones
                            </div>
                          </td>

                          {/* Columna 6: Acciones (Detalle, Excluir, Eliminar) */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Botón Detalle */}
                              <button
                                onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium inline-flex items-center gap-1 transition-colors"
                                title={isExpanded ? 'Ocultar detalles' : 'Ver asociaciones registradas'}
                              >
                                <span>{isExpanded ? 'Ocultar' : 'Detalle'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {/* Botón Excluir / Reactivar */}
                              <button
                                onClick={() => handleToggleExclude(session)}
                                disabled={isActionLoading}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors ${
                                  isExcluded
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                }`}
                                title={
                                  isExcluded
                                    ? 'Reincorporar participante al análisis grupal'
                                    : 'Excluir del análisis estadístico (conserva el registro en BD)'
                                }
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

                              {/* Botón Eliminar Permanente */}
                              <button
                                onClick={() => setDeletingSession(session)}
                                disabled={isActionLoading}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                title="Borrar permanentemente este participante y sus respuestas de la base de datos"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Borrar</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Row with Associations Detail */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={6} className="p-4 border-t border-slate-100">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                                  <div>
                                    <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase flex items-center gap-1.5">
                                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary-600" />
                                      Desglose de Asociaciones Registradas
                                    </h4>
                                    <span className="text-[11px] text-slate-400">
                                      Participante: <strong className="font-mono text-slate-700">{session.anonymousId}</strong> • Iniciado: {formatFullDateTime(session.startedAt)}
                                    </span>
                                  </div>
                                  {isExcluded && (
                                    <span className="text-xs text-rose-600 font-medium italic bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                                      Motivo de exclusión: "{session.flags?.exclusionReason}"
                                    </span>
                                  )}
                                </div>

                                {sessionResponses.length === 0 ? (
                                  <div className="py-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-100">
                                    Este participante no completó ningún estímulo (registro vacío).
                                  </div>
                                ) : (
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
                                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {formatFullDateTime(resp.completedAt)}
                                          </span>
                                        </div>

                                        <div className="text-[10px] text-slate-400">
                                          {(resp.totalGenerationTimeMs / 1000).toFixed(1)}s gen • {(resp.rankingTimeMs / 1000).toFixed(1)}s jerarq
                                        </div>

                                        <div className="space-y-1">
                                          {resp.associations.length === 0 ? (
                                            <div className="text-[11px] text-slate-400 italic py-1">
                                              Sin asociaciones
                                            </div>
                                          ) : (
                                            resp.associations.map(assoc => (
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
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
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

        {/* Modal 1: Exclusión Metodológica */}
        {excludingSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Excluir Participante del Análisis
                </h3>
              </div>

              <p className="text-xs text-slate-600">
                El participante <strong className="font-mono">{excludingSession.anonymousId}</strong> será
                omitido del cálculo de los indicadores grupales (J, M, FMG, SAM, Grafos y Pathfinder). Sus datos
                permanecen en la plataforma y podrás reactivarlo cuando desees.
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  ¿Deseas borrarlo permanentemente?
                </p>
                <p className="text-amber-800">
                  Si este registro es una prueba o está vacío y deseas que no aparezca en la lista, utiliza el botón rojo <strong>"Borrar"</strong> en la tabla.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Motivo Metodológico:</label>
                <textarea
                  rows={3}
                  value={exclusionReason}
                  onChange={e => setExclusionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setExcludingSession(null)}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmExclusion}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  {isActionLoading ? 'Guardando...' : 'Confirmar Exclusión'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Eliminación Individual de Participante */}
        {deletingSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Borrar Participante Definitivamente
                </h3>
              </div>

              <p className="text-xs text-slate-600">
                ¿Estás seguro de que deseas eliminar permanentemente al participante{' '}
                <strong className="font-mono text-slate-900">{deletingSession.anonymousId}</strong>?
              </p>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/80 text-[11px] text-rose-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Esta acción no se puede deshacer
                </p>
                <p className="text-rose-800">
                  Se borrará el registro de la sesión y todas las respuestas/asociaciones generadas por este participante de la base de datos (tanto en la nube como en local).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeletingSession(null)}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteSession}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isActionLoading ? 'Borrando...' : 'Sí, borrar definitivamente'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: Limpiar Todos los Registros Vacíos */}
        {showDeleteEmptyModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-slate-900">
                  Borrar Registros Vacíos
                </h3>
              </div>

              <p className="text-xs text-slate-600">
                Se encontraron <strong className="text-slate-900 font-bold">{emptySessions.length} registros vacíos</strong> (participantes que abrieron la plataforma o el código QR pero no registraron ninguna asociación).
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Depuración de registros
                </p>
                <p className="text-amber-800">
                  Esta acción eliminará de forma permanente todas las sesiones sin respuestas de la base de datos para que tu lista de participantes y reportes queden totalmente limpios. Los participantes con respuestas válidas no se verán afectados.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteEmptyModal(false)}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteAllEmpty}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isActionLoading ? 'Borrando...' : `Sí, borrar ${emptySessions.length} vacíos`}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
