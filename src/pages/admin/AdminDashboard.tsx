import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Project, ParticipantSession, StimulusResponse } from '../../types';
import { storageAdapter, localDB } from '../../services/storage/storageAdapter';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ShareQRModal } from '../../components/common/ShareQRModal';
import {
  FolderKanban,
  CheckCircle2,
  Users,
  Activity,
  Plus,
  QrCode,
  Radio,
  Tv,
  Edit3,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<ParticipantSession[]>([]);
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [selectedQRProject, setSelectedQRProject] = useState<Project | null>(null);

  useEffect(() => {
    const unsubProjects = storageAdapter.subscribeProjects(setProjects);
    return () => unsubProjects();
  }, []);

  const activeProject = projects.find(p => p.status === 'published') || projects[0];

  useEffect(() => {
    if (!activeProject) return;
    const unsubSessions = storageAdapter.subscribeSessions(activeProject.id, setSessions);
    const unsubResponses = storageAdapter.subscribeResponses(activeProject.id, undefined, setResponses);

    return () => {
      unsubSessions();
      unsubResponses();
    };
  }, [activeProject?.id]);

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'published').length;
  const closedProjects = projects.filter(p => p.status === 'closed' || p.status === 'archived').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const initiatedSessions = sessions.length;
  const incompleteSessions = sessions.filter(s => s.status !== 'completed').length;

  const lastResponse = responses.length > 0 ? responses[responses.length - 1] : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Panel de Administración
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de estudios de Redes Semánticas Naturales y monitoreo en tiempo real
            </p>
          </div>

          <Link
            to="/admin/projects/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Proyecto</span>
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Proyectos</span>
              <FolderKanban className="w-4 h-4 text-primary-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalProjects}</p>
            <p className="text-[11px] text-emerald-600 font-medium">
              {activeProjects} activos / publicados
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Participaciones</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{completedSessions}</p>
            <p className="text-[11px] text-slate-500">
              de {initiatedSessions} sesiones iniciadas
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Incompletas</span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{incompleteSessions}</p>
            <p className="text-[11px] text-slate-400">En curso o abandonadas</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Última Actividad</span>
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 truncate">
              {lastResponse ? `"${lastResponse.stimulusText}"` : 'Sin registros'}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {lastResponse
                  ? new Date(lastResponse.completedAt).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'En espera'}
              </span>
            </p>
          </div>
        </div>

        {/* Recent Projects Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Proyectos de Investigación</h2>
              <p className="text-xs text-slate-500">Administra los estudios y accede a los resultados</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-6">Estudio / Proyecto</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Respuestas</th>
                  <th className="py-3 px-4">Fecha Creación</th>
                  <th className="py-3 px-6 text-right">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {projects.map(project => {
                  const projectResponses = responses.filter(r => r.projectId === project.id);

                  const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
                    published: { label: 'Publicado', bg: 'bg-emerald-50 text-emerald-700', text: 'border-emerald-200' },
                    draft: { label: 'Borrador', bg: 'bg-slate-100 text-slate-600', text: 'border-slate-200' },
                    paused: { label: 'Pausado', bg: 'bg-amber-50 text-amber-700', text: 'border-amber-200' },
                    closed: { label: 'Cerrado', bg: 'bg-rose-50 text-rose-700', text: 'border-rose-200' },
                    archived: { label: 'Archivado', bg: 'bg-slate-100 text-slate-500', text: 'border-slate-200' },
                  };
                  const badge = statusBadges[project.status] || statusBadges.draft;

                  return (
                    <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <Link
                          to={`/admin/projects/${project.id}/traditional`}
                          className="font-bold text-slate-900 text-sm hover:text-primary-600 transition-colors block"
                        >
                          {project.title}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">
                          {project.description || project.objective}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-800">
                        {projectResponses.length}
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {new Date(project.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedQRProject(project)}
                            className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Código QR y Enlace"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/admin/projects/${project.id}/corrections`}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Corrección Manual de Respuestas"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/projects/${project.id}/live`}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Sala en Vivo (Taller)"
                          >
                            <Radio className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/projects/${project.id}/presentation`}
                            target="_blank"
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Modo Presentación"
                          >
                            <Tv className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/admin/projects/${project.id}/traditional`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition-colors ml-1"
                          >
                            <span>Analizar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedQRProject && (
        <ShareQRModal
          project={selectedQRProject}
          isOpen={true}
          onClose={() => setSelectedQRProject(null)}
        />
      )}
    </AdminLayout>
  );
};
