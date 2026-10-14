import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Project, Stimulus } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Network,
  Compass,
  Share2,
  GitCompare,
  SpellCheck,
  Download,
  Sliders,
  Tv,
  Radio,
  ExternalLink,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  activeProjectId?: string;
}

export const AdminLayout: React.FC<Props> = ({ children, activeProjectId }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = storageAdapter.subscribeProjects(list => {
      setProjects(list);
      if (list.length > 0) {
        if (activeProjectId) {
          const found = list.find(p => p.id === activeProjectId);
          if (found) setCurrentProject(found);
        } else if (!currentProject) {
          setCurrentProject(list[0]);
        }
      }
    });
    return () => unsubscribe();
  }, [activeProjectId]);

  const pId = currentProject?.id || activeProjectId || projects[0]?.id || 'proj-taller-rsn';

  const navItems = [
    { label: 'Dashboard General', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Proyectos', path: '/admin/projects', icon: FolderKanban },
    { label: 'Sala en Vivo (Taller)', path: `/admin/projects/${pId}/live`, icon: Radio },
    { label: 'Participantes y Calidad', path: `/admin/projects/${pId}/responses`, icon: Users },
    { label: 'Análisis RSN Clásico', path: `/admin/projects/${pId}/traditional`, icon: Network },
    { label: 'Red Pathfinder (SemNet)', path: `/admin/projects/${pId}/pathfinder`, icon: Compass },
    { label: 'Análisis de Grafos', path: `/admin/projects/${pId}/graphs`, icon: Share2 },
    { label: 'Comparación de Redes', path: `/admin/projects/${pId}/compare`, icon: GitCompare },
    { label: 'Normalización Semántica', path: `/admin/projects/${pId}/normalization`, icon: SpellCheck },
    { label: 'Exportaciones e Informes', path: `/admin/projects/${pId}/export`, icon: Download },
    { label: 'Metodología y Fórmulas', path: `/admin/methodology`, icon: Sliders },
  ];

  const handleSelectProject = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setCurrentProject(proj);
      // If currently on a project subpage, stay on same feature but change project ID
      const parts = location.pathname.split('/');
      if (parts[2] === 'projects' && parts[4]) {
        navigate(`/admin/projects/${proj.id}/${parts[4]}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center font-black text-sm">
            RSN
          </div>
          <span className="font-extrabold text-sm tracking-tight">Redes Semánticas</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-200"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between p-4 border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-4">
          {/* Logo / Title */}
          <div className="hidden md:flex items-center gap-2.5 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center font-black text-white text-base shadow-sm">
              RSN
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm tracking-tight leading-none">
                Plataforma RSN
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-1">
                Ciencia Semántica
              </p>
            </div>
          </div>

          {/* Project Selector Dropdown */}
          <div className="pt-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
              Estudio Activo
            </label>
            <div className="relative">
              <select
                value={pId}
                onChange={e => handleSelectProject(e.target.value)}
                className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2.5 pr-8 appearance-none border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1 pt-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Quick Action: Presentation Mode & Public Link */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          {currentProject && (
            <Link
              to={`/admin/projects/${pId}/presentation`}
              target="_blank"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Modo Presentación</span>
            </Link>
          )}

          {currentProject && (
            <a
              href={`/p/${currentProject.publicId || currentProject.id}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-[11px] font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              <span>Vista Participante</span>
            </a>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
