import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Project } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  Users,
  Network,
  Compass,
  Share2,
  GitCompare,
  SpellCheck,
  Download,
  BookOpen,
  MessageSquare,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Radio,
  ShieldCheck,
  Building2,
  ExternalLink,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  activeProjectId?: string;
}

export const UserLayout: React.FC<Props> = ({ children, activeProjectId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, logout } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = storageAdapter.subscribeUserProjects(user.uid, list => {
      setProjects(list);
      if (list.length > 0) {
        if (activeProjectId) {
          const found = list.find(p => p.id === activeProjectId);
          if (found) setCurrentProject(found);
        } else {
          setCurrentProject(prev => (prev ? prev : list[0]));
        }
      }
    });
    return () => unsubscribe();
  }, [user, activeProjectId]);

  const pId = currentProject?.id || activeProjectId || projects[0]?.id || '';

  const handleSelectProject = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setCurrentProject(proj);
      const parts = location.pathname.split('/');
      if (parts[2] === 'projects' && parts[4]) {
        navigate(`/app/projects/${proj.id}/${parts[4]}`);
      }
    }
  };

  const navItems = [
    { label: 'Inicio', path: '/app', icon: LayoutDashboard, exact: true },
    { label: 'Mis Proyectos', path: '/app/projects', icon: FolderKanban },
    { label: 'Nueva Red Semántica', path: '/app/projects/new', icon: PlusCircle },
  ];

  const analysisItems = pId
    ? [
        { label: 'Recolección QR / Enlace', path: `/app/projects/${pId}/live`, icon: Radio },
        { label: 'Participantes y Calidad', path: `/app/projects/${pId}/responses`, icon: Users },
        { label: 'Análisis RSN Clásico', path: `/app/projects/${pId}/traditional`, icon: Network },
        { label: 'Red Pathfinder (SemNet)', path: `/app/projects/${pId}/pathfinder`, icon: Compass },
        {
          label: 'Interpretación Semántica',
          path: `/app/projects/${pId}/interpretation`,
          icon: Sparkles,
          badge: 'IA',
        },
        { label: 'Análisis de Grafos', path: `/app/projects/${pId}/graphs`, icon: Share2 },
        { label: 'Comparación de Redes', path: `/app/projects/${pId}/compare`, icon: GitCompare },
        { label: 'Normalización Semántica', path: `/app/projects/${pId}/normalization`, icon: SpellCheck },
        { label: 'Exportaciones e Informes', path: `/app/projects/${pId}/export`, icon: Download },
      ]
    : [];

  const utilityItems = [
    { label: 'Manual de Uso (17 Cap.)', path: '/app/manual', icon: BookOpen },
    { label: 'Comentarios y Soporte', path: '/app/support', icon: MessageSquare },
    { label: 'Mi Perfil', path: '/app/profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-black text-sm">
            RSN
          </div>
          <span className="font-extrabold text-sm tracking-tight">Portal Académico</span>
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
        className={`fixed md:sticky top-0 left-0 bottom-0 z-40 w-64 h-screen max-h-screen bg-slate-900 text-slate-300 flex flex-col justify-between p-4 border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Branding & Project Selector */}
        <div className="shrink-0 space-y-3 pb-2 border-b border-slate-800/80">
          <div className="hidden md:flex items-center gap-2.5 px-1 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center font-black text-white text-base shadow-sm shrink-0">
              RSN
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm tracking-tight leading-none">
                Portal de Usuario
              </h1>
              <p className="text-[10px] text-primary-400 font-semibold tracking-wider uppercase mt-1">
                Investigación RSN
              </p>
            </div>
          </div>

          {/* User's Project Selector */}
          <div>
            <div className="flex items-center justify-between px-1 mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Proyecto Activo
              </label>
              <Link
                to="/app/projects/new"
                className="text-[10px] font-semibold text-primary-400 hover:text-primary-300 inline-flex items-center gap-0.5"
                title="Crear nueva red"
              >
                <span>+ Nuevo</span>
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="bg-slate-800/60 rounded-xl p-2.5 text-center text-xs text-slate-400 border border-slate-750">
                <p className="text-[11px] mb-1.5">Aún no tienes redes creadas</p>
                <Link
                  to="/app/projects/new"
                  className="inline-block px-2.5 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-[10px] font-bold"
                >
                  Crear mi primera red
                </Link>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={pId}
                  onChange={e => handleSelectProject(e.target.value)}
                  className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 pr-8 appearance-none border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500 truncate"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Nav Links Section */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 my-1 pr-1 space-y-4">
          {/* Main items */}
          <nav className="space-y-1">
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
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Analysis modules if project is selected */}
          {analysisItems.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-800/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
                Análisis del Proyecto
              </span>
              {analysisItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary-600/90 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Utility items */}
          <div className="space-y-1 pt-2 border-t border-slate-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
              Recursos y Cuenta
            </span>
            {utilityItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Switch to Admin if user is Admin */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-800/60">
              <Link
                to="/admin"
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Panel Administrador</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Bottom User Profile Section */}
        <div className="shrink-0 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-xl p-2.5 text-xs border border-slate-750 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                  {profile?.nombre ? profile.nombre.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-xs truncate">
                    {profile?.nombre || user?.displayName || 'Investigador'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {profile?.institucion || user?.email || 'Académico'}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-750 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
