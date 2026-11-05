import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Network,
  Share2,
  Compass,
  Sparkles,
  QrCode,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Brain,
  Layers,
  FileSpreadsheet,
  Users,
  Search,
  ExternalLink,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isRegisteredUser } = useAuth();
  const [quickCode, setQuickCode] = useState('');
  const [quickCodeError, setQuickCodeError] = useState('');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = quickCode.trim();
    if (!code) {
      setQuickCodeError('Por favor ingresa el código o ID del estudio');
      return;
    }
    navigate(`/p/${code}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center font-black text-white text-base shadow-md group-hover:scale-105 transition-transform">
              RSN
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-tight">
                Redes Semánticas Naturales
              </span>
              <span className="text-[10px] text-primary-400 font-semibold tracking-wider uppercase">
                Plataforma Académica de Investigación
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#introduccion" className="hover:text-white transition-colors">
              ¿Qué son las RSN?
            </a>
            <a href="#plataforma" className="hover:text-white transition-colors">
              Herramientas
            </a>
            <a href="#metodologia" className="hover:text-white transition-colors">
              Fundamentos
            </a>
            <a href="#participar" className="hover:text-white transition-colors">
              Participar con Código
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isRegisteredUser ? (
              <Link
                to={isAdmin ? '/admin' : '/app'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all"
              >
                <span>{isAdmin ? 'Panel de Administrador' : 'Ir a mi Panel'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800/80 transition-all"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Crear cuenta gratuita</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Versión 2.0 • Portal Académico y Proyectos Personales</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Construcción, Visualización y Análisis Científico de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-sky-300 to-indigo-300">
              Redes Semánticas Naturales
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Plataforma académica integral para estudiantes, investigadores y docentes. Diseña tus propios estudios, 
            recolecta palabras definidoras en tiempo real mediante códigos QR, calcula indicadores tradicionales 
            (Riqueza J, Peso M, FMG, Valor G, Núcleo SAM) y modela redes asociativas con el algoritmo Pathfinder.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Crear Cuenta Gratuita</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#introduccion"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-primary-400" />
              <span>Conocer la Metodología</span>
            </a>

            <a
              href="#participar"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Entrar a Responder con Código</span>
            </a>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 border-t border-slate-800/80 text-left">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-750">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Fundamentación
              </span>
              <p className="text-lg font-black text-white">Figueroa & Valdez</p>
              <p className="text-xs text-slate-400">Método RSN tradicional normalizado</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-750">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Redes Asociativas
              </span>
              <p className="text-lg font-black text-white">Pathfinder SemNet</p>
              <p className="text-xs text-slate-400">Métrica Minkowski (r) y límites (q)</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-750">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Recolección
              </span>
              <p className="text-lg font-black text-white">Enlace / Código QR</p>
              <p className="text-xs text-slate-400">Sin registro para participantes</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-750">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Persistencia
              </span>
              <p className="text-lg font-black text-white">Biblioteca Privada</p>
              <p className="text-xs text-slate-400">Almacenamiento seguro en la nube</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Participation Section */}
      <section id="participar" className="py-14 bg-slate-950 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white">
            ¿Fuiste invitado a participar en un estudio o taller?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            No necesitas registrarte. Si tienes el código o identificador del proyecto proporcionado por tu profesor o investigador, ingrésalo aquí:
          </p>

          <form onSubmit={handleQuickJoin} className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto pt-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={quickCode}
                onChange={e => {
                  setQuickCode(e.target.value);
                  setQuickCodeError('');
                }}
                placeholder="Ej. proj-taller-rsn o código público"
                className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>Acceder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          {quickCodeError && (
            <p className="text-xs text-rose-400 font-semibold">{quickCodeError}</p>
          )}
        </div>
      </section>

      {/* Introduction to RSN (Theory & Method) */}
      <section id="introduccion" className="py-20 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
              Marco Teórico y Metodológico
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              ¿Qué son las Redes Semánticas Naturales?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Una técnica fundamental de la psicología cognitiva y social en Iberoamérica para el estudio empírico del significado psicológico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-750 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="text-base font-bold text-white">El Significado Psicológico</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A diferencia de las definiciones de diccionario (semántica formal), las redes semánticas naturales capturan la organización interna de la memoria semántica que un grupo humano comparte sobre un concepto en su contexto sociocultural.
              </p>
            </div>

            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-750 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-base font-bold text-white">Evocación y Jerarquización</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                El participante genera palabras definidoras libres ante un concepto estímulo en un tiempo límite determinado y, posteriormente, las jerarquiza en orden de cercanía o importancia (donde el rango 1 es el más representativo).
              </p>
            </div>

            <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-750 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-base font-bold text-white">Estructura Topológica</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                El modelo trasciende listas de frecuencias aisladas: permite construir grafos asociativos de proximidad semántica y analizar la centralidad, densidad, intermediación y agrupamientos de conceptos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features / Herramientas */}
      <section id="plataforma" className="py-20 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
              Capacidades de la Plataforma
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Herramientas Diseñadas para tu Investigación
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Todo el flujo de trabajo metodológico: desde la recolección en aula hasta la exportación lista para artículos científicos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Análisis RSN Tradicional</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cálculo automatizado de Valor J (riqueza de vocabulario), Peso Semántico M con esquemas canónicos y proporcionales, Porcentaje FMG y Valor G (gradiente semántico).
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Redes Pathfinder (SemNet)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Genera redes libres de enlaces espurios según el principio de triángulo de distancias geodésicas. Visualización interactiva con nodos bicolor para palabras compartidas entre estímulos.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Interpretación Semántica Asistida</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Módulo analítico que sintetiza cualitativamente los núcleos semánticos, campos de significado y diferencias estructurales bajo demanda estricta sin costos automáticos.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Captura en Vivo por QR y Enlace</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permite a decenas o cientos de participantes responder simultáneamente desde sus teléfonos celulares con interfaces limpias, cronómetro exacto y jerarquización por arrastre o toques.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Normalización Semántica</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lematiza variantes ortográficas, singulares/plurales y sinónimos sin alterar la base original capturada, garantizando la reproducibilidad metodológica del estudio.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Exportación Científica y Reportes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Descarga datos brutos, matrices de coocurrencia, tablas formateadas para SPSS, Excel y formatos vectoriales para publicación académica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Manual callout section */}
      <section id="metodologia" className="py-16 bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-800 to-slate-850 p-8 sm:p-12 rounded-3xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
              Manual Interactivo Integrado
            </span>
            <h3 className="text-2xl font-black text-white">
              17 Capítulos Didácticos de Aprendizaje
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
              Consulta fórmulas paso a paso, ejemplos interactivos, diferencias entre medidas de centralidad y densidad, criterios de corte scree test y recomendaciones de reporte.
            </p>
          </div>
          <Link
            to="/register"
            className="px-6 py-3.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all shrink-0 shadow-md flex items-center gap-2"
          >
            <span>Crear cuenta y ver Manual</span>
            <ArrowRight className="w-4 h-4 text-slate-900" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center font-black text-white text-xs">
              RSN
            </div>
            <div>
              <p className="font-bold text-white">Plataforma de Redes Semánticas Naturales</p>
              <p className="text-[11px] text-slate-500">Investigación en Psicología Cognitiva y Social</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-white transition-colors">
              Iniciar Sesión
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              Registrarse
            </Link>
            <a href="#introduccion" className="hover:text-white transition-colors">
              Fundamentos
            </a>
          </div>

          <p className="text-[11px] text-slate-500 text-center md:text-right">
            © {new Date().getFullYear()} Plataforma RSN. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};
