import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Project, Stimulus } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import {
  auth,
  signInAdminWithGoogle,
  signInAdminWithEmail,
  signOutAdmin,
} from '../../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
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
  Edit3,
  Tv,
  Radio,
  ExternalLink,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  Mail,
  Lock,
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

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, u => {
      setAdminUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError('');
    setIsLoggingIn(true);
    try {
      await signInAdminWithGoogle();
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError('');
    setIsLoggingIn(true);
    try {
      await signInAdminWithEmail(email, password);
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión con correo');
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const unsubscribe = storageAdapter.subscribeProjects(list => {
      setProjects(list);
      if (list.length > 0) {
        if (activeProjectId) {
          const found = list.find(p => p.id === activeProjectId);
          if (found) setCurrentProject(prev => (prev?.id === found.id ? prev : found));
        } else {
          setCurrentProject(prev => (prev ? prev : list[0]));
        }
      }
    });
    return () => unsubscribe();
  }, [activeProjectId]);

  const pId = currentProject?.id || activeProjectId || projects[0]?.id || '';

  const navItems = [
    { label: 'Dashboard General', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Proyectos', path: '/admin/projects', icon: FolderKanban },
    { label: 'Sala en Vivo (Taller)', path: `/admin/projects/${pId}/live`, icon: Radio },
    { label: 'Participantes y Calidad', path: `/admin/projects/${pId}/responses`, icon: Users },
    { label: 'Corrección Manual', path: `/admin/projects/${pId}/corrections`, icon: Edit3 },
    { label: 'Análisis RSN Clásico', path: `/admin/projects/${pId}/traditional`, icon: Network },
    { label: 'Red Pathfinder (SemNet)', path: `/admin/projects/${pId}/pathfinder`, icon: Compass },
    { label: 'Interpretación Semántica', path: `/admin/projects/${pId}/interpretation`, icon: Sparkles },
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

          {/* Admin Authentication Status Badge */}
          <div className="pt-2">
            {adminUser && !adminUser.isAnonymous ? (
              <div className="bg-slate-800/90 rounded-xl p-2.5 text-xs border border-emerald-500/40 shadow-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin Activo</span>
                  </div>
                  <button
                    onClick={() => signOutAdmin()}
                    title="Cerrar sesión"
                    className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-300 truncate font-mono">
                  {adminUser.email || adminUser.displayName || 'Sesión Autorizada'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-2.5 text-xs border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] mb-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Modo no autenticado</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mb-2">
                  Inicia sesión para sincronizar datos y exportar respuestas.
                </p>
                <button
                  onClick={() => { setShowAuthModal(true); setAuthError(''); }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Autenticar Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Admin Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Acceso Administrador</h3>
                  <p className="text-xs text-slate-500">Taller de Redes Semánticas</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {authError}
              </div>
            )}

            {/* Google One-Click Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                O con Correo
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="investigador@universidad.edu.mx"
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                {isLoggingIn ? 'Verificando...' : 'Acceder al Panel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
