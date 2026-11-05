import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MotivoUso } from '../../types';
import {
  GraduationCap,
  Building2,
  BookOpen,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, saveProfile, isProfileComplete, isAdmin, logout } = useAuth();

  const [institucion, setInstitucion] = useState('');
  const [semestreNivel, setSemestreNivel] = useState('No aplica');
  const [nombre, setNombre] = useState('');
  const [allowGoogleName, setAllowGoogleName] = useState(true);
  const [motivoUso, setMotivoUso] = useState<MotivoUso>('practica_academica');
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [researchConsentAccepted, setResearchConsentAccepted] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      navigate('/login');
      return;
    }

    if (profile) {
      setInstitucion(profile.institucion || '');
      setSemestreNivel(profile.semestre_nivel || 'No aplica');
      setNombre(profile.nombre || user.displayName || '');
      setMotivoUso(profile.motivo_uso || 'practica_academica');
      setMotivoDetalle(profile.motivo_detalle || '');
      setTermsAccepted(Boolean(profile.termsAccepted));
    } else if (user.displayName) {
      setNombre(user.displayName);
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!institucion.trim()) {
      setError('Por favor indica tu institución académica.');
      return;
    }

    if (!semestreNivel.trim()) {
      setError('Por favor selecciona tu nivel o semestre académico.');
      return;
    }

    if (!motivoUso) {
      setError('Por favor selecciona el motivo de uso de la plataforma.');
      return;
    }

    if (!termsAccepted) {
      setError('Debes aceptar el aviso de privacidad y los términos de uso académico.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const finalName = allowGoogleName ? nombre.trim() : '';
      await saveProfile({
        institucion: institucion.trim(),
        semestre_nivel: semestreNivel,
        nombre: finalName || undefined,
        motivo_uso: motivoUso,
        motivo_detalle: motivoDetalle.trim() || undefined,
        termsAccepted: true,
        termsVersion: '1.0.0',
        privacyAccepted: true,
      });

      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar el perfil académico.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans selection:bg-primary-500 selection:text-white flex flex-col justify-center">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Paso Obligatorio • Registro Académico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Completa tu Perfil Académico
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Para organizar tus proyectos y habilitar tu biblioteca personal, requerimos conocer tu contexto académico.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Automatic User Credentials Box */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Identificador Autenticado:</span>
              <span className="font-mono text-primary-400">{user.uid.substring(0, 14)}...</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Correo Vinculado:</span>
              <span className="font-mono text-slate-200">{user.email || 'Autenticación con Google'}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Institución */}
            <div>
              <label className="block font-bold text-slate-200 mb-1 flex items-center justify-between">
                <span>Institución Académica *</span>
                <span className="text-[10px] text-primary-400 font-normal">Obligatorio</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={institucion}
                  onChange={e => setInstitucion(e.target.value)}
                  required
                  placeholder="Ej. UNAM, IPN, UAM, UANL, Universidad de Guadalajara..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2.5 pl-9 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            {/* Semestre / Nivel */}
            <div>
              <label className="block font-bold text-slate-200 mb-1 flex items-center justify-between">
                <span>Nivel o Semestre Académico *</span>
                <span className="text-[10px] text-primary-400 font-normal">Obligatorio</span>
              </label>
              <div className="relative">
                <select
                  value={semestreNivel}
                  onChange={e => setSemestreNivel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2.5 pl-9 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                >
                  <option value="1º - 3º Semestre Licenciatura">1º - 3º Semestre (Licenciatura)</option>
                  <option value="4º - 6º Semestre Licenciatura">4º - 6º Semestre (Licenciatura)</option>
                  <option value="7º - 10º Semestre Licenciatura">7º - 10º Semestre (Licenciatura)</option>
                  <option value="Posgrado (Maestría / Doctorado)">Posgrado (Maestría / Doctorado)</option>
                  <option value="No aplica">No aplica (Docente, Investigador o Egresado)</option>
                </select>
                <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Nombre (Opcional) */}
            <div>
              <label className="block font-bold text-slate-200 mb-1 flex items-center justify-between">
                <span>Nombre Completo o Alias Académico</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Mtra. López o Alejandro P."
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2.5 pl-9 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              {user.displayName && (
                <label className="mt-1.5 flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={allowGoogleName}
                    onChange={e => setAllowGoogleName(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Autorizo usar el nombre proporcionado por Google en mi perfil</span>
                </label>
              )}
            </div>

            {/* Motivo de uso */}
            <div>
              <label className="block font-bold text-slate-200 mb-1 flex items-center justify-between">
                <span>Motivo Principal de Uso *</span>
                <span className="text-[10px] text-primary-400 font-normal">Obligatorio</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'practica_academica', label: 'Práctica académica / Clase' },
                  { value: 'tesis', label: 'Tesis de grado' },
                  { value: 'investigacion', label: 'Proyecto de investigación' },
                  { value: 'docencia', label: 'Docencia universitaria' },
                  { value: 'exploracion_personal', label: 'Exploración personal' },
                  { value: 'otro', label: 'Otro motivo' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      motivoUso === opt.value
                        ? 'bg-primary-500/10 border-primary-500 text-primary-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="motivoUso"
                      value={opt.value}
                      checked={motivoUso === opt.value}
                      onChange={() => setMotivoUso(opt.value as MotivoUso)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-[11px] font-semibold">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Explicación complementaria opcional */}
            <div>
              <label className="block font-bold text-slate-200 mb-1 flex items-center justify-between">
                <span>Descripción o Tema de Interés</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <textarea
                value={motivoDetalle}
                onChange={e => setMotivoDetalle(e.target.value)}
                rows={2}
                placeholder="Ej. Estudio de representación del dolor crónico en adultos mayores..."
                className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* Aviso de Privacidad y Términos */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-start gap-2 text-[11px] text-slate-300">
                <Info className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso de Administración del Servicio:</strong> Para garantizar la continuidad técnica y mantenimiento de la plataforma, el administrador del sistema podrá consultar los perfiles registrados y proyectos almacenados.
                </p>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-200">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  required
                  className="rounded border-slate-700 bg-slate-900 text-primary-600 focus:ring-primary-500 mt-0.5"
                />
                <span>
                  Acepto los <strong>Términos de Uso Académico</strong> y el <strong>Aviso de Privacidad (v1.0.0)</strong>. Entiendo que mis proyectos se almacenarán de forma privada bajo mi cuenta.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={researchConsentAccepted}
                  onChange={e => setResearchConsentAccepted(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-primary-600 focus:ring-primary-500 mt-0.5"
                />
                <span>
                  (Opcional) Autorizo que los datos anónimos agregados de mis estudios puedan ser considerados para estudios metodológicos sobre la técnica de Redes Semánticas Naturales.
                </span>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Guardando...' : 'Completar Registro y Entrar a la Plataforma'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full sm:w-auto py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-semibold transition-all text-center"
              >
                Cerrar Sesión
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
