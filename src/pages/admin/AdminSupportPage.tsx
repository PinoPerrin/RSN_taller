import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { FeedbackItem, FeedbackStatus, FeedbackType } from '../../types';
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  MessageCircle,
  Bug,
  Lightbulb,
  HelpCircle,
  FolderKanban,
  Edit3,
  X,
} from 'lucide-react';

export const AdminSupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<FeedbackItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');

  // Selected ticket to reply/edit
  const [selectedTicket, setSelectedTicket] = useState<FeedbackItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<FeedbackStatus>('en_revision');
  const [internalNotes, setInternalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const list = await storageAdapter.getAllFeedback();
      setTickets(list);
    };
    load();
  }, []);

  const handleOpenTicket = (t: FeedbackItem) => {
    setSelectedTicket(t);
    setReplyText(t.adminResponse || '');
    setNewStatus(t.status);
    setInternalNotes(t.internalNotes || '');
    setSaveSuccess(false);
  };

  const handleSaveTicket = async () => {
    if (!selectedTicket) return;
    setActionLoading(true);
    try {
      await storageAdapter.updateFeedbackStatus(
        selectedTicket.id,
        newStatus,
        replyText.trim() || undefined,
        internalNotes.trim() || undefined
      );

      await storageAdapter.logAdminAction({
        adminUid: 'admin',
        action: 'REPLY_FEEDBACK',
        targetType: 'feedback',
        targetId: selectedTicket.id,
        details: `Respuesta y actualización de estado a ${newStatus} para ticket ${selectedTicket.subject}`,
      });

      setTickets(prev =>
        prev.map(t =>
          t.id === selectedTicket.id
            ? {
                ...t,
                status: newStatus,
                adminResponse: replyText.trim() || undefined,
                adminResponseAt: replyText.trim() ? new Date().toISOString() : t.adminResponseAt,
                internalNotes: internalNotes.trim() || undefined,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
      setSaveSuccess(true);
    } catch (err) {
      console.error('Error updating ticket:', err);
    } finally {
      setActionLoading(false);
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

  const getStatusBadge = (st: FeedbackStatus) => {
    switch (st) {
      case 'recibido':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Recibido</span>;
      case 'en_revision':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">En revisión</span>;
      case 'resuelto':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Resuelto</span>;
      case 'cerrado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Cerrado</span>;
    }
  };

  const pendingCount = tickets.filter(t => t.status === 'recibido' || t.status === 'en_revision').length;

  const filteredTickets = tickets.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.subject.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      t.userEmail.toLowerCase().includes(term) ||
      (t.userName || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary-600" />
              <span>Bandeja Central de Comentarios y Soporte</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Atención a dudas, sugerencias y problemas técnicos enviados por los investigadores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              {pendingCount} Pendientes de Atención
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por usuario, correo o palabras clave..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los Tipos</option>
              <option value="comment">Comentarios</option>
              <option value="suggestion">Sugerencias</option>
              <option value="bug">Problemas Técnicos</option>
              <option value="doubt">Dudas Metodológicas</option>
            </select>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'recibido', 'en_revision', 'resuelto', 'cerrado'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' && 'Todos'}
                  {st === 'recibido' && 'Recibidos'}
                  {st === 'en_revision' && 'En revisión'}
                  {st === 'resuelto' && 'Resueltos'}
                  {st === 'cerrado' && 'Cerrados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="py-3 px-4">Tipo y Asunto</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Proyecto</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay mensajes o reportes bajo los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenTicket(t)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      {/* Columna 1: Tipo y Asunto */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(t.type)}
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{t.subject}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 max-w-[260px]">
                              {t.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Columna 2: Usuario */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-semibold text-slate-800">{t.userName || 'Usuario'}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                            {t.userEmail}
                          </p>
                        </div>
                      </td>

                      {/* Columna 3: Fecha */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>

                      {/* Columna 4: Proyecto */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {t.relatedProjectTitle ? (
                          <span className="font-medium text-slate-700 truncate max-w-[140px] block">
                            {t.relatedProjectTitle}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Columna 5: Estado */}
                      <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>

                      {/* Columna 6: Acción */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenTicket(t);
                          }}
                          className="px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t.adminResponse ? 'Ver / Editar' : 'Responder'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reply & Status Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedTicket.type)}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedTicket.subject}</h3>
                    <p className="text-xs text-slate-500">
                      De: {selectedTicket.userName || 'Usuario'} ({selectedTicket.userEmail})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Respuesta y estado actualizados correctamente.</span>
                </div>
              )}

              {/* Original User Message */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Mensaje del Investigador:</span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </p>
                {selectedTicket.relatedProjectTitle && (
                  <p className="text-[11px] text-primary-700 font-semibold pt-1">
                    Proyecto vinculado: {selectedTicket.relatedProjectTitle}
                  </p>
                )}
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado del Reporte
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as FeedbackStatus)}
                  className="w-full text-xs rounded-xl border border-slate-250 p-2 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="recibido">Recibido (Pendiente de revisión)</option>
                  <option value="en_revision">En revisión (En análisis o desarrollo)</option>
                  <option value="resuelto">Resuelto (Atendido con respuesta)</option>
                  <option value="cerrado">Cerrado (Completado y archivado)</option>
                </select>
              </div>

              {/* Response Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Respuesta Oficial al Usuario
                </label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Escribe tu respuesta o explicación metodológica/técnica. Esta respuesta será visible para el usuario en su portal..."
                  className="w-full text-xs rounded-xl border border-slate-250 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas Internas de Administración (Privado)
                </label>
                <input
                  type="text"
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Comentarios solo visibles para administradores..."
                  className="w-full text-xs rounded-xl border border-slate-250 p-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSaveTicket}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Guardando...' : 'Guardar y Responder'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
