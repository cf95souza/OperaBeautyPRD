import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const GestaoClientes = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  const getVipBadge = (tier) => {
    const styles = {
      Prata: 'bg-slate-100 text-slate-700 border border-slate-200/80 shadow-[0_1px_3px_rgba(148,163,184,0.05)]',
      Ouro: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]/60 shadow-[0_1px_3px_rgba(180,83,9,0.03)]',
      VIP: 'bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]/60 shadow-[0_1px_3px_rgba(107,33,168,0.03)]',
      Black: 'bg-neutral-900 text-amber-200 border border-neutral-800 shadow-[0_1px_4px_rgba(0,0,0,0.1)] font-bold'
    };
    
    const label = tier || 'Prata';
    const styleClass = styles[label] || styles.Prata;
    
    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider transition-all duration-300 ${styleClass}`}>
        <span className="material-symbols-outlined text-[11px] filled" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
        {label}
      </span>
    );
  };

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Password Reset Modal State
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    fetchClients();
  }, [tenant]);

  const fetchClients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.clients.list(tenant.id);
      setClients(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao buscar clientes.");
    }
    setLoading(false);
  };

  const handleOpenResetPwd = (client) => {
    setSelectedClient(client);
    setNewPassword('');
    setShowPwdModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showError("A senha precisa ter pelo menos 4 caracteres.");
      return;
    }

    setIsResetting(true);
    try {
      await api.clients.updatePassword(selectedClient.id, newPassword);
      showSuccess(`Senha de ${selectedClient.name} alterada com sucesso! Informe a nova senha.`);
      setShowPwdModal(false);
    } catch (err) {
      console.error(err);
      showError("Erro ao redefinir a senha do cliente.");
    }
    setIsResetting(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  return (
    <>
      <div className="p-gutter md:p-xl flex-1 flex flex-col gap-lg max-w-[1200px] mx-auto w-full animate-fade-in-up">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span> Clientes
            </h2>
            <p className="font-body-md text-body-md text-secondary mt-1">Sua base de dados, fidelização e histórico.</p>
          </div>
          
          <div className="w-full sm:w-auto flex items-center gap-2">
             <div className="relative w-full sm:w-64">
               <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
               <input 
                 type="text" 
                 placeholder="Buscar por nome ou fone..." 
                 className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all font-body-sm"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
             </div>
          </div>
        </div>

        {/* Reset Password Modal */}
        {showPwdModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-[400px] rounded-2xl shadow-xl p-6 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowPwdModal(false)} className="absolute top-4 right-4 text-secondary hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Redefinir Senha</h3>
              <p className="font-body-sm text-secondary mb-6">Nova senha de acesso para <strong>{selectedClient?.name}</strong>.</p>
              
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Nova Senha</label>
                  <input 
                     required 
                     type="password" 
                     className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                     value={newPassword} 
                     onChange={e => setNewPassword(e.target.value)} 
                  />
                </div>
                <button type="submit" disabled={isResetting} className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:bg-on-primary-container transition-colors disabled:opacity-50">
                  {isResetting ? 'Redefinindo...' : 'Confirmar Nova Senha'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* List of Clients */}
        {errorMsg && (
           <div className="bg-error/10 border border-error/50 p-4 rounded-xl text-error mb-4">
              <strong>Erro ao carregar clientes:</strong> {errorMsg}
           </div>
        )}
        {loading ? (
          <div className="flex justify-center p-xl"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
        ) : clients.length === 0 && !errorMsg ? (
          <div className="text-center p-xl text-secondary bg-surface-container-lowest rounded-xl flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">groups</span>
            <p>Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {filteredClients.map((client) => {
              const age = client.birth_date ? new Date().getFullYear() - parseInt(String(client.birth_date).split('-')[0]) : '?';
              
              return (
                <div key={client.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow group relative">
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-primary-container text-primary font-headline-sm flex items-center justify-center uppercase shrink-0">
                            {client.name.charAt(0)}
                         </div>
                          <div>
                             <div className="flex items-center gap-2 flex-wrap">
                               <h3 className="font-label-lg text-label-lg text-on-surface line-clamp-1" title={client.name}>{client.name}</h3>
                               {getVipBadge(client.vip_tier)}
                             </div>
                             <p className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[14px]">phone_iphone</span> {client.phone}
                             </p>
                          </div>
                      </div>
                      
                      {/* Context Menu or Direct Action */}
                      <div className="flex items-center gap-1">
                        <a 
                           href={`https://wa.me/${client.phone.replace(/\D/g, '').startsWith('55') ? client.phone.replace(/\D/g, '') : '55' + client.phone.replace(/\D/g, '')}`}
                           target="_blank"
                           rel="noreferrer"
                           title="Chamar no WhatsApp"
                           className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366]/20 transition-colors shrink-0"
                        >
                           <span className="material-symbols-outlined text-[18px]">forum</span>
                        </a>
                        <button 
                           onClick={() => handleOpenResetPwd(client)}
                           title="Redefinir Senha"
                           className="w-8 h-8 rounded-full bg-surface-variant text-secondary flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                        >
                           <span className="material-symbols-outlined text-[18px]">key</span>
                        </button>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mb-4 bg-surface-container-low p-3 rounded-xl border border-outline-variant/50">
                      <div className="flex flex-col">
                         <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary mb-0.5">LTV (Gasto)</span>
                         <span className="font-label-md text-primary font-bold">R$ {Number(client.ltv || 0).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="font-label-sm text-[10px] uppercase tracking-widest text-secondary mb-0.5">Visitas</span>
                         <span className="font-label-md text-on-surface">{client.visits}</span>
                      </div>
                   </div>
                   
                   <Link 
                     to={`/${tenant_slug}/staff/ficha-cliente/${client.id}`}
                     className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-primary/20 text-primary font-label-md hover:bg-primary/5 transition-colors"
                   >
                     Abrir Ficha CRM <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                   </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default GestaoClientes;
