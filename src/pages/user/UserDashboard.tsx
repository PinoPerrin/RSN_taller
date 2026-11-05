import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserLayout } from '../../components/layout/UserLayout';
import { useAuth } from '../../context/AuthContext';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { Project, Stimulus, StimulusResponse } from '../../types';
import {
  FolderKanban,
  PlusCircle,
  Network,
  Compass,
  Sparkles,
  Users,
  BookOpen,
  ArrowRight,
  Radio,
  FileSpreadsheet,
  Clock,
  Building2,
  GraduationCap,
} from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [responsesCount, setResponsesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = storageAdapter.subscribeUserProjects(user.uid, list => {
      setProjects(list);
      // Count total responses across user projects
      let totalR = 0;
      list.forEach(p => {
        const pResps = storageAdapter.getResponses(p.id);
        totalR += pResps.length;
      });
      setResponsesCount(totalR);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const activeProjects = projects.filter(p => p.status === 'published');
  const draftProjects = projects.filter(p => p.status === 'draft');
  const latestProject = projects.length > 0 ? projects[0] : null;

  return (
    <UserLayout activeProjectId={latestProject?.id}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-primary-950 p-6 sm:p-8 rounded-3xl border border-slate-800 text-white relative overflow-hidden shadow-sm">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{profile?.institucion || 'Plataforma Académica'} • {profile?.semestre_nivel || 'Investigador'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Bienvenido, {profile?.nombre || user?.displayName || 'Investigador'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Este es tu espacio personal para diseñar redes semánticas naturales, recolectar respuestas en tiempo real mediante QR y generar análisis de grafos y Pathfinder.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                to="/app/projects/new"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear Nueva Red Semántica</span>
              </Link>
              <Link
                to="/app/manual"
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-primary-400" />
                <span>Consultar Manual (17 Capítulos)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Redes Creadas</span>
              <FolderKanban className="w-4 h-4 text-primary-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{projects.length}</p>
            <p className="text-[11px] text-slate-500">
              {activeProjects.length} activas • {draftProjects.length} borradores
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Respuestas Recogidas</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{responsesCount}</p>
            <p className="text-[11px] text-slate-500">
              participaciones anónimas totales
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Metodología</span>
              <Network className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">J, M, FMG, G</p>
            <p className="text-[11px] text-slate-500">
              esquemas canónicos validados
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Topología</span>
              <Compass className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">Pathfinder</p>
            <p className="text-[11px] text-slate-500">
              análisis de redes y nodos bicolor
            </p>
          </div>
        </div>

        {/* Featured Card: Pathfinder & IA */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 rounded-3xl border border-purple-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold tracking-wider uppercase border border-purple-500/30">
              <Sparkles className="w-3 h-3" />
              <span>Novedad • Análisis Visual y Cualitativo</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Grafo Pathfinder Bicolor e Interpretación Semántica
            </h2>
            <p className="text-xs text-purple-200 max-w-xl leading-relaxed">
              Si tu estudio analiza dos estímulos, visualiza qué palabras pertenecen exclusivamente a cada uno o son compartidas mediante nodos con fondo dividido, y genera síntesis cualitativas bajo demanda.
            </p>
          </div>
          {latestProject && (
            <Link
              to={`/app/projects/${latestProject.id}/pathfinder`}
              className="px-4 py-2.5 bg-white text-purple-950 hover:bg-purple-50 rounded-xl text-xs font-bold transition-all shrink-0 shadow-md flex items-center gap-2"
            >
              <span>Ver Pathfinder</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary-600" />
                <span>Mis Redes Semánticas Recientes</span>
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona un proyecto para iniciar la captura de respuestas o ver los análisis
              </p>
            </div>
            <Link
              to="/app/projects"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
            >
              <span>Ver todas ({projects.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No tienes proyectos creados</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crea tu primera red semántica para configurar estímulos, generar códigos QR de participación y calcular indicadores.
              </p>
              <Link
                to="/app/projects/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear mi primer proyecto</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.slice(0, 4).map(p => {
                const pResps = storageAdapter.getResponses(p.id);
                const pStim = storageAdapter.getStimuliSync(p.id);

                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-slate-250/80 hover:border-primary-300 hover:shadow-xs transition-all space-y-3 bg-slate-50/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-1 ${
                            p.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {p.status === 'published' ? 'Activo' : 'Borrador'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{p.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {p.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>{pStim.length} estímulos</span>
                      <span>•</span>
                      <span>{pResps.length} respuestas</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Link
                        to={`/app/projects/${p.id}/live`}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-emerald-200"
                      >
                        <Radio className="w-3 h-3" />
                        <span>Sala QR</span>
                      </Link>
                      <Link
                        to={`/app/projects/${p.id}/traditional`}
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-sky-200"
                      >
                        <Network className="w-3 h-3" />
                        <span>RSN Clásico</span>
                      </Link>
                      <Link
                        to={`/app/projects/${p.id}/pathfinder`}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-indigo-200"
                      >
                        <Compass className="w-3 h-3" />
                        <span>Pathfinder</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};
