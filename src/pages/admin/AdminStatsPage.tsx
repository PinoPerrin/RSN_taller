import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { SystemStats, AuditLog, UserProfile, Project } from '../../types';
import {
  BarChart3,
  Users,
  FolderKanban,
  FileSpreadsheet,
  Building2,
  Clock,
  Shield,
  Activity,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const AdminStatsPage: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [s, logs, uList, pList] = await Promise.all([
        storageAdapter.getSystemStats(),
        storageAdapter.getAuditLogs(50),
        storageAdapter.getAllUserProfiles(),
        Promise.resolve(storageAdapter.getProjects()),
      ]);
      setStats(s);
      setAuditLogs(logs);
      setUsers(uList);
      setProjects(pList);
      setLoading(false);
    };
    load();
  }, []);

  // Compute institution breakdown
  const institutionCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    users.forEach(u => {
      const inst = u.institucion?.trim() || 'Sin institución especificada';
      map.set(inst, (map.get(inst) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  // Compute motive breakdown
  const motiveCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    users.forEach(u => {
      const mot = u.motivo_uso || 'practica_academica';
      map.set(mot, (map.get(mot) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, count]) => ({
      key,
      label: key.replace('_', ' '),
      count,
    }));
  }, [users]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            <span>Estadísticas Generales y Auditoría</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas consolidadas de uso de la plataforma, adopción institucional y registro protegido de acciones administrativas.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Usuarios Totales</span>
              <Users className="w-4 h-4 text-primary-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats?.totalUsers || 0}</p>
            <p className="text-[11px] text-slate-500">
              {stats?.recentRegistrations || 0} registrados en los últimos 7 días
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Redes Creadas</span>
              <FolderKanban className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{projects.length}</p>
            <p className="text-[11px] text-slate-500">
              {stats?.totalStimuli || 0} conceptos estímulo configurados
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Respuestas Totales</span>
              <FileSpreadsheet className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats?.totalResponses || 0}</p>
            <p className="text-[11px] text-slate-500">
              capturas de participantes en la nube
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tickets de Soporte</span>
              <MessageSquare className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{stats?.pendingFeedback || 0}</p>
            <p className="text-[11px] text-slate-500">
              solicitudes pendientes de atención
            </p>
          </div>
        </div>

        {/* Distributions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Institutions Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" />
              <span>Distribución por Institución Académica</span>
            </h2>

            {institutionCounts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No hay datos suficientes.</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {institutionCounts.map(item => {
                  const percent = Math.round((item.count / (users.length || 1)) * 100);
                  return (
                    <div key={item.name} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-700 font-semibold">
                        <span className="truncate max-w-[280px]">{item.name}</span>
                        <span>
                          {item.count} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Motives Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Motivo de Uso de la Plataforma</span>
            </h2>

            {motiveCounts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No hay datos suficientes.</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {motiveCounts.map(item => {
                  const percent = Math.round((item.count / (users.length || 1)) * 100);
                  return (
                    <div key={item.key} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-700 font-semibold capitalize">
                        <span>{item.label}</span>
                        <span>
                          {item.count} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-600" />
                <span>Registro Protegido de Auditoría Administrativa</span>
              </h2>
              <p className="text-xs text-slate-500">
                Historial inmutable de acciones sensibles (suspensión de cuentas, eliminación o archivo de proyectos, respuestas de soporte).
              </p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{auditLogs.length} eventos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Tipo / Objetivo</th>
                  <th className="py-2.5 px-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No hay registros de auditoría aún.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {log.targetType}:{log.targetId.substring(0, 10)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-sans text-xs">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
