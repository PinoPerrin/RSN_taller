import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Project, Stimulus, ProjectStatus, WeightingMethod, CutoffCriterion } from '../../types';
import { storageAdapter, localDB } from '../../services/storage/storageAdapter';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ShareQRModal } from '../../components/common/ShareQRModal';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Play,
  Pause,
  Archive,
  FileCheck,
  Settings,
  HelpCircle,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

export const ProjectManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [qrModalProject, setQrModalProject] = useState<Project | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [projectStimuliMap, setProjectStimuliMap] = useState<Record<string, Stimulus[]>>({});

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [stimuliList, setStimuliList] = useState<Stimulus[]>([]);
  const [newStimulusText, setNewStimulusText] = useState('');

  useEffect(() => {
    const unsub = storageAdapter.subscribeProjects(setProjects);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    projects.forEach(p => {
      storageAdapter.getStimuli(p.id).then(stims => {
        setProjectStimuliMap(prev => ({ ...prev, [p.id]: stims }));
      });
    });
  }, [projects]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (location.pathname.endsWith('/new')) {
      navigate('/admin/projects', { replace: true });
    }
  };

  const openCreateModal = () => {
    const newId = `proj-${Date.now().toString(36)}`;
    const newProj: Project = {
      id: newId,
      publicId: newId,
      title: 'Nuevo Estudio RSN',
      description: 'Estudio de Redes Semánticas Naturales',
      researcher: 'Investigador Principal',
      institution: 'Universidad / Centro de Investigación',
      objective: 'Explorar las representaciones y distancias semánticas asociadas a los conceptos evaluados.',
      language: 'es',
      privacyNotice: 'Los datos recolectados son confidenciales y se procesan de forma anónima exclusivamente con fines científicos y académicos.',
      consentText: 'He leído la información, comprendo la naturaleza voluntaria de mi participación y autorizo el uso anónimo de mis respuestas con fines científicos.',
      welcomeMessage: '¡Bienvenido! En esta actividad exploraremos las palabras que asocias espontáneamente con determinados conceptos.',
      thankYouMessage: '¡Muchas gracias por tu valiosa colaboración! Tus respuestas han sido registradas y contribuirán a construir la red semántica grupal.',
      status: 'draft',
      version: 1,
      settings: {
        maxAssociations: 10,
        timeLimitSeconds: 60,
        randomizeStimuli: false,
        allowMultiwordExpressions: false,
        weightingMethod: 'canonical',
        defaultCutoffCriterion: 'scree_test',
        requireFullRanking: true,
        allowAnonymous: true,
        collectDemographics: false,
        demographicFields: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingProject(newProj);
    setStimuliList([
      { id: `stim-${Date.now()}-1`, projectId: newId, text: 'CONCEPTO 1', order: 1 },
      { id: `stim-${Date.now()}-2`, projectId: newId, text: 'CONCEPTO 2', order: 2 },
    ]);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      openCreateModal();
    }
  }, [location.pathname]);

  const openEditModal = async (proj: Project) => {
    setEditingProject({ ...proj });
    const currentStimuli = await storageAdapter.getStimuli(proj.id);
    setStimuliList([...currentStimuli]);
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    const projToSave = { ...editingProject, updatedAt: new Date().toISOString() };

    // Update state immediately for instant feedback
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === projToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = projToSave;
        return copy;
      }
      return [projToSave, ...prev];
    });

    await storageAdapter.saveProject(projToSave);

    // Delete any stimuli that were removed in the modal
    const existingStimuli = localDB.getStimuli(projToSave.id);
    const currentIds = new Set(stimuliList.map(s => s.id));
    for (const oldStim of existingStimuli) {
      if (!currentIds.has(oldStim.id)) {
        await storageAdapter.deleteStimulus(oldStim.id, projToSave.id);
      }
    }

    // Save all current stimuli sequentially
    for (let idx = 0; idx < stimuliList.length; idx++) {
      await storageAdapter.saveStimulus({
        ...stimuliList[idx],
        projectId: projToSave.id,
        order: idx + 1,
      });
    }

    handleCloseModal();
  };

  const handleDeleteProject = async (projectId: string, title: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el proyecto "${title}"? Esta acción no se puede deshacer.`)) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      await storageAdapter.deleteProject(projectId);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, status: newStatus } : p)));
    await storageAdapter.setProjectStatus(projectId, newStatus);
  };

  const handleAddStimulus = () => {
    if (!newStimulusText.trim() || !editingProject) return;
    const newStim: Stimulus = {
      id: `stim-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: editingProject.id,
      text: newStimulusText.trim().toUpperCase(),
      order: stimuliList.length + 1,
    };
    setStimuliList([...stimuliList, newStim]);
    setNewStimulusText('');
  };

  const handleRemoveStimulus = (stimId: string) => {
    setStimuliList(stimuliList.filter(s => s.id !== stimId));
  };

  const handleCopyLink = (pId: string) => {
    const url = `${window.location.origin}/p/${pId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(pId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-primary-600" />
              Gestión de Proyectos de Investigación
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de estudios, estímulos, parámetros psicométricos y enlaces de acceso.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Proyecto</span>
          </button>
        </div>

        {/* Projects List */}
        <div className="grid grid-cols-1 gap-4">
          {projects.map(project => {
            const stimuli = projectStimuliMap[project.id] || localDB.getStimuli(project.id);
            const sessions = localDB.getSessions(project.id);
            const completedCount = sessions.filter(s => s.status === 'completed').length;

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-slate-300 shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        project.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : project.status === 'draft'
                          ? 'bg-slate-100 text-slate-700'
                          : project.status === 'paused'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {project.status === 'published' && '● Publicado / Abierto'}
                      {project.status === 'draft' && 'Borrador'}
                      {project.status === 'paused' && 'En Pausa'}
                      {project.status === 'closed' && 'Cerrado'}
                      {project.status === 'archived' && 'Archivado'}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {project.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-slate-500">
                    <span>
                      <strong>Investigador:</strong> {project.researcher} ({project.institution})
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Estímulos ({stimuli.length}):</strong>{' '}
                      {stimuli.map(s => s.text).join(', ') || 'Sin estímulos'}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Ponderación:</strong>{' '}
                      {project.settings.weightingMethod === 'canonical' ? 'Canónica 11-r (Figueroa)' : 'Proporcional (Valdez)'}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Respuestas:</strong>{' '}
                      <span className="font-bold text-slate-800">{completedCount}</span> completadas
                    </span>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    onClick={() => setQrModalProject(project)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                    title="Ver Código QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopyLink(project.publicId)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                    title="Copiar enlace de participantes"
                  >
                    {copiedId === project.publicId ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => openEditModal(project)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                    title="Editar configuración y estímulos"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => navigate(`/admin/projects/${project.id}/interpretation`)}
                    className="p-2.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                    title="Interpretación Semántica con IA"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>

                  {/* Status toggle button */}
                  {project.status === 'published' ? (
                    <button
                      onClick={() => handleStatusChange(project.id, 'paused')}
                      className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pausar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(project.id, 'published')}
                      className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Publicar
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteProject(project.id, project.title)}
                    className="p-2.5 rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    title="Eliminar proyecto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Create/Edit Project */}
        {isModalOpen && editingProject && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingProject.id ? 'Configuración del Estudio' : 'Crear Nuevo Estudio'}
                  </h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-6">
                {/* General Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Título del Estudio</label>
                    <input
                      type="text"
                      required
                      value={editingProject.title}
                      onChange={e => setEditingProject({ ...editingProject, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Investigador Responsable</label>
                    <input
                      type="text"
                      required
                      value={editingProject.researcher}
                      onChange={e => setEditingProject({ ...editingProject, researcher: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Institución</label>
                    <input
                      type="text"
                      required
                      value={editingProject.institution}
                      onChange={e => setEditingProject({ ...editingProject, institution: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Descripción u Objetivo</label>
                    <textarea
                      rows={2}
                      value={editingProject.description}
                      onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    />
                  </div>
                </div>

                {/* Stimuli Section */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary-600" />
                      Palabras Estímulo ({stimuliList.length})
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Conceptos que evaluarán los participantes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nueva palabra estímulo (ej. DOLOR, BIENESTAR)..."
                      value={newStimulusText}
                      onChange={e => setNewStimulusText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStimulus();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleAddStimulus}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {stimuliList.map((s, idx) => (
                      <div
                        key={s.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 shadow-2xs"
                      >
                        <span className="text-slate-400 font-semibold">{idx + 1}.</span>
                        <span>{s.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStimulus(s.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experimental Settings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Parámetros Metodológicos
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Tiempo por estímulo</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={15}
                          max={300}
                          value={editingProject.settings.timeLimitSeconds}
                          onChange={e =>
                            setEditingProject({
                              ...editingProject,
                              settings: {
                                ...editingProject.settings,
                                timeLimitSeconds: parseInt(e.target.value) || 60,
                              },
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400">seg</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Máx. asociaciones</label>
                      <input
                        type="number"
                        min={3}
                        max={20}
                        value={editingProject.settings.maxAssociations}
                        onChange={e =>
                          setEditingProject({
                            ...editingProject,
                            settings: {
                              ...editingProject.settings,
                              maxAssociations: parseInt(e.target.value) || 10,
                            },
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Esquema de Ponderación</label>
                      <select
                        value={editingProject.settings.weightingMethod}
                        onChange={e =>
                          setEditingProject({
                            ...editingProject,
                            settings: {
                              ...editingProject.settings,
                              weightingMethod: e.target.value as WeightingMethod,
                            },
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                      >
                        <option value="canonical">Canónica (11 - r)</option>
                        <option value="proportional">Proporcional ((m+1-r)/m * 10)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Consent & Privacy */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Consentimiento y Privacidad
                  </h4>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">Texto de Consentimiento Informado</label>
                    <textarea
                      rows={2}
                      value={editingProject.consentText}
                      onChange={e => setEditingProject({ ...editingProject, consentText: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 font-medium"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-xs"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Code Share Modal */}
        {qrModalProject && (
          <ShareQRModal
            isOpen={true}
            onClose={() => setQrModalProject(null)}
            project={qrModalProject}
          />
        )}
      </div>
    </AdminLayout>
  );
};
