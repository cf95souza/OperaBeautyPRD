import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Bell, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatDate, formatDateTime } from '../../utils/formatters';

/**
 * Mural de Avisos Globais da Plataforma (Broadcast para Salões) - Rosé Editorial
 */
const AvisosAdmin = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    is_active: true,
    expires_at: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await api.superadmin.listAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      showError('Erro ao carregar comunicados da plataforma.');
      console.error(err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type || 'info',
        is_active: Boolean(announcement.is_active),
        expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : ''
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        type: 'info',
        is_active: true,
        expires_at: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, expires_at: formData.expires_at || null };
      if (editingAnnouncement) {
        await api.superadmin.updateAnnouncement(editingAnnouncement.id, payload);
        showSuccess('Comunicado atualizado com sucesso!');
      } else {
        await api.superadmin.createAnnouncement(payload);
        showSuccess('Comunicado transmitido com sucesso!');
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      showError(err.message || 'Erro ao salvar comunicado.');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm('Excluir Comunicado?', 'O aviso será removido permanentemente de todos os painéis dos salões.')) {
      try {
        await api.superadmin.deleteAnnouncement(id);
        showSuccess('Comunicado excluído com sucesso!');
        fetchAnnouncements();
      } catch (err) {
        showError(err.message || 'Erro ao excluir comunicado.');
      }
    }
  };

  const renderTypeBadge = (type) => {
    switch (type) {
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Atenção
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Novidade
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Crítico / Urgente
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3 text-blue-600" />
            Informativo
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
            Mural de Avisos (Broadcast)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Transmita comunicados, alertas de manutenção e novidades diretamente para o painel de todos os salões parceiros.
          </p>
        </div>

        <button 
          onClick={() => openModal()} 
          className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Comunicado</span>
        </button>
      </div>

      {/* Lista de Avisos */}
      <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-lg text-ink">Comunicados Registrados</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft tabular-nums">
            {announcements.length} comunicados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <th className="p-4">Comunicado</th>
                <th className="p-4">Tipo</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Expiração</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-xs text-ink-soft italic">
                    Carregando avisos da plataforma...
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center">
                    <EstadoVazio
                      icone={<Bell className="w-7 h-7 text-brand" />}
                      titulo="Nenhum comunicado cadastrado"
                      descricao="Envie comunicados gerais, alertas de manutenção ou novidades a todos os salões da plataforma."
                      textoAcao="+ Criar Primeiro Comunicado"
                      aoClicarAcao={() => openModal()}
                      className="my-2 border-0 shadow-none bg-transparent"
                    />
                  </td>
                </tr>
              ) : (
                announcements.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-4 max-w-sm">
                      <p className="text-xs font-bold text-ink leading-tight">{item.title}</p>
                      <p className="text-[11px] text-ink-soft line-clamp-1 mt-1 leading-relaxed">{item.content}</p>
                    </td>
                    <td className="p-4">
                      {renderTypeBadge(item.type)}
                    </td>
                    <td className="p-4 text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                          <CheckCircle2 className="w-3 h-3" />
                          Visível
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600">
                          Pausado
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-ink-soft">
                      {item.expires_at ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {formatDateTime(item.expires_at)}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[11px] italic">Sem validade</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => openModal(item)} 
                          className="p-1.5 rounded-lg text-ink-soft hover:text-brand hover:bg-stone-100 transition-colors cursor-pointer" 
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-1.5 rounded-lg text-ink-soft hover:text-rose-600 hover:bg-stone-100 transition-colors cursor-pointer" 
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="relative w-full max-w-lg bg-white rounded-[26px] shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#FAF7F5] px-6 py-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-tint flex items-center justify-center text-brand">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-ink leading-tight">
                    {editingAnnouncement ? 'Editar Comunicado' : 'Novo Comunicado Broadcast'}
                  </h3>
                  <p className="text-xs text-ink-soft">
                    {editingAnnouncement ? 'Altere o teor ou data de expiração' : 'Será transmitido nos dashboards de todos os salões'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-full text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Título do Comunicado</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand font-medium" 
                  placeholder="Ex: Manutenção Programada dos Servidores"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Mensagem / Conteúdo</label>
                <textarea 
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand min-h-[110px]" 
                  placeholder="Escreva a mensagem clara que aparecerá no topo do painel das gestoras..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Tipo de Comunicado</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="info">Informativo (Azul)</option>
                    <option value="warning">Aviso / Atenção (Âmbar)</option>
                    <option value="success">Novidade / Release (Verde)</option>
                    <option value="error">Alerta Crítico (Vermelho)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Data de Expiração (Opcional)</label>
                  <input 
                    type="datetime-local" 
                    value={formData.expires_at} 
                    onChange={e => setFormData({...formData, expires_at: e.target.value})}
                    className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand" 
                  />
                  <p className="text-[11px] text-ink-soft mt-1">Se vazio, o aviso não expira automaticamente.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-line bg-stone-50 flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="chk_aviso_ativo"
                  checked={formData.is_active} 
                  onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                  className="w-4 h-4 text-brand rounded border-line"
                />
                <label htmlFor="chk_aviso_ativo" className="text-xs text-ink cursor-pointer">
                  <strong className="block text-ink font-semibold">Comunicado Ativo</strong>
                  <span className="text-[11px] text-ink-soft block mt-0.5">Visível para todas as gestoras e recepcionistas no dashboard.</span>
                </label>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2.5 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingAnnouncement ? 'Salvar Alterações' : 'Publicar Comunicado'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvisosAdmin;
