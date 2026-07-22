import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const PerfilCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session, loading: loadingTenant, logout } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const getVipBadge = (tier) => {
    const styles = {
      Prata: 'bg-slate-100 text-slate-700 border border-slate-200/80 shadow-[0_2px_4px_rgba(148,163,184,0.06)]',
      Ouro: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]/60 shadow-[0_2px_4px_rgba(180,83,9,0.04)]',
      VIP: 'bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]/60 shadow-[0_2px_4px_rgba(107,33,168,0.04)]',
      Black: 'bg-neutral-900 text-amber-200 border border-neutral-800 shadow-[0_2px_6px_rgba(0,0,0,0.12)] font-bold'
    };
    
    const label = tier || 'Prata';
    const styleClass = styles[label] || styles.Prata;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ${styleClass}`}>
        <span className="material-symbols-outlined text-[12px] filled" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
        {label}
      </span>
    );
  };

  // Fetch client data
  useEffect(() => {
    if (loadingTenant) return;
    if (!session || session.role !== 'client') {
      navigate(`/${tenant_slug}/login`);
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await api.clients.get(session.id);
        
        if (data) {
          setNome(data.name || '');
          setTelefone(data.phone || '');
          
          let birthDateStr = '';
          if (data.birth_date) {
            birthDateStr = String(data.birth_date).includes('T') 
              ? data.birth_date.split('T')[0] 
              : data.birth_date;
          }
          setDataNascimento(birthDateStr);
        }
      } catch (err) {
        console.error("Erro ao buscar perfil do cliente", err);
      } finally {
        setInitialLoad(false);
      }
    };
    fetchProfile();
  }, [session, loadingTenant, navigate, tenant_slug]);

  const handleLogout = () => {
    logout();
    navigate(`/${tenant_slug}/login`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim()) { showError("O nome é obrigatório."); return; }
    
    if (novaSenha || confirmarSenha) {
      if (novaSenha !== confirmarSenha) {
        showError("As senhas não coincidem."); return;
      }
      if (novaSenha.length > 0 && (novaSenha.length < 6 || !/[a-zA-Z]/.test(novaSenha) || !/[0-9]/.test(novaSenha))) {
        showError("A nova senha não atende aos requisitos mínimos."); return;
      }
    }

    setLoading(true);
    try {
      // Update name and birth_date
      await api.clients.updateMe({
        name: nome,
        birth_date: dataNascimento || null
      });

      // Update password via API if provided
      if (novaSenha) {
        await api.clients.updateMyPassword(novaSenha);
        setNovaSenha('');
        setConfirmarSenha('');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      showError("Erro ao salvar alterações: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-32 font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      
      {/* Top App Bar */}
      <header className="w-full top-0 sticky z-50 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <div className="w-10"></div>{/* Spacer to keep title centered */}
          <div className="flex items-center justify-center gap-2 flex-1">
            {tenant?.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                className="h-8 md:h-10 object-contain rounded-md" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="material-symbols-outlined text-primary font-headline-md text-headline-md shrink-0">spa</span>
            )}
            <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight">
              {tenant?.name || 'Carregando...'}
            </h1>
          </div>
          <div className="w-10"></div>{/* Spacer to keep title centered */}
        </div>
      </header>

      <main className="w-full px-container-margin mt-lg max-w-[448px] mx-auto animate-fade-in-up">
        
        {/* Profile Header */}
        <section className="flex flex-col items-center mb-xl">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface-container-highest shadow-lg mb-md bg-surface-variant flex items-center justify-center">
               <span className="material-symbols-outlined text-[48px] text-secondary">person</span>
            </div>
          </div>
          <h2 className="font-headline-md text-headline-md-mobile text-on-surface">
            {nome || 'Cliente'}
          </h2>
          <div className="mt-1">
            {getVipBadge(session?.vip_tier)}
          </div>
        </section>

        {/* Form Sections */}
        {initialLoad ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          </div>
        ) : (
        <form onSubmit={handleSave} className="space-y-xl">
          
          {/* Meus Dados Section */}
          <section>
            <div className="flex items-center gap-2 mb-md">
              <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
              <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest">Meus Dados</h3>
            </div>
            
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)] space-y-md">
              <div className="relative focus-within:text-primary text-secondary transition-colors">
                <label className="block font-label-sm text-label-sm mb-1 ml-1 inherit-color">Nome Completo</label>
                <input 
                  className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:ring-0 transition-colors outline-none text-on-surface" 
                  type="text" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="relative focus-within:text-primary text-secondary transition-colors">
                <label className="block font-label-sm text-label-sm mb-1 ml-1 inherit-color">Telefone</label>
                <input 
                  className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:ring-0 transition-colors outline-none text-on-surface" 
                  type="tel" 
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled
                />
              </div>
              <div className="relative focus-within:text-primary text-secondary transition-colors">
                <label className="block font-label-sm text-label-sm mb-1 ml-1 inherit-color">Data de Nascimento</label>
                <input 
                  className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:ring-0 transition-colors outline-none text-on-surface" 
                  type="date" 
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Segurança Section */}
          <section>
            <div className="flex items-center gap-2 mb-md">
              <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
              <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest">Segurança</h3>
            </div>
            
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)] space-y-md">
              <div className="relative focus-within:text-primary text-secondary transition-colors">
                <label className="block font-label-sm text-label-sm mb-1 ml-1 inherit-color">Nova Senha</label>
                <input 
                  className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:ring-0 transition-colors outline-none text-on-surface" 
                  placeholder="••••••••" 
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
              </div>

              {novaSenha.length > 0 && (
                <div className="flex flex-col gap-2 bg-surface-container-low p-3 rounded-xl border border-surface-variant transition-all mt-2">
                  <span className="text-label-sm font-label-sm text-secondary mb-1">A nova senha deve conter:</span>
                  <div className="flex items-center gap-2 transition-colors duration-300">
                    <span className={`material-symbols-outlined text-[16px] ${novaSenha.length >= 6 ? 'text-[#10b981]' : 'text-secondary'}`} style={{ fontVariationSettings: novaSenha.length >= 6 ? "'FILL' 1" : "'FILL' 0" }}>
                      {novaSenha.length >= 6 ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-label-sm ${novaSenha.length >= 6 ? 'text-[#10b981] font-medium' : 'text-secondary'}`}>Mínimo de 6 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2 transition-colors duration-300">
                    <span className={`material-symbols-outlined text-[16px] ${/[a-zA-Z]/.test(novaSenha) ? 'text-[#10b981]' : 'text-secondary'}`} style={{ fontVariationSettings: /[a-zA-Z]/.test(novaSenha) ? "'FILL' 1" : "'FILL' 0" }}>
                      {/[a-zA-Z]/.test(novaSenha) ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-label-sm ${/[a-zA-Z]/.test(novaSenha) ? 'text-[#10b981] font-medium' : 'text-secondary'}`}>Pelo menos 1 letra</span>
                  </div>
                  <div className="flex items-center gap-2 transition-colors duration-300">
                    <span className={`material-symbols-outlined text-[16px] ${/[0-9]/.test(novaSenha) ? 'text-[#10b981]' : 'text-secondary'}`} style={{ fontVariationSettings: /[0-9]/.test(novaSenha) ? "'FILL' 1" : "'FILL' 0" }}>
                      {/[0-9]/.test(novaSenha) ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-label-sm ${/[0-9]/.test(novaSenha) ? 'text-[#10b981] font-medium' : 'text-secondary'}`}>Pelo menos 1 número</span>
                  </div>
                </div>
              )}

              <div className="relative focus-within:text-primary text-secondary transition-colors mt-md">
                <label className="block font-label-sm text-label-sm mb-1 ml-1 inherit-color">Confirmar Senha</label>
                <input 
                  className="w-full bg-transparent border-b border-outline-variant py-2 focus:border-primary focus:ring-0 transition-colors outline-none text-on-surface" 
                  placeholder="••••••••" 
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Indique e Ganhe Section */}
          {tenant?.features?.referral && (
            <section>
              <div className="flex items-center gap-2 mb-md">
                <span className="material-symbols-outlined text-primary text-[20px]">volunteer_activism</span>
                <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest">Programa de Indicação</h3>
              </div>
              
              <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden border border-[#f4c8ce]/30">
                <button 
                  type="button"
                  onClick={() => navigate(`/${tenant_slug}/indique-e-ganhe`)}
                  className="w-full relative flex items-center justify-between p-lg group active:scale-[0.99] transition-all bg-gradient-to-r from-[#ffe4e8] to-surface-container-lowest"
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="font-headline-sm text-on-surface mb-1 font-bold">Indique e Ganhe</span>
                    <span className="text-sm text-secondary">Convide amigos e ganhe R$ 20</span>
                  </div>
                  <div className="w-10 h-10 bg-white text-[#b0616b] rounded-full shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                </button>
              </div>
            </section>
          )}

          {/* Privacidade / LGPD Section */}
          <section>
            <div className="flex items-center gap-2 mb-md">
              <span className="material-symbols-outlined text-primary text-[20px]">policy</span>
              <h3 className="font-label-md text-label-md text-primary uppercase tracking-widest">Privacidade (LGPD)</h3>
            </div>
            
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)] space-y-md">
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const data = await api.clients.exportData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Meus_Dados_OperaBeauty.json';
                    a.click();
                    showSuccess("Dados exportados com sucesso!");
                  } catch (e) {
                    showError("Erro ao exportar dados.");
                  }
                }}
                className="w-full text-left flex items-center justify-between text-secondary hover:text-primary transition-colors py-2"
              >
                <span className="font-label-sm">Exportar meus dados (JSON)</span>
                <span className="material-symbols-outlined text-[20px]">download</span>
              </button>
              
              <button 
                type="button"
                onClick={async () => {
                  if (await confirm("ATENÇÃO: Isso apagará permanentemente seu nome, telefone e email. Esta ação é IRREVERSÍVEL. Tem certeza?")) {
                    try {
                      await api.clients.anonymizeAccount();
                      logout();
                      navigate(`/${tenant_slug}/login`);
                    } catch(e) {
                      showError("Erro ao excluir conta.");
                    }
                  }
                }}
                className="w-full text-left flex items-center justify-between text-error hover:opacity-80 transition-opacity py-2 mt-2"
              >
                <span className="font-label-sm">Excluir minha conta</span>
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              </button>
            </div>
          </section>

          {/* Action Button */}
          <div className="pt-md">
            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-label-md text-label-md shadow-lg active:scale-[0.98] transition-all hover:opacity-90 flex items-center justify-center gap-2 ${saved ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'}`}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : saved ? (
                'Alterações Salvas!'
              ) : (
                'Salvar Alterações'
              )}
            </button>
            <button 
              type="button"
              onClick={handleLogout}
              className="w-full mt-4 text-error font-label-md text-label-md py-2 active:scale-95 transition-transform"
            >
              Sair da Conta
            </button>
          </div>

        </form>
        )}
        {/* Espaçador de segurança para a BottomNavBar móvel */}
        <div className="h-24 md:hidden"></div>
      </main>

      {/* Bottom Navigation Bar */}
      <ClienteBottomNavBar activeTab="perfil" tenantSlug={tenant_slug} />
      
    </div>
  );
};

export default PerfilCliente;
