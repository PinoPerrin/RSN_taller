import React, { useState, useEffect } from 'react';
import { UserLayout } from '../../components/layout/UserLayout';
import { useAuth } from '../../context/AuthContext';
import { MotivoUso, Project } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import {
  User,
  GraduationCap,
  Building2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Save,
  Key,
  ExternalLink,
} from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { user, profile, saveProfile, resetPassword, logout } = useAuth();

  const [institucion, setInstitucion] = useState(profile?.institucion || '');
  const [semestreNivel, setSemestreNivel] = useState(profile?.semestre_nivel || 'No aplica');
  const [nombre, setNombre] = useState(profile?.nombre || user?.displayName || '');
  const [motivoUso, setMotivoUso] = useState<MotivoUso>(profile?.motivo_uso || 'practica_academica');
  const [motivoDetalle, setMotivoDetalle] = useState(profile?.motivo_detalle || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordSent, setPasswordSent] = useState(false);

  useEffect(() => {
    if (profile) {
      setInstitucion(profile.institucion || '');
      setSemestreNivel(profile.semestre_nivel || 'No aplica');
      setNombre(profile.nombre || user?.displayName || '');
      setMotivoUso(profile.motivo_uso || 'practica_academica');
      setMotivoDetalle(profile.motivo_detalle || '');
    }
  }, [profile, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institucion.trim()) {
      setError('La institución académica es obligatoria.');
      return;
    }

    setError('');
    setMessage('');
    setSaving(true);
    try {
      await saveProfile({
        institucion: institucion.trim(),
        semestre_nivel: semestreNivel,
        nombre: nombre.trim() || undefined,
        motivo_uso: motivoUso,
        motivo_detalle: motivoDetalle.trim() || undefined,
      });
      setMessage('Perfil académico actualizado con éxito.');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      setPasswordSent(true);
    } catch (err: any) {
      setError('Error al enviar correo de restablecimiento: ' + err.message);
    }
  };

  const handleExportData = () => {
    if (!user) return;
    const userProjects = storageAdapter.getProjects().filter((p: Project) => p.ownerUid === user.uid);
    const dataPackage = {
      userProfile: profile,
      firebaseUid: user.uid,
      email: user.email,
      exportedAt: new Date().toISOString(),
      projectsCount: userProjects.length,
      projects: userProjects,
    };

    const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis_datos_rsn_${user.uid.substring(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <UserLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-primary-600" />
            <span>Mi Perfil Académico</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta y edita tus datos institucionales, motivos de uso y gestiona la seguridad de tu cuenta.
          </p>
        </div>

        {message && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Identificación de Cuenta */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Credenciales y Registro
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Correo Electrónico</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={user?.email || 'Autenticación con Google'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-9 text-slate-700 font-mono text-xs cursor-not-allowed"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Identificador de Usuario (UID)</label>
                <input
                  type="text"
                  disabled
                  value={user?.uid || ''}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-700 cursor-not-allowed truncate"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Fecha de Registro</label>
                <p className="text-xs font-semibold text-slate-800 py-1">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Reciente'}
                </p>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Último Acceso</label>
                <p className="text-xs font-semibold text-slate-800 py-1">
                  {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Hoy'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Ficha Académica Editable */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ficha Académica
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Institución Académica *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={institucion}
                    onChange={e => setInstitucion(e.target.value)}
                    required
                    className="w-full border border-slate-250 rounded-xl p-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Semestre o Nivel Académico *
                  </label>
                  <select
                    value={semestreNivel}
                    onChange={e => setSemestreNivel(e.target.value)}
                    className="w-full border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="1º - 3º Semestre Licenciatura">1º - 3º Semestre (Licenciatura)</option>
                    <option value="4º - 6º Semestre Licenciatura">4º - 6º Semestre (Licenciatura)</option>
                    <option value="7º - 10º Semestre Licenciatura">7º - 10º Semestre (Licenciatura)</option>
                    <option value="Posgrado (Maestría / Doctorado)">Posgrado (Maestría / Doctorado)</option>
                    <option value="No aplica">No aplica (Docente, Investigador o Egresado)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre o Alias Académico (Opcional)
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre o firma académica"
                    className="w-full border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo de Uso de la Plataforma
                </label>
                <select
                  value={motivoUso}
                  onChange={e => setMotivoUso(e.target.value as MotivoUso)}
                  className="w-full border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="practica_academica">Práctica académica / Clase</option>
                  <option value="tesis">Tesis de grado</option>
                  <option value="investigacion">Proyecto de investigación</option>
                  <option value="docencia">Docencia universitaria</option>
                  <option value="exploracion_personal">Exploración personal</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Línea de Interés o Descripción
                </label>
                <textarea
                  value={motivoDetalle}
                  onChange={e => setMotivoDetalle(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Card 3: Opciones de Cuenta y Portabilidad de Datos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Seguridad y Datos Personales
          </h2>

          <div className="space-y-3 text-xs">
            {/* Password reset button */}
            {user?.email && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <p className="font-bold text-slate-900">Seguridad de la Contraseña</p>
                  <p className="text-slate-500 text-[11px]">
                    Envía un correo de restablecimiento seguro a tu bandeja.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{passwordSent ? 'Enlace Enviado' : 'Cambiar Clave'}</span>
                </button>
              </div>
            )}

            {/* Export data */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <p className="font-bold text-slate-900">Portabilidad de Datos Académicos</p>
                <p className="text-slate-500 text-[11px]">
                  Descarga una copia completa de tu perfil y la lista de tus proyectos en formato JSON.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Mis Datos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
