import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { UserProfile, UserStatus, Project } from '../../types';
import {
  Users,
  Search,
  Filter,
  Building2,
  GraduationCap,
  Calendar,
  Clock,
  Shield,
  UserX,
  UserCheck,
  FolderKanban,
  ExternalLink,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Selected user detail modal
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  // Status toggle confirmation modal
  const [suspendingProfile, setSuspendingProfile] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [uList, pList] = await Promise.all([
        storageAdapter.getAllUserProfiles(),
        Promise.resolve(storageAdapter.getProjects()),
      ]);
      setProfiles(uList);
      setAllProjects(pList);
    };
    load();
  }, []);

  const institutionsList = Array.from(new Set(profiles.map(p => p.institucion).filter(Boolean)));

  const filteredProfiles = profiles.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.email.toLowerCase().includes(term) ||
      (p.nombre || '').toLowerCase().includes(term) ||
      p.institucion.toLowerCase().includes(term) ||
      p.uid.toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (institutionFilter !== 'all' && p.institucion !== institutionFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const handleToggleStatus = async () => {
    if (!suspendingProfile) return;
    const nextStatus: UserStatus = suspendingProfile.status === 'suspended' ? 'active' : 'suspended';
    setActionLoading(true);
    try {
      await storageAdapter.updateUserStatus(suspendingProfile.uid, nextStatus);
      await storageAdapter.logAdminAction({
        adminUid: 'admin',
        action: nextStatus === 'suspended' ? 'SUSPEND_USER' : 'ACTIVATE_USER',
        targetType: 'user',
        targetId: suspendingProfile.uid,
        details: `Cambio de estado a ${nextStatus} para ${suspendingProfile.email}`,
      });

      setProfiles(prev =>
        prev.map(p => (p.uid === suspendingProfile.uid ? { ...p, status: nextStatus } : p))
      );
      if (selectedProfile?.uid === suspendingProfile.uid) {
        setSelectedProfile(prev => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
    } finally {
      setActionLoading(false);
      setSuspendingProfile(null);
    }
  };

  const getUserProjectsCount = (uid: string) => {
    return allProjects.filter(p => p.ownerUid === uid).length;
  };

  const getUserProjectsList = (uid: string) => {
    return allProjects.filter(p => p.ownerUid === uid);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-600" />
              <span>Gestión de Usuarios Registrados</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de investigadores, estudiantes y docentes registrados en la plataforma.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-200 text-xs font-bold">
              {profiles.length} Usuarios Registrados
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, institución o UID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Institution Filter */}
            <select
              value={institutionFilter}
              onChange={e => setInstitutionFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
            >
              <option value="all">Todas las Instituciones</option>
              {institutionsList.map(inst => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'active', 'suspended'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' && 'Todos'}
                  {st === 'active' && 'Activos'}
                  {st === 'suspended' && 'Suspendidos'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Institución y Nivel</th>
                  <th className="py-3 px-4">Motivo de Uso</th>
                  <th className="py-3 px-4">Fechas</th>
                  <th className="py-3 px-4">Proyectos</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No se encontraron usuarios registrados bajo los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map(p => {
                    const projectsCount = getUserProjectsCount(p.uid);

                    return (
                      <tr
                        key={p.uid}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          p.status === 'suspended' ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        {/* Columna 1: Usuario */}
                        <td className="py-3.5 px-4 font-sans">
                          <div>
                            <p className="font-bold text-slate-900 text-xs">
                              {p.nombre || 'Sin nombre registrado'}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                              {p.email}
                            </p>
                          </div>
                        </td>

                        {/* Columna 2: Institución y Nivel */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-semibold text-slate-800">{p.institucion || '—'}</p>
                            <p className="text-[10px] text-slate-500">{p.semestre_nivel}</p>
                          </div>
                        </td>

                        {/* Columna 3: Motivo */}
                        <td className="py-3.5 px-4">
                          <span className="capitalize font-medium text-slate-700">
                            {p.motivo_uso.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Columna 4: Fechas */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-[11px]">
                            <p className="text-slate-600">
                              Reg: {new Date(p.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-slate-400 text-[10px]">
                              Último: {p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleDateString() : '—'}
                            </p>
                          </div>
                        </td>

                        {/* Columna 5: Proyectos */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 text-xs">
                            {projectsCount}
                          </span>
                          <span className="text-slate-400 text-[11px]"> redes</span>
                        </td>

                        {/* Columna 6: Estado */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.status === 'active' ? 'Activo' : 'Suspendido'}
                          </span>
                        </td>

                        {/* Columna 7: Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedProfile(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Ver Ficha</span>
                            </button>
                            <button
                              onClick={() => setSuspendingProfile(p)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                p.status === 'active'
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={p.status === 'active' ? 'Suspender cuenta' : 'Reactivar cuenta'}
                            >
                              {p.status === 'active' ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-emerald-600" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail Modal */}
        {selectedProfile && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                    {selectedProfile.nombre ? selectedProfile.nombre.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {selectedProfile.nombre || 'Usuario'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">{selectedProfile.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Institución</span>
                    <span className="font-semibold text-slate-800">{selectedProfile.institucion}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Nivel / Semestre</span>
                    <span className="font-semibold text-slate-800">{selectedProfile.semestre_nivel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Motivo</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {selectedProfile.motivo_uso.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Estado</span>
                    <span
                      className={`font-bold ${
                        selectedProfile.status === 'active' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {selectedProfile.status === 'active' ? 'Activo' : 'Suspendido'}
                    </span>
                  </div>
                </div>

                {selectedProfile.motivo_detalle && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Descripción del estudio</span>
                    <p className="text-slate-700">{selectedProfile.motivo_detalle}</p>
                  </div>
                )}

                {/* Projects of this user */}
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-slate-900 block">
                    Redes Creadas ({getUserProjectsCount(selectedProfile.uid)}):
                  </span>
                  {getUserProjectsList(selectedProfile.uid).length === 0 ? (
                    <p className="text-slate-400 italic">No ha creado redes semánticas aún.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {getUserProjectsList(selectedProfile.uid).map(pr => (
                        <div
                          key={pr.id}
                          className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{pr.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {pr.id}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              pr.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {pr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suspend Confirmation Modal */}
        {suspendingProfile && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  suspendingProfile.status === 'active'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                {suspendingProfile.status === 'active'
                  ? '¿Suspender acceso al usuario?'
                  : '¿Reactivar acceso al usuario?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {suspendingProfile.status === 'active'
                  ? `Estás a punto de suspender a ${suspendingProfile.email}. El usuario no podrá acceder a su biblioteca de proyectos hasta que sea reactivado.`
                  : `Se restablecerá el acceso a la plataforma para ${suspendingProfile.email}.`}
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSuspendingProfile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleToggleStatus}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white ${
                    suspendingProfile.status === 'active'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {actionLoading
                    ? 'Procesando...'
                    : suspendingProfile.status === 'active'
                    ? 'Sí, suspender cuenta'
                    : 'Sí, reactivar cuenta'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
