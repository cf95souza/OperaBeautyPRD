import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { Link } from 'react-router-dom';

const AvisosAdmin = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  
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
    try {
      setLoading(true);
      const data = await api.superadmin.listAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      showError('Erro ao carregar avisos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, expires_at: formData.expires_at || null };
      if (editingAnnouncement) {
        await api.superadmin.updateAnnouncement(editingAnnouncement.id, payload);
        showSuccess('Aviso atualizado com sucesso!');
      } else {
        await api.superadmin.createAnnouncement(payload);
        showSuccess('Aviso criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      showError(err.message || 'Erro ao salvar aviso.');
    }
  };

  const openModal = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        is_active: announcement.is_active,
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

  const handleDelete = async (id) => {
    if (await confirm('Tem certeza?', 'O aviso será excluído permanentemente.')) {
      try {
        await api.superadmin.deleteAnnouncement(id);
        showSuccess('Aviso excluído com sucesso!');
        fetchAnnouncements();
      } catch (err) {
        showError(err.message || 'Erro ao excluir aviso.');
      }
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-surface font-sans text-on-surface overflow-hidden">
      {/* Sidebar - Navigation Drawer */}
      <aside className="w-80 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col transition-all duration-300">
        <div className="p-xl border-b border-outline-variant/30 bg-surface-container-lowest flex flex-col gap-4">
          <h1 className="font-serif text-[28px] text-primary font-bold">OperaBeauty</h1>
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md font-semibold text-on-surface tracking-tight">Super Admin</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Gestão da Plataforma</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-md space-y-xs">
          <Link to="/superadmin" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>dashboard</span>
            Dashboard Global
          </Link>
          <Link to="/superadmin/tenants" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>storefront</span>
            Gerenciar Locatários
          </Link>
          <Link to="/superadmin/planos" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>subscriptions</span>
            Gestão de Planos
          </Link>
          <Link to="/superadmin/equipe" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>admin_panel_settings</span>
            Equipe SaaS
          </Link>
          <Link to="/superadmin/features" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>toggle_on</span>
            Feature Flags
          </Link>
          <Link to="/superadmin/avisos" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
            Mural de Avisos
          </Link>
          <Link to="/superadmin/auditoria" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>security</span>
            Auditoria e Saúde
          </Link>
          <Link to="/superadmin/configuracoes" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
            Configurações
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        {/* Top App Bar */}
        <header className="h-[72px] flex items-center justify-between px-xl border-b border-outline-variant/30 bg-surface-container-lowest sticky top-0 z-10">
          <div className="flex items-center gap-lg">
            <h2 className="font-title-lg text-title-lg text-on-surface">Mural de Avisos (Broadcast)</h2>
          </div>
          <div className="flex items-center gap-md">
            <button onClick={() => openModal()} className="flex items-center gap-sm bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-lg text-label-lg hover:bg-primary/90 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Novo Aviso
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-xl">
          <div className="max-w-6xl mx-auto">
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm">
              <div className="p-xl border-b border-outline-variant/30">
                <h3 className="font-title-md text-title-md text-on-surface">Comunicações da Plataforma</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Gerencie os comunicados que aparecem no painel de todos os clientes simultaneamente.</p>
              </div>

              {loading ? (
                <div className="p-xl flex justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-lowest border-b border-outline-variant/30">
                        <th className="py-4 px-6 font-label-sm text-label-sm font-medium text-on-surface-variant uppercase tracking-wider">Aviso</th>
                        <th className="py-4 px-6 font-label-sm text-label-sm font-medium text-on-surface-variant uppercase tracking-wider">Tipo</th>
                        <th className="py-4 px-6 font-label-sm text-label-sm font-medium text-on-surface-variant uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 font-label-sm text-label-sm font-medium text-on-surface-variant uppercase tracking-wider">Expiração</th>
                        <th className="py-4 px-6 font-label-sm text-label-sm font-medium text-on-surface-variant uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {announcements.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-on-surface-variant">Nenhum aviso cadastrado.</td>
                        </tr>
                      ) : (
                        announcements.map((item) => (
                          <tr key={item.id} className="hover:bg-surface-container-lowest/50 transition-colors group">
                            <td className="py-4 px-6">
                              <p className="font-label-lg text-label-lg text-on-surface font-medium">{item.title}</p>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-1">{item.content}</p>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${getTypeColor(item.type)}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${item.is_active ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                                {item.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-on-surface-variant">
                                {item.expires_at ? new Date(item.expires_at).toLocaleString() : 'Sem validade'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(item)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Editar">
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors" title="Excluir">
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-scrim/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-lg shadow-xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
              <h3 className="font-title-lg text-title-lg text-on-surface">
                {editingAnnouncement ? 'Editar Aviso' : 'Novo Aviso'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-2">Título do Aviso</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-surface-container px-4 py-3 rounded-xl text-on-surface border-none focus:ring-2 focus:ring-primary outline-none transition-shadow" 
                    placeholder="Ex: Sistema em Manutenção"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-2">Conteúdo / Mensagem</label>
                  <textarea 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full bg-surface-container px-4 py-3 rounded-xl text-on-surface border-none focus:ring-2 focus:ring-primary outline-none transition-shadow min-h-[120px]" 
                    placeholder="Escreva a mensagem que aparecerá para os clientes..."
                    required
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2">Tipo de Aviso</label>
                    <select 
                      value={formData.type} 
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl text-on-surface border-none focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="info">Info (Azul)</option>
                      <option value="warning">Aviso (Amarelo)</option>
                      <option value="success">Sucesso (Verde)</option>
                      <option value="error">Alerta Crítico (Vermelho)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-2">Data de Expiração</label>
                    <input 
                      type="datetime-local" 
                      value={formData.expires_at} 
                      onChange={e => setFormData({...formData, expires_at: e.target.value})}
                      className="w-full bg-surface-container px-4 py-3 rounded-xl text-on-surface border-none focus:ring-2 focus:ring-primary outline-none transition-shadow" 
                    />
                    <p className="text-xs text-on-surface-variant mt-1">Opcional. Se vazio, aviso não expira.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.is_active} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    <span className="ml-3 font-label-md text-label-md text-on-surface">Aviso Ativo (Visível)</span>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-outline-variant/30 bg-surface-container flex justify-end gap-3 mt-auto sticky bottom-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full font-label-lg text-label-lg text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-full font-label-lg text-label-lg text-on-primary bg-primary hover:bg-primary/90 transition-colors shadow-sm">
                  {editingAnnouncement ? 'Salvar Alterações' : 'Criar Aviso'}
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
