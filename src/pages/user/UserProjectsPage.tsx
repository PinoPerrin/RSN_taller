import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserLayout } from '../../components/layout/UserLayout';
import { useAuth } from '../../context/AuthContext';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { Project, Stimulus } from '../../types';
import {
  FolderKanban,
  PlusCircle,
  Search,
  Radio,
  Network,
  Compass,
  Edit2,
  Copy,
  Archive,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Sparkles,
} from 'lucide-react';

export const UserProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Rename modal
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Delete modal
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = storageAdapter.subscribeUserProjects(user.uid, setProjects);
    return () => unsub();
  }, [user]);

  const handleDuplicate = async (project: Project) => {
    if (!user) return;
    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPublicId = `pub_${Math.random().toString(36).substring(2, 8)}`;
    const cloned: Project = {
      ...project,
      id: newId,
      publicId: newPublicId,
      title: `${project.title} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerUid: user.uid,
    };

    // Save project
    await storageAdapter.saveProject(cloned);

    // Copy stimuli
    const origStim = await storageAdapter.getStimuli(project.id);
    for (const s of origStim) {
      await storageAdapter.saveStimulus({
        ...s,
        id: `stim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        projectId: newId,
      });
    }
  };

  const handleToggleArchive = async (project: Project) => {
    const nextStatus = project.status === 'archived' ? 'published' : 'archived';
    await storageAdapter.saveProject({
      ...project,
      status: nextStatus,
    });
  };

  const handleConfirmRename = async () => {
    if (!renamingProject || !newTitle.trim()) return;
    await storageAdapter.saveProject({
      ...renamingProject,
      title: newTitle.trim(),
    });
    setRenamingProject(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    await storageAdapter.deleteProject(deletingProject.id);
    setDeletingProject(null);
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'published') return p.status === 'published';
    if (statusFilter === 'draft') return p.status === 'draft';
    if (statusFilter === 'archived') return p.status === 'archived';
    return true;
  });

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-primary-600" />
              <span>Mis Proyectos y Redes Semánticas</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administra tus estudios, abre o cierra la recolección con código QR y analiza los resultados.
            </p>
          </div>

          <Link
            to="/app/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nueva Red Semántica</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por título o descripción..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'published', 'draft', 'archived'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' && `Todos (${projects.length})`}
                {tab === 'published' && `Activos (${projects.filter(p => p.status === 'published').length})`}
                {tab === 'draft' && `Borradores (${projects.filter(p => p.status === 'draft').length})`}
                {tab === 'archived' && `Archivados (${projects.filter(p => p.status === 'archived').length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron proyectos</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay proyectos que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProjects.map(project => {
              const stim = storageAdapter.getStimuliSync(project.id);
              const resps = storageAdapter.getResponses(project.id);

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  {/* Left Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          project.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : project.status === 'archived'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {project.status === 'published'
                          ? 'Recolección Abierta'
                          : project.status === 'archived'
                          ? 'Archivado'
                          : 'Borrador'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: {project.id}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{project.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {project.description || 'Sin descripción metodológica registrada.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span><strong>{stim.length}</strong> estímulos</span>
                      <span>•</span>
                      <span><strong>{resps.length}</strong> respuestas registradas</span>
                      <span>•</span>
                      <span>Creado: {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <Link
                      to={`/app/projects/${project.id}/live`}
                      className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border border-emerald-200"
                      title="Abrir sala de recolección en vivo con código QR"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Sala QR</span>
                    </Link>

                    <Link
                      to={`/app/projects/${project.id}/traditional`}
                      className="px-3 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border border-primary-200"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Análisis</span>
                    </Link>

                    <Link
                      to={`/app/projects/${project.id}/pathfinder`}
                      className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border border-purple-200"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Pathfinder</span>
                    </Link>

                    {/* Secondary menu buttons */}
                    <div className="flex items-center gap-1 pt-1 sm:pt-0">
                      <button
                        onClick={() => {
                          setRenamingProject(project);
                          setNewTitle(project.title);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Renombrar proyecto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(project)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Duplicar proyecto"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleArchive(project)}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                        title={project.status === 'archived' ? 'Desarchivar' : 'Archivar proyecto'}
                      >
                        <Archive className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingProject(project)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rename Modal */}
        {renamingProject && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Renombrar Proyecto</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nuevo título del proyecto
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRenamingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmRename}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingProject && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">¿Eliminar proyecto permanentemente?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Estás a punto de borrar <strong>«{deletingProject.title}»</strong> y todas sus respuestas y estímulos asociados. Esta acción no se puede deshacer.
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Sí, eliminar proyecto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};
