import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { Project, UserProfile } from '../../types';
import {
  FolderKanban,
  Search,
  Eye,
  Archive,
  Trash2,
  Users,
  Network,
  Compass,
  Radio,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const AdminUserProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Archive & Delete modals
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = storageAdapter.subscribeProjects(setProjects);
    storageAdapter.getAllUserProfiles().then(setUsers);
    return () => unsub();
  }, []);

  const getUserEmail = (ownerUid?: string) => {
    if (!ownerUid || ownerUid === 'admin') return 'Taller Oficial (Admin)';
    const u = users.find(user => user.uid === ownerUid);
    return u?.email || ownerUid;
  };

  const getUserInstitution = (ownerUid?: string) => {
    if (!ownerUid || ownerUid === 'admin') return 'Taller Oficial';
    const u = users.find(user => user.uid === ownerUid);
    return u?.institucion || '—';
  };

  const handleConfirmArchive = async () => {
    if (!archivingProject) return;
    const nextStatus = archivingProject.status === 'archived' ? 'published' : 'archived';
    setActionLoading(true);
    try {
      await storageAdapter.saveProject({
        ...archivingProject,
        status: nextStatus,
      });
      await storageAdapter.logAdminAction({
        adminUid: 'admin',
        action: nextStatus === 'archived' ? 'ARCHIVE_PROJECT' : 'UNARCHIVE_PROJECT',
        targetType: 'project',
        targetId: archivingProject.id,
        details: `Cambio de estado a ${nextStatus} para ${archivingProject.title}`,
      });
    } finally {
      setActionLoading(false);
      setArchivingProject(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    setActionLoading(true);
    try {
      await storageAdapter.deleteProject(deletingProject.id);
      await storageAdapter.logAdminAction({
        adminUid: 'admin',
        action: 'DELETE_PROJECT_ADMIN',
        targetType: 'project',
        targetId: deletingProject.id,
        details: `Eliminación administrativa del proyecto ${deletingProject.title}`,
      });
    } finally {
      setActionLoading(false);
      setDeletingProject(null);
    }
  };

  const filtered = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    const ownerEmail = getUserEmail(p.ownerUid).toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term) ||
      ownerEmail.includes(term);

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-primary-600" />
              <span>Proyectos de Usuarios (Modo Inspección)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Supervisión de todas las redes creadas en la plataforma, con acceso de solo lectura e inspección científica.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-200 text-xs font-bold">
              {projects.length} Proyectos Totales
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por título, ID o correo del propietario..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'published', 'draft', 'archived'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === tab ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'all' && `Todos (${projects.length})`}
                {tab === 'published' && 'Activos'}
                {tab === 'draft' && 'Borradores'}
                {tab === 'archived' && 'Archivados'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="py-3 px-4">Proyecto</th>
                  <th className="py-3 px-4">Propietario / Institución</th>
                  <th className="py-3 px-4">Estímulos y Respuestas</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Creación</th>
                  <th className="py-3 px-4 text-right">Inspección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No se encontraron proyectos bajo los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => {
                    const stim = storageAdapter.getStimuliSync(p.id);
                    const resps = storageAdapter.getResponses(p.id);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Columna 1: Proyecto */}
                        <td className="py-3.5 px-4 font-sans">
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{p.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                              ID: {p.id}
                            </p>
                          </div>
                        </td>

                        {/* Columna 2: Propietario */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-semibold text-slate-800">{getUserEmail(p.ownerUid)}</p>
                            <p className="text-[10px] text-slate-500">{getUserInstitution(p.ownerUid)}</p>
                          </div>
                        </td>

                        {/* Columna 3: Métricas */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">
                            {stim.length} estímulos • {resps.length} respuestas
                          </p>
                        </td>

                        {/* Columna 4: Estado */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'archived'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        {/* Columna 5: Creación */}
                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>

                        {/* Columna 6: Acciones */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/admin/projects/${p.id}/traditional`}
                              className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-primary-200"
                              title="Inspeccionar cálculos RSN"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspeccionar</span>
                            </Link>

                            <button
                              onClick={() => setArchivingProject(p)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title={p.status === 'archived' ? 'Desarchivar' : 'Archivar proyecto'}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingProject(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar proyecto permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Archive Modal */}
        {archivingProject && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                {archivingProject.status === 'archived' ? '¿Desarchivar proyecto?' : '¿Archivar proyecto?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Proyecto: <strong>«{archivingProject.title}»</strong>.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setArchivingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmArchive}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deletingProject && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">¿Eliminar proyecto administrativamente?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Estás a punto de borrar <strong>«{deletingProject.title}»</strong> y todas sus respuestas de la base de datos. Esta acción se registrará en el registro de auditoría.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeletingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  {actionLoading ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
