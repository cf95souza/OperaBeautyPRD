import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const AvisosAdmin = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { showSuccess, showError, confirm } = useNotification();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const handleLogout = () => {
    api.auth.logout();
    navigate('/superadmin/login');
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await api.superadmin.listAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      showError('Erro ao carregar avisos.');
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
    <div className="font-body-md text-body-md antialiased overflow-x-hidden min-h-screen flex bg-surface text-on-surface animate-fade-in-up">
      
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}

      {/* Navigation Drawer */}
      <aside className={`flex flex-col h-screen w-80 fixed top-0 bg-surface-container-lowest border-r border-outline-variant/30 z-50 transition-all duration-300 ${isDrawerOpen ? 'left-0' : '-left-80'} md:left-0`}>
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
        <nav className="flex flex-col gap-xs flex-1 py-md">
          <Link to="/superadmin" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>dashboard</span>
            Painel Geral
          </Link>
          <Link to="/superadmin/tenants" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>storefront</span>
            Salões e Clientes
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
        <div className="px-md mt-auto flex flex-col gap-2 pb-md">
          <button onClick={handleLogout} className="flex items-center gap-md py-3 px-4 text-error hover:bg-error-container rounded-lg font-label-md text-label-md transition-colors w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            Sair do Sistema
          </button>
          <div className="flex items-center gap-sm p-4 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-secondary">person</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Super Admin</span>
              <span className="font-label-sm text-label-sm text-secondary">Administrador do Sistema</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen bg-background">
        
        {/* Top App Bar (Mobile) */}
        <header className="md:hidden flex justify-between items-center px-gutter py-3 w-full max-w-full bg-surface shadow-sm sticky top-0 z-30 pt-[max(env(safe-area-inset-top),_0.75rem)] min-h-[4rem]">
          <div className="flex items-center gap-sm">
            <button onClick={() => setIsDrawerOpen(true)} className="material-symbols-outlined text-primary p-2">menu</button>
            <div className="flex items-center gap-xs cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-primary font-headline-md text-headline-md">spa</span>
              <span className="font-headline-md text-[20px] text-primary tracking-tight">Admin Mestre</span>
            </div>
          </div>
          <div className="w-8 h-8"></div>
        </header>

        <div className="p-container-margin md:p-xl flex-1 flex flex-col gap-xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Mural de Avisos (Broadcast)</h1>
              <p className="font-body-md text-body-md text-secondary">Gerencie os comunicados que aparecem no painel de todos os clientes simultaneamente.</p>
            </div>
            <button onClick={() => openModal()} className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full flex items-center gap-sm hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Novo Aviso
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm">
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
      </main>

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-surface-variant bg-surface">
              <h3 className="font-headline-sm text-headline-sm">
                {editingAnnouncement ? 'Editar Aviso' : 'Novo Aviso'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-error transition-colors p-1 rounded-full hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-surface">
              <div className="p-6 space-y-5">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Título do Aviso</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-surface-variant px-4 py-3 rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none transition-shadow" 
                    placeholder="Ex: Sistema em Manutenção"
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Conteúdo / Mensagem</label>
                  <textarea 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full bg-surface-container-lowest border border-surface-variant px-4 py-3 rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none transition-shadow min-h-[120px]" 
                    placeholder="Escreva a mensagem que aparecerá para os clientes..."
                    required
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-secondary mb-1">Tipo de Aviso</label>
                    <select 
                      value={formData.type} 
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-surface-variant px-4 py-3 rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="info">Info (Azul)</option>
                      <option value="warning">Aviso (Amarelo)</option>
                      <option value="success">Sucesso (Verde)</option>
                      <option value="error">Alerta Crítico (Vermelho)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block font-label-sm text-secondary mb-1">Data de Expiração</label>
                    <input 
                      type="datetime-local" 
                      value={formData.expires_at} 
                      onChange={e => setFormData({...formData, expires_at: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-surface-variant px-4 py-3 rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none transition-shadow" 
                    />
                    <p className="text-xs text-on-surface-variant mt-1">Opcional. Se vazio, não expira.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.is_active} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                      className="w-5 h-5 rounded text-primary focus:ring-primary border-surface-variant"
                    />
                    <span className="font-label-md text-label-md text-on-surface">Aviso Ativo (Visível)</span>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-surface-variant bg-surface flex justify-end gap-3 sticky bottom-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full font-label-md border border-surface-variant text-secondary hover:bg-surface-container-low transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-full font-label-md bg-primary text-on-primary hover:opacity-90 transition-colors shadow-sm">
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
