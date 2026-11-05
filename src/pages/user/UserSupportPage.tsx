import React, { useState, useEffect } from 'react';
import { UserLayout } from '../../components/layout/UserLayout';
import { useAuth } from '../../context/AuthContext';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { FeedbackItem, FeedbackType, Project } from '../../types';
import {
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Bug,
  Lightbulb,
  MessageCircle,
  FolderKanban,
  ChevronDown,
} from 'lucide-react';

export const UserSupportPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<FeedbackItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Form states
  const [type, setType] = useState<FeedbackType>('comment');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [relatedProjectId, setRelatedProjectId] = useState('');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const list = await storageAdapter.getUserFeedback(user.uid);
      setTickets(list);
    };
    load();

    const unsubProjects = storageAdapter.subscribeUserProjects(user.uid, setProjects);
    return () => unsubProjects();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Por favor escribe un asunto y una descripción detallada.');
      return;
    }

    if (!user) return;

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const selectedProj = projects.find(p => p.id === relatedProjectId);

      const created = await storageAdapter.submitFeedback({
        uid: user.uid,
        userEmail: user.email || 'anónimo',
        userName: profile?.nombre || user.displayName || undefined,
        userInstitution: profile?.institucion || undefined,
        type,
        subject: subject.trim(),
        description: description.trim(),
        relatedProjectId: relatedProjectId || undefined,
        relatedProjectTitle: selectedProj?.title || undefined,
      });

      setTickets(prev => [created, ...prev]);
      setSubject('');
      setDescription('');
      setRelatedProjectId('');
      setSuccessMsg('Tu mensaje ha sido enviado exitosamente al administrador de la plataforma.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'recibido':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Recibido</span>;
      case 'en_revision':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">En revisión</span>;
      case 'resuelto':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Resuelto</span>;
      case 'cerrado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Cerrado</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (t: FeedbackType) => {
    switch (t) {
      case 'bug':
        return <Bug className="w-4 h-4 text-rose-500" />;
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case 'doubt':
        return <HelpCircle className="w-4 h-4 text-sky-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-primary-500" />;
    }
  };

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            <span>Comentarios, Sugerencias y Soporte</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Canal directo de comunicación con el administrador para resolver dudas metodológicas, sugerir mejoras o reportar problemas técnicos.
          </p>
        </div>

        {/* Card: New Ticket Form */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
            Enviar Nuevo Mensaje
          </h2>

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Category / Type */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Tipo de Mensaje
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'comment', label: 'Comentario', icon: MessageCircle },
                  { value: 'suggestion', label: 'Sugerencia', icon: Lightbulb },
                  { value: 'bug', label: 'Problema Técnico', icon: Bug },
                  { value: 'doubt', label: 'Duda Metodológica', icon: HelpCircle },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        type === opt.value
                          ? 'bg-primary-50 border-primary-500 text-primary-900 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedbackType"
                        value={opt.value}
                        checked={type === opt.value}
                        onChange={() => setType(opt.value as FeedbackType)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] truncate">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Asunto */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Asunto *
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                placeholder="Ej. Duda con el cálculo de FMG en dos estímulos..."
                className="w-full border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Proyecto Relacionado (Opcional) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Proyecto Relacionado (Opcional)
              </label>
              <select
                value={relatedProjectId}
                onChange={e => setRelatedProjectId(e.target.value)}
                className="w-full border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">-- No vincular a ningún proyecto específico --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Descripción Detallada *
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="Describe tu duda, propuesta de mejora o los pasos que causaron un comportamiento inesperado..."
                className="w-full border border-slate-250 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Enviando...' : 'Enviar Mensaje'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card: User Tickets History */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-400">
                Mis Mensajes y Respuestas
              </h2>
              <p className="text-xs text-slate-500">
                Consulta el estado de tus solicitudes y las respuestas recibidas.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">{tickets.length} mensajes</span>
          </div>

          {tickets.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 space-y-1">
              <MessageSquare className="w-6 h-6 mx-auto text-slate-300" />
              <p>Aún no has enviado mensajes de soporte o comentarios.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map(t => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(t.type)}
                      <h3 className="font-bold text-slate-900 text-xs">{t.subject}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(t.status)}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {t.description}
                  </p>

                  {t.relatedProjectTitle && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      <FolderKanban className="w-3 h-3 text-slate-400" />
                      <span>Proyecto: {t.relatedProjectTitle}</span>
                    </div>
                  )}

                  {/* Admin Response Box */}
                  {t.adminResponse && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-950">
                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800">
                        <span>Respuesta del Administrador:</span>
                        {t.adminResponseAt && (
                          <span className="font-normal font-mono text-emerald-600">
                            {new Date(t.adminResponseAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{t.adminResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};
